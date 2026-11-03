"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { del, get, set, clear, keys, createStore } from "idb-keyval";
import type { DocTypeId, DocumentRecord, ExtractedField, FieldKey, FindingResolution, ResolutionState, TextLine, ValidationRun } from "@/engine/types";
import { reconcile } from "@/engine/run";
import type { UserProfile } from "@/knowledge/onboarding";
import { applyDemoOverrides, hasDemoOverrides } from "@/lib/demoOverrides";

export type GuideStep = "documents" | "confirm" | "details" | "check" | "results";

// Everything lives in this browser's IndexedDB. Nothing is sent to a server
// except (optionally, with consent) privacy-safe summaries for the AI assistant.

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const stateDb = typeof indexedDB !== "undefined" ? createStore("rejectless", "state") : undefined;
const fileDb = typeof indexedDB !== "undefined" ? createStore("rejectless-files", "previews") : undefined;

const idbStorage: StateStorage = {
  getItem: async (name) => (stateDb ? ((await get(name, stateDb)) ?? null) : null),
  setItem: async (name, value) => {
    if (stateDb) await set(name, value, stateDb);
  },
  removeItem: async (name) => {
    if (stateDb) await del(name, stateDb);
  },
};

export interface Consent {
  processing?: string;
  ai?: string | null;
}

export interface Session {
  id: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  appId: string;
  variantId: string;
  demoScenarioId?: string;
  documents: DocumentRecord[];
  draft: Record<string, string>;
  runs: ValidationRun[];
  resolutions: Record<string, FindingResolution>;
  activity: { at: string; text: string }[];
  /** Onboarding answers (role, work type, state, goal) — not personal identifiers. */
  profile?: UserProfile;
  guideStep: GuideStep;
  skippedDocs: DocTypeId[];
}

interface State {
  session: Session | null;
  consent: Consent;
  hydrated: boolean;
  startSession: (appId: string, variantId: string, demoScenarioId?: string, profile?: UserProfile) => Session;
  setGuideStep: (step: GuideStep) => void;
  skipDoc: (t: DocTypeId) => void;
  unskipDoc: (t: DocTypeId) => void;
  setVariant: (variantId: string) => void;
  addDocument: (doc: DocumentRecord) => void;
  updateDocument: (id: string, patch: Partial<DocumentRecord>) => void;
  removeDocument: (id: string) => Promise<void>;
  editField: (docId: string, key: FieldKey, value: string) => void;
  confirmField: (docId: string, key: FieldKey) => void;
  setDraft: (key: string, value: string) => void;
  setDraftAll: (draft: Record<string, string>) => void;
  recordRun: (run: ValidationRun) => void;
  setResolution: (key: string, state: ResolutionState, note: string) => void;
  setConsent: (c: Partial<Consent>) => void;
  log: (text: string) => void;
  deleteSession: () => Promise<{ previewsDeleted: number }>;
  touch: () => void;
}

