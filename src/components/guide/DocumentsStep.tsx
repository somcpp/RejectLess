"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Check, CircleAlert, CloudDownload, ExternalLink, FileUp, Lightbulb, Lock } from "lucide-react";
import type { DocTypeId } from "@/engine/types";
import { Button, Spinner } from "@/components/ui";
import { DigiLockerMock } from "@/components/workspace/DigiLockerMock";
import { DOC_SOURCES } from "@/knowledge/authorities";
import { ActionBar, StepTitle } from "./common";
import { useActiveSession, useDocProgress } from "@/lib/hooks";
import { addFiles } from "@/lib/actions";
import { useSession } from "@/lib/store/session";
import { ACCEPTED } from "@/lib/ingest/pipeline";
import { DOC_TYPES } from "@/knowledge/documents";
import { useUi } from "@/lib/store/ui";

export function DocumentsStep() {
  const { session, variant } = useActiveSession();
  const progress = useDocProgress();
  const skipDoc = useSession((s) => s.skipDoc);
  const unskipDoc = useSession((s) => s.unskipDoc);
  const setGuideStep = useSession((s) => s.setGuideStep);
  const input = useRef<HTMLInputElement>(null);
  const demoLoading = useUi((s) => s.demoLoading);
  const [dragging, setDragging] = useState(false);
  const [dl, setDl] = useState<DocTypeId>();
  if (!session || !variant) return null;

  const skipped = session.skippedDocs ?? [];
  const docOf = (t: DocTypeId) => session.documents.filter((d) => d.typeId === t).at(-1);
  // A placeholder being read has type "unknown" until classified — count it against the doc we asked for.
  const pendingUnknown = session.documents.find((d) => d.status === "processing" && d.typeId === "unknown");
  const preparing = demoLoading && session.documents.length === 0;
  const list = variant.documents;
  const current = list.find((r) => !docOf(r.docType) && !skipped.includes(r.docType));
  const currentIdx = current ? list.indexOf(current) : list.length;
  const failed = current ? session.documents.find((d) => d.status === "failed" && d.fileName && d.typeId === current.docType) : undefined;
  const busy = session.documents.some((d) => d.status === "processing");
  const latest = session.documents.filter((d) => d.status !== "processing").at(-1);
  const wrongSlot = latest?.requestedType && latest.typeId !== latest.requestedType && latest.typeId !== "unknown" ? latest : undefined;

  function onFiles(files: FileList | null) {
    if (!files?.length || !current) return;
    addFiles(Array.from(files), { hintType: current.docType });
  }

  return (
    <div>
      <StepTitle
        eyebrow={current ? `Document ${currentIdx + 1} of ${list.length}` : "Documents"}
        title={preparing || pendingUnknown ? "Reading your documents…" : current ? `Add your ${DOC_TYPES[current.docType].short}` : busy ? "Reading your documents…" : "Documents added"}
        sub={current ? current.why : busy ? "This happens on your device and takes a few seconds." : "Next, make sure we read them correctly."}
      />

      {/* Checklist chips */}
      <ul className="mb-6 flex flex-wrap gap-2">
        {list.map((r, i) => {
          const d = docOf(r.docType);
          const isSkipped = skipped.includes(r.docType) && !d;
          const state = d?.status === "processing" ? "reading" : d?.status === "failed" ? "failed" : d ? "done" : isSkipped ? "skipped" : r === current ? "current" : "todo";
          return (
            <li key={r.docType}>
              <button
                onClick={() => (isSkipped ? unskipDoc(r.docType) : undefined)}
                disabled={!isSkipped}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px]",
                  state === "done" && "border-pass/30 bg-pass-soft text-pass",
                  state === "reading" && "border-external/30 bg-external-soft text-external",
                  state === "failed" && "border-action/30 bg-action-soft text-action",
                  state === "current" && "border-accent bg-surface font-medium text-ink",
                  state === "skipped" && "border-dashed border-line-strong text-ink-3 hover:bg-surface",
                  state === "todo" && "border-line text-ink-3",
                )}
                title={isSkipped ? "Add it now" : undefined}
              >
                {state === "done" && <Check className="size-3.5" />}
                {state === "reading" && <Spinner className="size-3 border-[1.5px]" />}
                {state === "failed" && <CircleAlert className="size-3.5" />}
                {i + 1}. {DOC_TYPES[r.docType].short}
                {state === "skipped" && " · skipped"}
              </button>
            </li>
          );
        })}
      </ul>

      {preparing && (
        <div className="flex items-center gap-3 rounded-3xl border border-line bg-surface px-6 py-8">
          <Spinner className="text-accent" />
          <div>
            <p className="font-medium">Preparing the fictional documents for this demo</p>
            <p className="text-[14px] text-ink-3">They&rsquo;ll be read exactly like your own uploads.</p>
          </div>
        </div>
      )}

      {current && !pendingUnknown && !preparing && (
        <div key={current.docType} className="step-fwd">
          <div
            onDragOver={(e) => (e.preventDefault(), setDragging(true))}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => (e.preventDefault(), setDragging(false), onFiles(e.dataTransfer.files))}
            className={clsx(
              "rounded-3xl border-2 border-dashed px-6 py-10 text-center transition-colors",
              dragging ? "border-accent bg-accent-soft/50" : "border-line-strong bg-surface",
            )}
          >
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <FileUp className="size-6" />
            </span>
            <Button size="lg" className="mt-5" onClick={() => input.current?.click()}>
              Choose a photo or PDF
            </Button>
            <p className="mt-3 text-[13px] text-ink-3">or drag it here · JPG, PNG or PDF up to 10 MB</p>
            <input ref={input} type="file" accept={ACCEPTED.join(",")} className="hidden" onChange={(e) => (onFiles(e.target.files), (e.target.value = ""))} />
          </div>
          <p className="mt-4 flex items-start gap-2 text-[14px] text-ink-2">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-review" />
            {DOC_TYPES[current.docType].uploadTip}
          </p>
          {DOC_SOURCES[current.docType] && (
            <div className="mt-3 rounded-2xl border border-line bg-surface px-4 py-3 text-[14px]">
              <p className="text-ink-2">
                <span className="font-medium text-ink">Don&rsquo;t have it? </span>
                {DOC_SOURCES[current.docType]!.where}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DOC_SOURCES[current.docType]!.digilocker !== "no" && (
                  <Button size="sm" variant="secondary" onClick={() => setDl(current.docType)}>
                    <CloudDownload className="size-4" /> Get from DigiLocker
                  </Button>
                )}
                {DOC_SOURCES[current.docType]!.link && (
                  <a href={DOC_SOURCES[current.docType]!.link!.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 px-2 text-[13px] font-medium text-accent hover:underline">
                    {DOC_SOURCES[current.docType]!.link!.label} <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}
          {dl && <DigiLockerMock docType={dl} onClose={() => setDl(undefined)} />}
          {wrongSlot && (
            <p className="mt-3 rounded-xl bg-review-soft px-4 py-3 text-[14px] text-[#5f3a05]">
              That file looks like your {DOC_TYPES[wrongSlot.typeId].short}, so we added it as that.
            </p>
          )}
          {failed && <p className="mt-3 rounded-xl bg-action-soft px-4 py-3 text-[14px] text-action">{failed.error} Try another file.</p>}
        </div>
      )}

      {pendingUnknown && (
        <div className="flex items-center gap-3 rounded-3xl border border-line bg-surface px-6 py-8">
          <Spinner className="text-accent" />
          <div>
            <p className="font-medium">Reading {pendingUnknown.fileName}</p>
            <p className="text-[14px] text-ink-3">{progress[pendingUnknown.id] ?? "Starting"} — on your device</p>
          </div>
        </div>
      )}

      {!current && (
        <ul className="space-y-2">
          {list.map((r) => {
            const d = docOf(r.docType);
            return (
              <li key={r.docType} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3">
                {d?.status === "processing" ? <Spinner className="text-external" /> : d ? <Check className="size-4 text-pass" /> : <span className="size-4 rounded-full border border-dashed border-ink-3" />}
                <span className="flex-1 text-[15px]">{DOC_TYPES[r.docType].label}</span>
                <span className="text-[13px] text-ink-3">
                  {d?.status === "processing" ? progress[d.id] ?? "Reading" : d ? `${d.fields.length} details read` : "Skipped"}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 flex items-center gap-1.5 text-[13px] text-ink-3">
        <Lock className="size-3.5" /> Read on this device — never uploaded.{" "}
        <Link href="/workspace/documents" className="ml-1 font-medium text-accent hover:underline">Add another document</Link>
      </p>

      <ActionBar>
        {current ? (
          <Button size="lg" variant="ghost" onClick={() => skipDoc(current.docType)}>
            {current.need === "required" ? "I don't have it — skip" : "Skip"}
          </Button>
        ) : null}
        {!current && (
          <Button size="lg" onClick={() => setGuideStep("confirm")} disabled={busy}>
            {busy ? <Spinner /> : null} Continue <ArrowRight className="size-4" />
          </Button>
        )}
      </ActionBar>
    </div>
  );
}
