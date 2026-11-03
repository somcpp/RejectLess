"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CheckCircle2, Download, ExternalLink } from "lucide-react";
import { btn, Button, Card, Eyebrow, Notice, Spinner, STATUS_META } from "@/components/ui";
import { useActiveSession } from "@/lib/hooks";
import { DISCLAIMER, LIMITATIONS, resolvedIssues } from "@/lib/reportData";
import { DOC_TYPES } from "@/knowledge/documents";

export function ReportPage() {
  const { session, app, variant, latestRun } = useActiveSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  if (!session || !app || !variant) return null;

  async function download() {
    setBusy(true);
    setError(undefined);
    try {
      const { downloadReport } = await import("@/lib/report");
      await downloadReport(session!);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!latestRun) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <p className="text-[18px] font-semibold">Run the check first</p>
        <p className="mt-2 text-ink-2">The report summarises the results of your latest readiness check.</p>
        <Link href="/workspace/check" className={btn("primary", "md", "mt-5")}>Go to the check</Link>
      </Card>
    );
  }

  const by = (s: string) => latestRun.findings.filter((f) => f.status === s);
  const open = [...by("action"), ...by("review")];
  const resolved = resolvedIssues(session);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Step 7 · Readiness report</Eyebrow>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Your application readiness report</h1>
          <p className="mt-1 text-ink-2">
            {app.name} · {variant.name} · checked {new Date(latestRun.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <Button size="lg" onClick={download} disabled={busy}>
          {busy ? <Spinner /> : <Download className="size-4" />} Download PDF
        </Button>
      </div>
      {error && <Notice tone="action">The PDF could not be created: {error}</Notice>}
      <p className="text-[13px] text-ink-3">The PDF is generated in your browser. Aadhaar, account numbers and PAN appear masked.</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(["action", "review", "external", "passed"] as const).map((s) => (
          <div key={s} className={clsx("rounded-xl px-4 py-3", STATUS_META[s].bg)}>
            <p className={clsx("text-[24px] font-semibold tabular", STATUS_META[s].fg)}>{by(s).length}</p>
            <p className={clsx("text-[13px]", STATUS_META[s].fg)}>{STATUS_META[s].label}</p>
          </div>
        ))}
        <div className="rounded-xl bg-black/[0.04] px-4 py-3">
          <p className="text-[24px] font-semibold tabular">{resolved.length}</p>
          <p className="text-[13px] text-ink-2">Resolved</p>
        </div>
      </div>

      <Card className="divide-y divide-line">
        <section className="p-5">
          <p className="font-semibold">Documents reviewed ({session.documents.length})</p>
          <ul className="mt-2 space-y-1 text-[14px] text-ink-2">
            {session.documents.map((d) => (
              <li key={d.id}>
                {DOC_TYPES[d.typeId].label} — <span className="text-ink-3">{d.fileName}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="p-5">
          <p className="font-semibold">Remaining issues ({open.length})</p>
          {open.length === 0 ? (
            <p className="mt-2 text-[14px] text-ink-2">No open issues were found by the checks RejectLess could perform.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {open.map((f) => (
                <li key={f.key} className="text-[14px]">
                  <p className="font-medium">
                    <span className={clsx("mr-2 inline-block size-2 rounded-full", f.status === "action" ? "bg-action" : "bg-review")} />
                    {f.title}
                  </p>
                  <p className="ml-4 text-ink-2">{f.recommendation}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        {resolved.length > 0 && (
          <section className="p-5">
            <p className="font-semibold">Resolved during this session</p>
            <ul className="mt-2 space-y-1 text-[14px]">
              {resolved.map(({ finding }) => (
                <li key={finding.key} className="flex items-center gap-2 text-ink-2">
                  <CheckCircle2 className="size-4 text-pass" /> {finding.title}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="p-5">
          <p className="font-semibold">Confirm on the official system</p>
          <ul className="mt-2 space-y-1 text-[14px] text-ink-2">
            {by("external").flatMap((f) => (f.signals.length ? f.signals : [f.summary])).map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
          {app.officialPortal && (
            <a href={app.officialPortal} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[14px] font-medium text-accent hover:underline">
              Open the official portal <ExternalLink className="size-3.5" />
            </a>
          )}
        </section>
        <section className="p-5">
          <p className="font-semibold">Limitations</p>
          <ul className="mt-2 space-y-1 text-[13px] text-ink-3">
            {LIMITATIONS.map((l) => (
              <li key={l}>• {l}</li>
            ))}
          </ul>
        </section>
      </Card>
      <Notice tone="neutral" className="text-[13px]">{DISCLAIMER}</Notice>
    </div>
  );
}