export function newSessionId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rnd = crypto.getRandomValues(new Uint8Array(8));
  const s = Array.from(rnd, (b) => alphabet[b % alphabet.length]).join("");
  return `RL-${s.slice(0, 4)}-${s.slice(4)}`;
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.getRandomValues(new Uint32Array(2)).join("").slice(0, 12)}`;
}

const now = () => new Date().toISOString();

export const useSession = create<State>()(
  persist(
    (setState, getState) => ({
      session: null,
      consent: {},
      hydrated: false,

      startSession(appId, variantId, demoScenarioId, profile) {
        const t = now();
        const session: Session = {
          id: newSessionId(),
          createdAt: t,
          lastActiveAt: t,
          expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
          appId,
          variantId,
          demoScenarioId,
          documents: [],
          draft: {},
          runs: [],
          resolutions: {},
          activity: [{ at: t, text: demoScenarioId ? "Demo session started with fictional data" : "Session started" }],
          profile,
          guideStep: "documents",
          skippedDocs: [],
        };
        const old = getState().session;
        if (old) void deletePreviews(old.documents.map((d) => d.id));
        setState({ session });
        return session;
      },

      setGuideStep(step) {
        mutate(setState, (s) => ({ ...s, guideStep: step }));
      },

      skipDoc(t) {
        mutate(setState, (s) => ({ ...s, skippedDocs: Array.from(new Set([...(s.skippedDocs ?? []), t])) }));
      },

      unskipDoc(t) {
        mutate(setState, (s) => ({ ...s, skippedDocs: (s.skippedDocs ?? []).filter((x) => x !== t) }));
      },

      setVariant(variantId) {
        mutate(setState, (s) => ({ ...s, variantId }));
      },

      addDocument(doc) {
        mutate(setState, (s) => ({ ...s, documents: [...s.documents, doc] }));
      },

      updateDocument(id, patch) {
        mutate(setState, (s) => ({ ...s, documents: s.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
      },

      async removeDocument(id) {
        const doc = getState().session?.documents.find((d) => d.id === id);
        await deletePreviews([id], doc?.pageCount);
        transientLines.delete(id);
        mutate(setState, (s) => ({ ...s, documents: s.documents.filter((d) => d.id !== id) }));
        getState().log(`Removed ${doc?.fileName ?? "a document"}`);
      },

      editField(docId, key, value) {
        mutate(setState, (s) => ({
          ...s,
          documents: s.documents.map((d) => {
            if (d.id !== docId) return d;
            const exists = d.fields.some((f) => f.key === key);
            const fields: ExtractedField[] = exists
              ? d.fields.map((f) => (f.key === key ? { ...f, value, status: "edited", originalValue: f.originalValue ?? f.value, confidence: 1 } : f))
              : [...d.fields, { key, value, raw: "", confidence: 1, page: 1, method: "manual", status: "edited" }];
            return { ...d, fields, missingFields: d.missingFields.filter((k) => k !== key) };
          }),
        }));
        getState().log(`Edited a field on a document (${key})`);
      },

      confirmField(docId, key) {
        mutate(setState, (s) => ({
          ...s,
          documents: s.documents.map((d) =>
            d.id === docId ? { ...d, fields: d.fields.map((f) => (f.key === key && f.status === "extracted" ? { ...f, status: "confirmed" } : f)) } : d,
          ),
        }));
      },

      setDraft(key, value) {
        mutate(setState, (s) => ({ ...s, draft: { ...s.draft, [key]: value } }));
      },

      setDraftAll(draft) {
        mutate(setState, (s) => ({ ...s, draft }));
      },

      recordRun(run) {
        mutate(setState, (s) => {
          const prevRun = s.runs[s.runs.length - 1];
          return {
            ...s,
            runs: [...s.runs.slice(-9), run],
            resolutions: reconcile(s.resolutions, prevRun, run),
            activity: [...s.activity, { at: run.at, text: `Readiness check run (${run.findings.length} checks)` }],
          };
        });
      },

      setResolution(key, state, note) {
        mutate(setState, (s) => {
          const existing = s.resolutions[key] ?? { state: "open", history: [] };
          return { ...s, resolutions: { ...s.resolutions, [key]: { state, history: [...existing.history, { at: now(), state, note }] } } };
        });
      },

      setConsent(c) {
        setState((st) => ({ consent: { ...st.consent, ...c } }));
      },

      log(text) {
        mutate(setState, (s) => ({ ...s, activity: [...s.activity.slice(-49), { at: now(), text }] }));
      },

      async deleteSession() {
        const s = getState().session;
        let previewsDeleted = 0;
        if (fileDb) {
          previewsDeleted = (await keys(fileDb)).length;
          await clear(fileDb);
        }
        transientLines.clear();
        const { terminateOcr } = await import("@/lib/ingest/ocr");
        await terminateOcr();
        setState({ session: null, consent: {} });
        if (stateDb) await clear(stateDb);
        void s;
        return { previewsDeleted };
      },

      touch() {
        mutate(setState, (s) => ({ ...s, lastActiveAt: now(), expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString() }));
      },
    }),
    {
      name: "rejectless-session",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ session: s.session, consent: s.consent }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Expired sessions are removed on load.
        if (state.session && new Date(state.session.expiresAt).getTime() < Date.now()) {
          void state.deleteSession();
        } else if (state.session && hasDemoOverrides) {
          // Demo overrides also apply to documents read before the override was set.
          const documents = state.session.documents.map((d) => ({ ...d, fields: applyDemoOverrides(d.typeId, d.fields) }));
          useSession.setState({ session: { ...state.session, documents } });
        }
        useSession.setState({ hydrated: true });
      },
    },
  ),
);

function mutate(setState: (fn: (st: State) => Partial<State>) => void, fn: (s: Session) => Session) {
  // Every change counts as activity and extends the 24-hour expiry.
  setState((st) =>
    st.session ? { session: { ...fn(st.session), lastActiveAt: now(), expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString() } } : {},
  );
}

// ---------------------------------------------------------------------------- previews (IndexedDB)

export async function savePreviews(docId: string, blobs: Blob[]) {
  if (!fileDb) return;
  await Promise.all(blobs.map((b, i) => set(`${docId}:${i + 1}`, b, fileDb)));
}

export async function loadPreview(docId: string, page: number): Promise<Blob | undefined> {
  if (!fileDb) return undefined;
  return get(`${docId}:${page}`, fileDb);
}

async function deletePreviews(docIds: string[], pageCount = 4) {
  if (!fileDb) return;
  await Promise.all(docIds.flatMap((id) => Array.from({ length: Math.max(pageCount, 4) }, (_, i) => del(`${id}:${i + 1}`, fileDb))));
}

// Text lines are kept in memory only (never persisted) so a document's type can be
// changed without re-reading the file. They disappear when the tab closes.
export const transientLines = new Map<string, { lines: TextLine[]; method: "text-layer" | "ocr"; typeId: DocTypeId }>();
