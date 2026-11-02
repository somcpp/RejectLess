"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import {
  CheckCircle2, ChevronDown, CircleHelp, CloudDownload, Download, ExternalLink, FileSearch, Globe2, MessageCircleQuestion, Pencil, RotateCw, TriangleAlert, Upload,
} from "lucide-react";
import type { DocTypeId, Finding } from "@/engine/types";
import { Button, Spinner } from "@/components/ui";
import { AuthorityCard, ReadAloud } from "@/components/gov";
import { FindingDetail } from "@/components/workspace/FindingDetail";
import { DigiLockerMock } from "@/components/workspace/DigiLockerMock";
import { ActionBar } from "./common";
import { useActiveSession } from "@/lib/hooks";
import { useSession } from "@/lib/store/session";
import { useUi } from "@/lib/store/ui";
import { addFiles } from "@/lib/actions";
import { ACCEPTED } from "@/lib/ingest/pipeline";
import { resolvedIssues } from "@/lib/reportData";
import { BUCKETS, groupFindings, missingDocType, type Bucket } from "@/lib/triage";
import { DOC_TYPES } from "@/knowledge/documents";
import { DOC_SOURCES, getAuthority } from "@/knowledge/authorities";
import { DRAFT_LABEL } from "@/engine/profile";
import { inputSignature } from "@/lib/useRunCheck";

const BUCKET_UI: Record<Bucket, { Icon: typeof CheckCircle2; fg: string; bg: string; ring: string }> = {
  action: { Icon: TriangleAlert, fg: "text-action", bg: "bg-action-soft", ring: "border-action" },
  documents: { Icon: FileSearch, fg: "text-external", bg: "bg-external-soft", ring: "border-external" },
  review: { Icon: CircleHelp, fg: "text-review", bg: "bg-review-soft", ring: "border-review" },
  external: { Icon: Globe2, fg: "text-external", bg: "bg-external-soft", ring: "border-external" },
  passed: { Icon: CheckCircle2, fg: "text-pass", bg: "bg-pass-soft", ring: "border-pass" },
};

