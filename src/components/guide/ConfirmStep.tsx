"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { ArrowRight, Check, Eye, EyeOff, FileText, Pencil, Sun, Upload } from "lucide-react";
import type { DocumentRecord, ExtractedField, FieldKey } from "@/engine/types";
import { compareNames } from "@/engine/identity/nameMatch";
import { readability, UNREADABLE } from "@/engine/readability";
import { addFiles } from "@/lib/actions";
import { ACCEPTED } from "@/lib/ingest/pipeline";
import { digitsOnly, formatDate, maskIdentifier, parseDate } from "@/engine/validators";
import { Button } from "@/components/ui";
import { EvidenceViewer } from "@/components/workspace/EvidenceViewer";
import { ActionBar, StepTitle } from "./common";
import { useActiveSession } from "@/lib/hooks";
import { useSession } from "@/lib/store/session";
import { DOC_TYPES, FIELD_LABELS, SENSITIVE_FIELDS } from "@/knowledge/documents";

const NAMES: FieldKey[] = ["name", "account_holder", "father_name"];
const COMPARED: FieldKey[] = ["name", "account_holder", "father_name", "dob", "account_number", "ifsc"];

type Reason = "unclear" | "differs";

function norm(key: FieldKey, v: string) {
  if (key === "dob") {
    const p = parseDate(v);
    return p ? formatDate(p) : v;
  }
  if (key === "account_number") return digitsOnly(v);
  return v.replace(/\s/g, "").toUpperCase();
}

export function display(key: FieldKey, v: string) {
  if (SENSITIVE_FIELDS.includes(key)) return maskIdentifier(key, v);
  if (["dob", "doj", "doe", "issue_date"].includes(key)) {
    const p = parseDate(v);
    return p ? formatDate(p) : v;
  }
  return v;
}

/** Values worth a second look: read below the readability threshold, or different from the same detail elsewhere. */
function reasons(docs: DocumentRecord[]): Map<string, Reason> {
  const out = new Map<string, Reason>();
  const ready = docs.filter((d) => d.status === "analysed" || d.status === "needs_attention");
  for (const key of COMPARED) {
    const group = ready.flatMap((d) =>
      d.fields.filter((f) => (NAMES.includes(key) && key !== "father_name" ? f.key === "name" || f.key === "account_holder" : f.key === key)).map((f) => ({ d, f })),
    );
    if (group.length < 2) continue;
    const [first, ...rest] = group;
    for (const g of rest) {
      const same = NAMES.includes(key) ? compareNames(first.f.value, g.f.value).outcome === "consistent" : norm(key, first.f.value) === norm(key, g.f.value);
      if (!same) {
        out.set(`${first.d.id}:${first.f.key}`, "differs");
        out.set(`${g.d.id}:${g.f.key}`, "differs");
      }
    }
  }
  for (const d of ready) for (const f of d.fields) if (f.status === "extracted" && f.confidence < UNREADABLE && !out.has(`${d.id}:${f.key}`)) out.set(`${d.id}:${f.key}`, "unclear");
  return out;
}

export function ConfirmStep() {
  const { session } = useActiveSession();
  const setGuideStep = useSession((s) => s.setGuideStep);
  if (!session) return null;
  const docs = session.documents.filter((d) => d.status === "analysed" || d.status === "needs_attention");
  const why = reasons(docs);
  const total = docs.reduce((s, d) => s + d.fields.length, 0);
  const flagged = Array.from(why.keys()).filter((k) => {
    const [id, key] = k.split(":");
    return docs.find((d) => d.id === id)?.fields.find((f) => f.key === key)?.status === "extracted";
  }).length;

  return (
    <div>
      <StepTitle
        title={flagged ? `Check ${flagged} detail${flagged > 1 ? "s" : ""} we read` : "Check what we read"}
        sub={`We read ${total} details from ${docs.length} document${docs.length === 1 ? "" : "s"}. ${flagged ? "Items marked need a look; the rest are shown so you can see them." : "Open a document to see where each detail came from, and fix anything we misread."} If documents disagree with each other, we explain that in your results.`}
      />

      <div className="space-y-4">
        {docs.map((d) => (
          <DocCard key={`${d.id}:${d.version}`} doc={d} why={why} />
        ))}
        {!docs.length && <p className="border border-dashed border-line px-5 py-6 text-center text-ink-3">No documents were read yet.</p>}
      </div>

      <ActionBar>
        <Button size="lg" variant="ghost" onClick={() => setGuideStep("documents")}>Back</Button>
        <Button size="lg" onClick={() => setGuideStep("details")}>
          Continue <ArrowRight className="size-4" />
        </Button>
      </ActionBar>
    </div>
  );
}

