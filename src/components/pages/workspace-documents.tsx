"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, FilePlus2, FileText, Info, Lock, RefreshCw, Trash2, Upload } from "lucide-react";
import type { DocTypeId, DocumentRecord } from "@/engine/types";
import { btn, Button, Card, Eyebrow, Notice } from "@/components/ui";
import { DocStatusPill } from "@/components/workspace/DocStatus";
import { DraftForm } from "@/components/workspace/DraftForm";
import { useActiveSession, useDocProgress } from "@/lib/hooks";
import { addFiles } from "@/lib/actions";
import { useSession } from "@/lib/store/session";
import { ACCEPTED, MAX_FILE_BYTES } from "@/lib/ingest/pipeline";
import { DOC_TYPES } from "@/knowledge/documents";

const NEED = { required: "Needed", conditional: "Sometimes needed", recommended: "Optional" } as const;

export function DocumentsPage() {
  const { session, variant } = useActiveSession();
  const progress = useDocProgress();
  const removeDocument = useSession((s) => s.removeDocument);
  const consent = useSession((s) => s.consent);
  const generalInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<{ type?: DocTypeId; replaceId?: string }>({});
  const typedInput = useRef<HTMLInputElement>(null);
  if (!session || !variant) return null;

  const canProcess = !!consent.processing || !!session.demoScenarioId;
  const docsByType = (t: DocTypeId) => session.documents.filter((d) => d.typeId === t);
  const listed = new Set(variant.documents.map((d) => d.docType));
  const others = session.documents.filter((d) => !listed.has(d.typeId));
  const requiredMissing = variant.documents.filter((d) => d.need === "required" && docsByType(d.docType).length === 0).length;
  const busy = session.documents.some((d) => d.status === "processing");

  function pick(type?: DocTypeId, replaceId?: string) {
    setPending({ type, replaceId });
    typedInput.current?.click();
  }

  function onFiles(files: FileList | null, opts: { type?: DocTypeId; replaceId?: string } = {}) {
    if (!files?.length || !canProcess) return;
    addFiles(Array.from(files), { forcedType: opts.type, replaceId: opts.replaceId });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-6">
        <div>
          <Eyebrow>Step 2 · Prepare</Eyebrow>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Add your documents</h1>
          <p className="mt-1 text-ink-2">
            {variant.formName}. Add what you have — you can run the check at any time, and it will tell you what is missing.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onFiles(e.dataTransfer.files);
          }}
          className={clsx(
            "rounded-[var(--radius-card)] border-2 border-dashed p-6 text-center transition-colors sm:p-8",
            dragging ? "border-accent bg-accent-soft/50" : "border-line-strong bg-surface",
          )}
        >
          <Upload className="mx-auto size-6 text-ink-3" />
          <p className="mt-2 font-medium">Drop PDFs or photos here</p>
          <p className="mt-1 text-[13px] text-ink-3">
            PDF, JPG or PNG · up to {MAX_FILE_BYTES / 1024 / 1024} MB each · the document type is detected automatically
          </p>
          <Button className="mt-4" variant="secondary" onClick={() => generalInput.current?.click()} disabled={!canProcess}>
            <FilePlus2 className="size-4" /> Choose files
          </Button>
          <input ref={generalInput} type="file" multiple accept={ACCEPTED.join(",")} className="hidden" onChange={(e) => (onFiles(e.target.files), (e.target.value = ""))} />
          <input
            ref={typedInput}
            type="file"
            accept={ACCEPTED.join(",")}
            className="hidden"
            onChange={(e) => (onFiles(e.target.files, pending), (e.target.value = ""))}
          />
          <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-ink-3">
            <Lock className="size-3" /> Read on this device. Photos: use good light, keep the page flat, show all four edges.
          </p>
        </div>

        {/* Checklist */}
        <Card>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <p className="font-semibold">Document checklist</p>
              <p className="text-[13px] text-ink-3">
                {requiredMissing ? `${requiredMissing} needed document${requiredMissing > 1 ? "s" : ""} still missing` : "All needed documents added"}
              </p>
            </div>
          </div>
          <ul className="divide-y divide-line">
            {variant.documents.map((req) => {
              const docs = docsByType(req.docType);
              const def = DOC_TYPES[req.docType];
              return (
                <li key={req.docType} className="px-5 py-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <FileText className="mt-0.5 size-5 shrink-0 text-ink-3" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {def.label}
                        <span className={clsx("ml-2 rounded px-1.5 py-px align-middle text-[11px]", req.need === "required" ? "bg-ink text-white" : "border border-line-strong text-ink-3")}>
                          {NEED[req.need]}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[13px] text-ink-3">{req.why}</p>
                      {docs.length === 0 && <p className="mt-1 text-[12px] text-ink-3">Tip: {def.uploadTip}</p>}
                    </div>
                    {docs.length === 0 ? (
                      <div className="flex items-center gap-2">
                        <DocStatusPill status="missing" />
                        <Button size="sm" variant="secondary" onClick={() => pick(req.docType)} disabled={!canProcess}>
                          Upload
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  {docs.map((d) => (
                    <DocRow key={d.id} doc={d} stage={progress[d.id]} onReplace={() => pick(d.typeId, d.id)} onRemove={() => removeDocument(d.id)} busy={busy} />
                  ))}
                </li>
              );
            })}
          </ul>
        </Card>

        {others.length > 0 && (
          <Card>
            <p className="border-b border-line px-5 py-4 font-semibold">Other documents</p>
            <ul className="divide-y divide-line px-5">
              {others.map((d) => (
                <li key={d.id} className="py-1">
                  <DocRow doc={d} stage={progress[d.id]} onReplace={() => pick(undefined, d.id)} onRemove={() => removeDocument(d.id)} busy={busy} />
                </li>
              ))}
            </ul>
            <p className="px-5 pb-4 text-[13px] text-ink-3">
              {others.every((d) => d.status === "failed")
                ? "These files could not be read. Remove them, or replace them with a PDF, JPG or PNG."
                : "Not part of this application’s checklist, or not recognised. You can set the type on the review screen."}
            </p>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <DraftForm />
        <Card className="p-5">
          <p className="font-medium">Ready to check?</p>
          <p className="mt-1 text-[13px] text-ink-3">You can run the check with missing documents — it will list what is missing and what could not be checked.</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/workspace/check" className={btn("primary", "md", busy ? "pointer-events-none opacity-50" : "")}>
              Run readiness check <ArrowRight className="size-4" />
            </Link>
            <Link href="/workspace/review" className={btn("secondary")}>Review extracted details</Link>
          </div>
          {busy && <p className="mt-2 text-[12px] text-ink-3">Waiting for documents to finish processing…</p>}
        </Card>
        <Notice tone="neutral" className="flex gap-2 text-[13px]">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>RejectLess only reads documents. It never changes your documents or your official records.</span>
        </Notice>
      </div>
    </div>
  );
}

function DocRow({ doc, stage, onReplace, onRemove, busy }: { doc: DocumentRecord; stage?: string; onReplace: () => void; onRemove: () => void; busy: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5 sm:ml-8">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium">{doc.fileName}</p>
        <p className="text-[12px] text-ink-3">
          {doc.status === "failed"
            ? doc.error
            : doc.status === "processing"
              ? "Reading in your browser…"
              : `${DOC_TYPES[doc.typeId].short} · ${doc.textMethod === "text-layer" ? "digital PDF" : "text recognition"} · ${doc.fields.length} details found${doc.version > 1 ? ` · version ${doc.version}` : ""}${doc.synthetic ? " · fictional" : ""}`}
        </p>
      </div>
      <DocStatusPill status={doc.status} stage={stage} />
      <div className="flex gap-1">
        <button className={btn("ghost", "sm")} onClick={onReplace} disabled={busy} aria-label={`Replace ${doc.fileName}`}>
          <RefreshCw className="size-3.5" /> <span className="hidden sm:inline">Replace</span>
        </button>
        <button className={btn("ghost", "sm", "text-action")} onClick={onRemove} disabled={doc.status === "processing"} aria-label={`Remove ${doc.fileName}`}>
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
