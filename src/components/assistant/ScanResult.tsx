"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, FilePlus2, RotateCcw } from "lucide-react";
import type { DocumentRecord, TextLine } from "@/engine/types";
import { Button, Spinner } from "@/components/ui";
import { DOC_TYPES, FIELD_LABELS } from "@/knowledge/documents";
import { display } from "@/components/guide/ConfirmStep";

/** What a scan produced: detected type, extracted details, the recognised text, and the file itself. */
export function ScanResult({ files, onAdd, onRescan }: { files: File[]; onAdd: () => void; onRescan: () => void }) {
  const [stage, setStage] = useState("Reading the scan on your device…");
  const [result, setResult] = useState<{ record: Omit<DocumentRecord, "id" | "fileName" | "size" | "addedAt" | "version" | "synthetic">; lines: TextLine[] }>();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const file = files[0];
  // Object URL for the download link; revoked when the file changes or the view closes.
  const url = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { processFile } = await import("@/lib/ingest/pipeline");
        const r = await processFile(file, undefined, (s) => alive && setStage(s));
        if (alive) setResult({ record: r.record, lines: r.lines });
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
      URL.revokeObjectURL(url);
    };
  }, [file, url]);

  const text = result?.lines.map((l) => l.text).join("\n") ?? "";
  const def = result ? DOC_TYPES[result.record.typeId] : undefined;

  return (
    <div className="space-y-4 text-[14px]">
      <div className="flex flex-wrap items-center gap-2">
        {url && (
          <a href={url} download={file.name} className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-accent px-3 text-[13px] font-semibold text-white hover:bg-accent-hover">
            <Download className="size-4" /> Download scan ({file.type === "application/pdf" ? "PDF" : "JPG"}, {Math.round(file.size / 1024)} KB)
          </a>
        )}
        <Button size="sm" variant="ghost" onClick={onRescan}><RotateCcw className="size-4" /> Scan again</Button>
      </div>

      {!result && !error && (
        <p className="inline-flex items-center gap-2 text-ink-3"><Spinner /> {stage}</p>
      )}
      {error && <p className="border border-action/30 bg-action-soft px-3 py-2 text-action">{error}</p>}

      {result && def && (
        <>
          <div className="gov-panel">
            <div className="gov-panel-head">Looks like: {def.label}</div>
            <ul className="divide-y divide-line">
              {result.record.fields.map((f) => (
                <li key={f.key} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <span className="text-[12px] text-ink-3">{FIELD_LABELS[f.key]}</span>
                  <span className="text-right font-semibold">{display(f.key, f.value)}</span>
                </li>
              ))}
              {!result.record.fields.length && <li className="px-4 py-3 text-ink-3">No details could be read. Try a flatter, brighter scan.</li>}
            </ul>
            {result.record.missingFields.length > 0 && (
              <p className="border-t border-line px-4 py-2 text-[12px] text-review">Not found: {result.record.missingFields.map((k) => FIELD_LABELS[k]).join(", ")}.</p>
            )}
          </div>

          <div className="gov-panel">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
              <p className="font-semibold">Recognised text</p>
              <button
                onClick={() => { void navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent"
                disabled={!text}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap px-4 py-3 text-[12px] leading-snug text-ink-2">{text || "—"}</pre>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={onAdd}><FilePlus2 className="size-4" /> Add to my documents</Button>
          </div>
          <p className="text-[12px] text-ink-3">Everything above was read on this device. Nothing is uploaded; the file is only kept if you add it.</p>
        </>
      )}
    </div>
  );
}