function DocCard({ doc, why }: { doc: DocumentRecord; why: Map<string, Reason> }) {
  const [show, setShow] = useState(false);
  const [active, setActive] = useState<FieldKey>();
  const replaceInput = useRef<HTMLInputElement>(null);
  const def = DOC_TYPES[doc.typeId];
  // Real problems and soft advisories alike are shown here; the results page keeps only the real ones.
  const r = readability(doc);
  const advisories = [...r.issues, ...r.advisories];
  const page = doc.fields.find((f) => f.key === active)?.page ?? 1;
  // Flagged rows first, then the document's natural order.
  const rows = [...doc.fields].sort((a, b) => Number(!!why.get(`${doc.id}:${b.key}`)) - Number(!!why.get(`${doc.id}:${a.key}`)));
  const highlights = doc.fields
    .filter((f) => f.bbox && f.page === page)
    .map((f) => ({ bbox: f.bbox!, label: FIELD_LABELS[f.key], active: f.key === active, tone: why.get(`${doc.id}:${f.key}`) ? ("review" as const) : ("accent" as const) }));

  return (
    <section className="gov-panel">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        <span className="flex size-9 items-center justify-center bg-accent-soft text-accent"><FileText className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{def.label}</p>
          <p className="truncate text-[12px] text-ink-3">{doc.fileName} · {doc.fields.length} details read{doc.textMethod === "ocr" ? " from the photo" : " from the PDF"}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setShow(!show)} aria-expanded={show}>
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {show ? "Hide document" : "Show document"}
        </Button>
      </header>
      {advisories.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-review/30 bg-review-soft px-4 py-3 text-[14px] text-[#5f3a05] sm:px-5">
          <Sun className="size-4 shrink-0 text-review" />
          <p className="min-w-0 flex-1">
            <span className="font-semibold">{advisories.map((a) => a.message.replace(/\.$/, "")).join("; ")}.</span> We could still read the details, but the official reviewer sees the same picture — make it clear.
          </p>
          <Button size="sm" variant="secondary" onClick={() => replaceInput.current?.click()} disabled={doc.status === "processing"}>
            <Upload className="size-4" /> Retake / replace
          </Button>
          <input ref={replaceInput} type="file" accept={ACCEPTED.join(",")} className="hidden" onChange={(e) => { if (e.target.files?.length) addFiles(Array.from(e.target.files), { replaceId: doc.id }); e.target.value = ""; }} />
        </div>
      )}
      {show && (
        <div className="border-b border-line bg-surface-2 p-3">
          <EvidenceViewer docId={doc.id} page={page} version={doc.version} highlights={highlights} className="max-h-[480px] overflow-auto" />
          <p className="mt-2 text-[12px] text-ink-3">Tap a detail below to highlight where it was read. Preview is stored only in this browser.</p>
        </div>
      )}
      <ul className="divide-y divide-line">
        {rows.map((f) => (
          <FieldRow key={f.key} doc={doc} field={f} reason={why.get(`${doc.id}:${f.key}`)} active={active === f.key} onShow={() => { setActive(f.key); setShow(true); }} />
        ))}
        {!doc.fields.length && <li className="px-5 py-4 text-[14px] text-ink-3">Nothing could be read from this file. Try a clearer copy on the Documents step.</li>}
      </ul>
    </section>
  );
}

function FieldRow({ doc, field, reason, active, onShow }: { doc: DocumentRecord; field: ExtractedField; reason?: Reason; active: boolean; onShow: () => void }) {
  const confirmField = useSession((s) => s.confirmField);
  const editField = useSession((s) => s.editField);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(field.value);
  const done = field.status !== "extracted";
  const minimised = !!field.minimised;

  return (
    <li className={clsx("px-4 py-3 sm:px-5", active && "bg-accent-soft/40", reason && !done && "border-l-4 border-l-review")}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
            {FIELD_LABELS[field.key]}
            {reason === "differs" && !done && <span className="bg-review-soft px-2 py-0.5 text-[11px] font-semibold text-review">differs from another document</span>}
            {reason === "unclear" && !done && <span className="bg-review-soft px-2 py-0.5 text-[11px] font-semibold text-review">hard to read — check</span>}
            {field.status === "edited" && <span className="bg-external-soft px-2 py-0.5 text-[11px] font-semibold text-external">corrected by you</span>}
            {field.status === "confirmed" && <span className="bg-pass-soft px-2 py-0.5 text-[11px] font-semibold text-pass">confirmed</span>}
          </p>
          {editing ? (
            <form
              className="mt-1.5 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                editField(doc.id, field.key, value.trim());
                setEditing(false);
              }}
            >
              <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} className="h-10 min-w-0 flex-1 border border-line-strong px-3 text-[15px]" aria-label={`Correct ${FIELD_LABELS[field.key]}`} />
              <Button type="submit" size="sm">Save</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </form>
          ) : (
            <p className="mt-0.5 break-words text-[17px] font-semibold">{display(field.key, field.value)}</p>
          )}
          {minimised && <p className="text-[12px] text-ink-3">Only the last 4 digits are kept.</p>}
        </div>
        {!editing && (
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {field.bbox && (
              <Button size="sm" variant="ghost" onClick={onShow} title="Show on document">
                <Eye className="size-4" /> <span className="hidden sm:inline">Show</span>
              </Button>
            )}
            {!minimised && field.status === "extracted" && (
              <Button size="sm" variant="secondary" onClick={() => confirmField(doc.id, field.key)}>
                <Check className="size-4" /> That&rsquo;s right
              </Button>
            )}
            {!minimised && (
              <Button size="sm" variant="ghost" onClick={() => (setValue(field.value), setEditing(true))}>
                <Pencil className="size-4" /> Fix
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