export function ResultsStep() {
  const { session, app, latestRun } = useActiveSession();
  const setGuideStep = useSession((s) => s.setGuideStep);
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState<Bucket>();
  if (!session || !app || !latestRun) return null;

  const groups = groupFindings(latestRun.findings);
  const todo = groups.action.length + groups.documents.length;
  const toLook = groups.review.length;
  const fixed = resolvedIssues(session);
  const changedSinceRun = !!latestRun.inputSig && latestRun.inputSig !== inputSignature(session);
  const auth = getAuthority(app.id);
  // Open on the first group that has something to do, so the next step is obvious.
  const active: Bucket = chosen ?? BUCKETS.find((b) => groups[b.id].length)?.id ?? "passed";
  const meta = BUCKETS.find((b) => b.id === active)!;

  const headline = todo
    ? `${todo} thing${todo > 1 ? "s" : ""} to do before you apply`
    : toLook
      ? `Nothing to fix — ${toLook} thing${toLook > 1 ? "s" : ""} worth a look`
      : "Everything we could check looks right";
  const sub = todo
    ? `${groups.action.length ? `${groups.action.length} to fix` : ""}${groups.action.length && groups.documents.length ? ", " : ""}${groups.documents.length ? `${groups.documents.length} document${groups.documents.length > 1 ? "s" : ""} or detail${groups.documents.length > 1 ? "s" : ""} needed` : ""}. Start with the first group — each card says what to do.`
    : `Before you apply, confirm the items under “Confirm on portal”. This isn't an approval — only ${app.shortName} can approve your application.`;

  async function download() {
    setBusy(true);
    try {
      const { downloadReport } = await import("@/lib/report");
      await downloadReport(useSession.getState().session!);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="mb-2 text-[13px] font-medium text-accent">Your results</p>
        {!todo && !toLook && <CheckCircle2 className="mb-3 size-10 text-pass" />}
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">{headline}</h1>
        <p className="mt-2 text-[16px] text-ink-2">{sub}</p>
        <ReadAloud className="mt-3" text={`${headline}. ${sub} ${BUCKETS.map((b) => `${b.label}: ${groups[b.id].length}.`).join(" ")}`} />
      </div>

      {changedSinceRun && (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-accent/30 bg-accent-soft/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[14px]">You changed something since this check. Check again to see if it&rsquo;s fixed.</p>
          <Button onClick={() => setGuideStep("check")}>
            <RotateCw className="size-4" /> Check again
          </Button>
        </div>
      )}

      {/* Five groups: one tap each, always visible */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2" role="tablist" aria-label="Result groups">
        {BUCKETS.map((b) => {
          const ui = BUCKET_UI[b.id];
          const n = groups[b.id].length;
          const on = active === b.id;
          return (
            <button
              key={b.id}
              role="tab"
              aria-selected={on}
              onClick={() => setChosen(b.id)}
              className={clsx(
                "flex min-w-0 flex-col items-center gap-1 rounded-2xl border bg-surface px-1 py-3 text-center transition-all sm:px-2",
                on ? `${ui.ring} ring-2 ring-current/20 ${ui.fg}` : "border-line text-ink-3 hover:border-line-strong",
                !n && !on && "opacity-60",
              )}
            >
              <span className={clsx("flex size-9 items-center justify-center rounded-xl", ui.bg, ui.fg)}>
                <ui.Icon className="size-5" />
              </span>
              <span className={clsx("text-[20px] font-semibold leading-none tabular", n ? ui.fg : "text-ink-3")}>{n}</span>
              <span className={clsx("w-full truncate text-[11px] leading-tight sm:text-[12px]", on ? "font-medium text-ink" : "text-ink-3")}>{b.label}</span>
              <span className="font-dev hidden w-full truncate text-[11px] text-ink-3 sm:block">{b.labelHi}</span>
            </button>
          );
        })}
      </div>

      <section key={active} className="rise mt-5" role="tabpanel">
        <div className="mb-3 flex items-start gap-3">
          <span className={clsx("flex size-9 shrink-0 items-center justify-center rounded-xl", BUCKET_UI[active].bg, BUCKET_UI[active].fg)}>
            {(() => {
              const I = BUCKET_UI[active].Icon;
              return <I className="size-5" />;
            })()}
          </span>
          <div>
            <h2 className="text-[18px] font-semibold leading-snug">
              {meta.label} <span className="font-dev text-[14px] font-normal text-ink-3">· {meta.labelHi}</span>
            </h2>
            <p className="text-[14px] text-ink-2">{meta.blurb}</p>
          </div>
        </div>

        {groups[active].length === 0 && (
          <p className="rounded-2xl border border-dashed border-line px-5 py-6 text-center text-[15px] text-ink-3">Nothing here. {active === "action" ? "No errors were found in your documents or details." : ""}</p>
        )}

        {(active === "action" || active === "review") && (
          <ul className="space-y-3">
            {groups[active].map((f, i) => (
              <IssueCard key={f.key} f={f} index={i} />
            ))}
          </ul>
        )}
        {active === "documents" && (
          <ul className="space-y-3">
            {groups.documents.map((f, i) => (
              <NeededCard key={f.key} f={f} index={i} />
            ))}
          </ul>
        )}
        {active === "external" && <ExternalChecklist findings={groups.external} portal={app.officialPortal} />}
        {active === "passed" && <PassedByDocument findings={groups.passed} />}
      </section>

      {fixed.length > 0 && (
        <Section icon={<CheckCircle2 className="size-4 text-pass" />} title={`Fixed since your first check (${fixed.length})`}>
          <ul className="space-y-1.5">
            {fixed.map(({ finding }) => (
              <li key={finding.key} className="flex items-center gap-2 text-[15px]">
                <CheckCircle2 className="size-4 text-pass" /> {finding.title}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {auth && (
        <div className="mt-6">
          <p className="mb-2 text-[13px] font-medium text-ink-3">{todo ? "When everything above is done, apply here" : "Ready? Apply here"}</p>
          <AuthorityCard a={auth} compact />
        </div>
      )}

      <ActionBar>
        <Button size="lg" variant="ghost" onClick={() => setGuideStep("check")}>
          <RotateCw className="size-4" /> Check again
        </Button>
        <Button size="lg" variant="secondary" onClick={download} disabled={busy}>
          {busy ? <Spinner /> : <Download className="size-4" />} Download report
        </Button>
        {!todo && app.officialPortal && (
          <a href={app.officialPortal} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-accent px-5 text-[15px] font-medium text-white hover:bg-accent-hover">
            Open the official portal <ExternalLink className="size-4" />
          </a>
        )}
      </ActionBar>
    </div>
  );
}

function Section({ icon, title, children, defaultOpen = false }: { icon: React.ReactNode; title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mt-4 rounded-2xl border border-line bg-surface">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-5 py-4 text-left" aria-expanded={open}>
        {icon}
        <span className="flex-1 font-medium">{title}</span>
        <ChevronDown className={clsx("size-4 text-ink-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="rise px-5 pb-5">{children}</div>}
    </section>
  );
}

// ---------------------------------------------------------------------------- passed, by document

function PassedByDocument({ findings }: { findings: Finding[] }) {
  // "Aadhaar — Name, Date of birth": which document, which details.
  const byDoc = new Map<string, Set<string>>();
  const general: Finding[] = [];
  for (const f of findings) {
    if (!f.observations.length) {
      general.push(f);
      continue;
    }
    for (const o of f.observations) {
      const label = o.docLabel === DRAFT_LABEL ? "Details you typed" : o.docLabel;
      if (!byDoc.has(label)) byDoc.set(label, new Set());
      byDoc.get(label)!.add(o.fieldLabel);
    }
  }
  return (
    <div className="space-y-3">
      {Array.from(byDoc.entries()).map(([doc, fields]) => (
        <div key={doc} className="rounded-2xl border border-line bg-surface px-5 py-4">
          <p className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="size-4 text-pass" /> {doc}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {Array.from(fields).map((fl) => (
              <li key={fl} className="rounded-full bg-pass-soft px-2.5 py-0.5 text-[13px] text-pass">{fl}</li>
            ))}
          </ul>
        </div>
      ))}
      {general.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface px-5 py-4">
          <p className="font-medium">Other checks</p>
          <ul className="mt-2 space-y-1.5 text-[14px] text-ink-2">
            {general.map((f) => (
              <li key={f.key} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-pass" />
                <span><span className="text-ink">{f.title}</span> — {f.summary}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------- confirm on the portal

function ExternalChecklist({ findings, portal }: { findings: Finding[]; portal?: string }) {
  const resolutions = useSession((s) => s.session?.resolutions);
  const setResolution = useSession((s) => s.setResolution);
  const items = findings.flatMap((f) => (f.signals.length ? f.signals : [f.summary]).map((text, i) => ({ key: `${f.key}#${i}`, text, title: f.title })));
  const done = items.filter((it) => resolutions?.[it.key]?.state === "acknowledged").length;
  return (
    <div className="rounded-2xl border border-line bg-surface px-5 py-4">
      <p className="text-[13px] text-ink-3">
        {done} of {items.length} confirmed by you. RejectLess cannot see these systems; ticking only records your own check.
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((it) => {
          const on = resolutions?.[it.key]?.state === "acknowledged";
          return (
            <li key={it.key}>
              <label className={clsx("flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-[15px] hover:bg-surface-2", on && "text-ink-3 line-through decoration-line-strong")}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => setResolution(it.key, e.target.checked ? "acknowledged" : "open", e.target.checked ? "You confirmed this on the official portal." : "Unticked.")}
                  className="mt-1 size-5 shrink-0 accent-[var(--accent)]"
                />
                <span>{it.text}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {portal && (
        <a href={portal} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-[14px] font-medium text-accent hover:underline">
          Open the official portal to check <ExternalLink className="size-3.5" />
        </a>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------- documents or details needed

function NeededCard({ f, index }: { f: Finding; index: number }) {
  const setGuideStep = useSession((s) => s.setGuideStep);
  const unskipDoc = useSession((s) => s.unskipDoc);
  const openAssistant = useUi((s) => s.openAssistant);
  const [dl, setDl] = useState(false);
  const [steps, setSteps] = useState(false);
  const docType = missingDocType(f) as DocTypeId | undefined;
  const def = docType ? DOC_TYPES[docType] : undefined;
  const src = docType ? DOC_SOURCES[docType] : undefined;

  return (
    <li className="rise rounded-2xl border border-line bg-surface p-5" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex items-start gap-3">
        <FileSearch className="mt-1 size-5 shrink-0 text-external" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium uppercase tracking-wide text-ink-3">{def ? "Document needed" : "Detail needed"}</p>
          <h2 className="mt-0.5 text-[18px] font-semibold leading-snug">{def ? `Your ${def.short}` : `Your ${f.missingInput}`}</h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{f.summary}</p>

          {src && (
            <div className="mt-3 rounded-xl bg-surface-2 px-4 py-3 text-[15px] leading-relaxed">
              <p><span className="font-medium">Where to get it: </span>{src.where}</p>
              {src.link && (
                <a href={src.link.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[14px] font-medium text-accent hover:underline">
                  {src.link.label} <ExternalLink className="size-3.5" />
                </a>
              )}
              <button onClick={() => setSteps(!steps)} className="mt-1 block text-[14px] text-ink-3 hover:text-ink" aria-expanded={steps}>
                {steps ? "Hide steps" : "Show me the steps"}
              </button>
              {steps && (
                <ol className="rise mt-2 space-y-1 text-[14px] text-ink-2">
                  {src.steps.map((s, i) => (
                    <li key={i} className="flex gap-2"><span className="font-medium text-ink">{i + 1}.</span> {s}</li>
                  ))}
                </ol>
              )}
            </div>
          )}
          {!def && (
            <p className="mt-3 rounded-xl bg-surface-2 px-4 py-3 text-[15px] leading-relaxed">
              <span className="font-medium">What to do: </span>
              {f.recommendation}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {docType && src?.digilocker !== "no" && (
              <Button onClick={() => setDl(true)}>
                <CloudDownload className="size-4" /> Get from DigiLocker
              </Button>
            )}
            {docType && (
              <Button
                variant={src?.digilocker !== "no" ? "secondary" : "primary"}
                onClick={() => {
                  unskipDoc(docType);
                  setGuideStep("documents");
                }}
              >
                <Upload className="size-4" /> Upload it now
              </Button>
            )}
            {!docType && (
              <>
                <Button onClick={() => setGuideStep("details")}>
                  <Pencil className="size-4" /> Type it in
                </Button>
                <Button variant="secondary" onClick={() => setGuideStep("documents")}>
                  <Upload className="size-4" /> Add a document
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => openAssistant(f.key)}>
              <MessageCircleQuestion className="size-4" /> Explain this
            </Button>
          </div>
        </div>
      </div>
      {dl && docType && <DigiLockerMock docType={docType} onClose={() => setDl(false)} />}
    </li>
  );
}

// ---------------------------------------------------------------------------- fix / check cards

/** The most useful next action for a finding, in the user's terms. */
function primaryAction(f: Finding) {
  // The engine already knows when the typed details are the odd one out.
  if (f.abstract.includes("application draft is the odd one out")) return { kind: "details" as const };
  // Eligibility results (waiting periods, TDS, limits) are facts to act on, not document errors.
  if (!["consistency", "identity", "quality", "format", "completeness"].includes(f.category)) return undefined;
  const first = f.observations[0];
  const differing = f.observations.find((o) => o.value !== first?.value);
  if (differing && differing.docLabel === DRAFT_LABEL) return { kind: "details" as const };
  const target = (differing?.docId ? differing : f.observations.find((o) => o.docId)) ?? undefined;
  if (target?.docId) return { kind: "replace" as const, docId: target.docId, label: target.docLabel };
  if (f.observations.some((o) => o.docLabel === DRAFT_LABEL)) return { kind: "details" as const };
  return undefined;
}

function IssueCard({ f, index }: { f: Finding; index: number }) {
  const { session } = useActiveSession();
  const setGuideStep = useSession((s) => s.setGuideStep);
  const setResolution = useSession((s) => s.setResolution);
  const openAssistant = useUi((s) => s.openAssistant);
  const [why, setWhy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const res = session?.resolutions[f.key];
  const act = primaryAction(f);
  const replacing = act?.kind === "replace" ? session?.documents.find((d) => d.id === act.docId) : undefined;
  const isAction = f.status === "action";

  return (
    <li className="rise rounded-2xl border border-line bg-surface p-5" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex items-start gap-3">
        {isAction ? <TriangleAlert className="mt-1 size-5 shrink-0 text-action" /> : <CircleHelp className="mt-1 size-5 shrink-0 text-review" />}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium uppercase tracking-wide text-ink-3">{isAction ? "Needs fixing" : "Worth checking"}</p>
          <h2 className="mt-0.5 text-[18px] font-semibold leading-snug">{f.title}</h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{f.summary}</p>
          <p className="mt-3 rounded-xl bg-surface-2 px-4 py-3 text-[15px] leading-relaxed">
            <span className="font-medium">What to do: </span>
            {f.recommendation}
          </p>
          {res?.state === "confirmed_correct" && <p className="mt-2 text-[13px] text-pass">You confirmed this is fine.</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            {act?.kind === "replace" && (
              <>
                <Button onClick={() => input.current?.click()} disabled={replacing?.status === "processing"}>
                  {replacing?.status === "processing" ? <Spinner /> : <Upload className="size-4" />} Upload corrected {act.label}
                </Button>
                <input
                  ref={input}
                  type="file"
                  accept={ACCEPTED.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) addFiles(Array.from(e.target.files), { replaceId: act.docId });
                    e.target.value = "";
                  }}
                />
              </>
            )}
            {act?.kind === "details" && (
              <Button onClick={() => setGuideStep("details")}>
                <Pencil className="size-4" /> Edit my details
              </Button>
            )}
            <Button variant="secondary" onClick={() => openAssistant(f.key)}>
              <MessageCircleQuestion className="size-4" /> Explain this
            </Button>
            <Button variant="ghost" onClick={() => setWhy(!why)} aria-expanded={why}>
              {why ? "Hide evidence" : "Show evidence"}
            </Button>
            {!isAction && res?.state !== "confirmed_correct" && (
              <Button variant="ghost" onClick={() => setResolution(f.key, "confirmed_correct", "You confirmed the values are correct as they are.")}>
                It&rsquo;s fine
              </Button>
            )}
          </div>
        </div>
      </div>
      {why && (
        <div className="rise mt-5 border-t border-line pt-5">
          <FindingDetail finding={f} resolution={res} />
        </div>
      )}
    </li>
  );
}
