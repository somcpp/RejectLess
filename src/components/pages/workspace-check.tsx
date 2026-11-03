"use client";

import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Check, Circle, Play, RotateCw } from "lucide-react";
import { STAGES, rulesFor } from "@/engine/run";
import { btn, Button, Card, Eyebrow, Notice, Spinner, STATUS_META } from "@/components/ui";
import { useActiveSession } from "@/lib/hooks";
import { useRunCheck } from "@/lib/useRunCheck";

export function CheckPage() {
  const { session, variant, latestRun } = useActiveSession();
  const { run, running, stages, lastRun: justRan } = useRunCheck();
  if (!session || !variant) return null;

  const processing = session.documents.filter((d) => d.status === "processing").length;
  const ruleCount = rulesFor(variant).length;

  const shown = justRan ?? latestRun;
  const counts = shown
    ? (["action", "review", "external", "passed"] as const).map((s) => ({ s, n: shown.findings.filter((f) => f.status === s).length }))
    : [];
  const docsSummary = `${session.documents.length} document${session.documents.length === 1 ? "" : "s"} · ${Object.values(session.draft).filter(Boolean).length} details entered by you`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Eyebrow>Step 5 · Readiness check</Eyebrow>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Run the application readiness check</h1>
        <p className="mt-1 text-ink-2">
          {ruleCount} checks for {variant.name} ({variant.formName}) · {docsSummary}. Everything runs on this device.
        </p>
      </div>

      {processing > 0 && <Notice tone="external">{processing} document{processing > 1 ? "s are" : " is"} still being read. Wait for them to finish for complete results.</Notice>}

      <Card>
        <ol className="divide-y divide-line">
          {STAGES.map((s, i) => {
            const st = stages[s.id];
            return (
              <li key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                <span
                  className={clsx(
                    "flex size-7 items-center justify-center rounded-full text-[12px]",
                    st?.status === "done" ? "bg-pass-soft text-pass" : st?.status === "running" ? "bg-accent-soft text-accent" : "bg-black/[0.05] text-ink-3",
                  )}
                >
                  {st?.status === "done" ? <Check className="size-4" /> : st?.status === "running" ? <Spinner className="size-3.5" /> : i + 1}
                </span>
                <span className={clsx("flex-1", !st && "text-ink-2")}>{s.label}</span>
                <span className="text-[12px] text-ink-3 tabular">
                  {st?.status === "done" ? `${st.count} result${st.count === 1 ? "" : "s"} · ${st.ms! < 1 ? "<1" : st.ms!.toFixed(0)} ms` : st?.status === "running" ? "Running…" : <Circle className="size-3" />}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-col gap-3 border-t border-line bg-surface-2 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-ink-3">
            {latestRun ? `Last run ${new Date(latestRun.at).toLocaleString("en-IN")}. Runs are fast because nothing leaves your device.` : "Text was already extracted when you added documents; this step compares and validates it."}
          </p>
          <Button size="lg" onClick={run} disabled={running || processing > 0}>
            {running ? <Spinner /> : latestRun ? <RotateCw className="size-4" /> : <Play className="size-4" />}
            {latestRun ? "Run again" : "Run readiness check"}
          </Button>
        </div>
      </Card>

      {shown && !running && (
        <Card className="p-5">
          <p className="font-semibold">{justRan ? "Check complete" : "Latest results"}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {counts.map(({ s, n }) => {
              const m = STATUS_META[s];
              return (
                <div key={s} className={clsx("rounded-xl px-4 py-3", m.bg)}>
                  <p className={clsx("text-[24px] font-semibold tabular", m.fg)}>{n}</p>
                  <p className={clsx("text-[13px]", m.fg)}>{m.label}</p>
                </div>
              );
            })}
          </div>
          <Link href="/workspace/findings" className={btn("primary", "md", "mt-5")}>
            See findings <ArrowRight className="size-4" />
          </Link>
        </Card>
      )}
    </div>
  );
}
