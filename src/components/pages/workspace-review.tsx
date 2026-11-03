"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, ArrowRight, Check, Pencil, X } from "lucide-react";
import type { DocTypeId, DocumentRecord, ExtractedField, FieldKey } from "@/engine/types";
import { btn, Button, Card, Eyebrow, Notice } from "@/components/ui";
import { readability, UNREADABLE } from "@/engine/readability";
import { demoOverride } from "@/lib/demoOverrides";
import { DocStatusPill } from "@/components/workspace/DocStatus";
import { EvidenceViewer } from "@/components/workspace/EvidenceViewer";
import { useActiveSession, useDocProgress } from "@/lib/hooks";
import { useSession, transientLines } from "@/lib/store/session";
import { changeDocType } from "@/lib/actions";
import { DOC_TYPES, FIELD_LABELS, SENSITIVE_FIELDS } from "@/knowledge/documents";
import { maskIdentifier } from "@/engine/validators";

export function ReviewPage() {
  const { session } = useActiveSession();
  const progress = useDocProgress();
  const docs = session?.documents ?? [];
  const [selected, setSelected] = useState<string>();
  const doc = docs.find((d) => d.id === selected) ?? docs[0];

  if (!session) return null;
  if (!docs.length) {
    return (
      <EmptyState />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Step 3 · Review documents</Eyebrow>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Check what was read from each document</h1>
          <p className="mt-1 text-ink-2">Select a detail to see where it was found. Correct anything that was misread — your original documents are never changed.</p>
        </div>
        <Link href="/workspace/profile" className={btn("primary")}>
          Continue to profile <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Documents" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {docs.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelected(d.id)}
              className={clsx(
                "min-w-[200px] rounded-xl border px-3 py-2.5 text-left lg:min-w-0",
                d.id === doc?.id ? "border-accent bg-surface ring-1 ring-accent" : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <p className="truncate text-[14px] font-medium">{DOC_TYPES[d.typeId].short}</p>
              <p className="truncate text-[12px] text-ink-3">{d.fileName}</p>
              <div className="mt-1.5">
                <DocStatusPill status={d.status} stage={progress[d.id]} />
              </div>
            </button>
          ))}
        </nav>
        {doc && <DocDetail key={doc.id + doc.version} doc={doc} />}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="mx-auto max-w-lg p-8 text-center">
      <p className="text-[18px] font-semibold">No documents yet</p>
      <p className="mt-2 text-ink-2">Add documents on the Prepare step, then come back to check what was read.</p>
      <Link href="/workspace" className={btn("primary", "md", "mt-5")}>Go to Prepare</Link>
    </Card>
  );
}

function DocDetail({ doc }: { doc: DocumentRecord }) {
  const [active, setActive] = useState<FieldKey>();
  const def = DOC_TYPES[doc.typeId];
  const canRetype = transientLines.has(doc.id);
  const [retypeMsg, setRetypeMsg] = useState<string>();
  const [page, setPage] = useState(1);
  const activeField = doc.fields.find((f) => f.key === active);
  const highlights = doc.fields
    .filter((f) => f.bbox && f.page === page)
    .map((f) => ({ bbox: f.bbox!, label: FIELD_LABELS[f.key], active: f.key === active, tone: f.status === "extracted" && f.confidence < UNREADABLE ? ("review" as const) : ("accent" as const) }));
  const read = readability(doc);

  if (doc.status === "processing") {
    return <Card className="p-8 text-center text-ink-3">Reading this document in your browser…</Card>;
  }
  if (doc.status === "failed") {
    return (
      <Notice tone="action">
        <p className="font-medium">This file could not be processed</p>
        <p className="mt-1">{doc.error}</p>
        <p className="mt-2">Go back to Prepare to replace or remove it.</p>
      </Notice>
    );
  }

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-3">
        <EvidenceViewer docId={doc.id} page={page} version={doc.version} highlights={highlights} />
        {doc.pageCount > 1 && (
          <div className="flex gap-2">
            {Array.from({ length: doc.pageCount }, (_, i) => (
              <Button key={i} size="sm" variant={page === i + 1 ? "primary" : "secondary"} onClick={() => setPage(i + 1)}>
                Page {i + 1}
              </Button>
            ))}
          </div>
        )}
        <p className="text-[12px] text-ink-3">
          Preview stored only in this browser. {doc.textMethod === "text-layer" ? "Text read from the PDF's digital text layer." : "Text recognised on your device."}
        </p>
      </div>

      <div className="min-w-0 space-y-4">
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] text-ink-3">Document type</p>
              <p className="font-semibold">{def.label}</p>
              <p className="text-[12px] text-ink-3">
                {doc.typeSource === "user" ? "Set by you" : "Detected automatically — change it if wrong"}
                {doc.fields.some((f) => demoOverride(doc.typeId, f.key) === f.value) && <span className="ml-2 font-semibold text-external">· demo override active (.env)</span>}
              </p>
            </div>
            <select
              aria-label="Change document type"
              className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-[13px]"
              value={doc.typeId}
              onChange={(e) => {
                const ok = changeDocType(doc.id, e.target.value as DocTypeId);
                setRetypeMsg(ok ? undefined : "The text of this document is no longer in memory (it is never stored). Use Replace on the Prepare step and choose the type.");
              }}
              disabled={!canRetype && doc.typeId !== "unknown"}
            >
              {Object.values(DOC_TYPES).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.short}
                </option>
              ))}
            </select>
          </div>
          {retypeMsg && <p className="mt-2 text-[12px] text-review">{retypeMsg}</p>}
          {process.env.NODE_ENV !== "production" && canRetype && (
            // Dev only: lets us see exactly what OCR produced when a layout is misread (text stays on this device).
            <button
              className="mt-2 text-[12px] text-ink-3 underline"
              onClick={() => {
                const t = transientLines.get(doc.id)!;
                void navigator.clipboard.writeText(t.lines.map((l) => `${Math.round(l.confidence * 100)}\t${l.text}`).join("\n"));
                setRetypeMsg("Recognised text copied to the clipboard (dev only).");
              }}
            >
              Copy recognised text (dev)
            </button>
          )}
        </Card>

        {read.issues.length > 0 && (
          <Notice tone="review">
            <p className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="size-4" /> This photo was hard to read
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {read.issues.map((i, n) => (
                <li key={n}>{i.message}</li>
              ))}
            </ul>
            <p className="mt-1.5 text-[13px]">Check the details below, or replace it with a clearer photo or the official PDF.</p>
          </Notice>
        )}

        <Card>
          <p className="border-b border-line px-4 py-3 font-semibold">Details found ({doc.fields.length})</p>
          <ul className="divide-y divide-line">
            {def.fields.map((key) => {
              const f = doc.fields.find((x) => x.key === key);
              return <FieldRow key={key} docId={doc.id} fieldKey={key} field={f} active={active === key} onSelect={() => setActive(key)} />;
            })}
          </ul>
          {doc.missingFields.length > 0 && (
            <p className="border-t border-line px-4 py-3 text-[13px] text-review">
              Not found: {doc.missingFields.map((k) => FIELD_LABELS[k]).join(", ")}. If the detail is printed on the document, enter it manually.
            </p>
          )}
        </Card>
        {activeField?.originalValue && (
          <p className="text-[12px] text-ink-3">
            Originally read as &ldquo;{activeField.originalValue}&rdquo;. Your correction is used for checks; the original is kept for the record.
          </p>
        )}
      </div>
    </div>
  );
}

function FieldRow({ docId, fieldKey, field, active, onSelect }: { docId: string; fieldKey: FieldKey; field?: ExtractedField; active: boolean; onSelect: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(field?.value ?? "");
  const editField = useSession((s) => s.editField);
  const confirmField = useSession((s) => s.confirmField);
  const sensitive = SENSITIVE_FIELDS.includes(fieldKey);
  const minimised = !!field?.minimised;
  const display = field ? (sensitive ? maskIdentifier(fieldKey, field.value) : field.value) : "—";

  return (
    <li className={clsx("px-4 py-3", active && "bg-accent-soft/40")}>
      <div className="flex items-start gap-3">
        <button onClick={onSelect} className="min-w-0 flex-1 text-left" disabled={!field}>
          <p className="text-[12px] text-ink-3">{FIELD_LABELS[fieldKey]}</p>
          {editing ? null : (
            <p className={clsx("break-words text-[15px]", !field && "text-ink-3")}>
              {display}
              {field?.status === "edited" && <span className="ml-2 text-[11px] text-external">edited by you</span>}
              {field?.status === "confirmed" && <span className="ml-2 text-[11px] text-pass">confirmed</span>}
            </p>
          )}
        </button>
        {!editing && field?.status === "extracted" && field.confidence < UNREADABLE && (
          <span className="mt-1 shrink-0 rounded-sm bg-review-soft px-2 py-0.5 text-[11px] font-semibold text-review">Hard to read — check</span>
        )}
        {!editing && !minimised && (
          <div className="flex gap-1">
            {field?.status === "extracted" && (
              <button className={btn("ghost", "sm", "px-2")} onClick={() => confirmField(docId, fieldKey)} aria-label={`Confirm ${FIELD_LABELS[fieldKey]}`} title="Looks right">
                <Check className="size-4" />
              </button>
            )}
            <button className={btn("ghost", "sm", "px-2")} onClick={() => (setValue(field?.value ?? ""), setEditing(true))} aria-label={`Edit ${FIELD_LABELS[fieldKey]}`} title="Correct">
              <Pencil className="size-3.5" />
            </button>
          </div>
        )}
      </div>
      {minimised && <p className="mt-1 text-[12px] text-ink-3">Only the last 4 digits are kept. Format check: {field!.minimised!.evaluable ? (field!.minimised!.valid ? "passed" : "failed") : "not applicable (masked)"}.</p>}
      {editing && (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            editField(docId, fieldKey, value.trim());
            setEditing(false);
          }}
        >
          <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong px-3 text-[14px]" />
          <Button size="sm" type="submit">Save</Button>
          <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(false)} aria-label="Cancel">
            <X className="size-4" />
          </Button>
        </form>
      )}
    </li>
  );
}
