"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, BookOpen, Eye, History, MessageCircleQuestion, RefreshCw, Upload } from "lucide-react";
import type { Finding, FindingResolution } from "@/engine/types";
import { BasisTag, btn, Button, SeverityTag, StatusPill } from "@/components/ui";
import { EvidenceViewer } from "./EvidenceViewer";
import { getSource } from "@/knowledge/sources";
import { getRule } from "@/knowledge/rules";
import { useSession } from "@/lib/store/session";
import { useUi } from "@/lib/store/ui";

const RES_LABEL = { open: "Open", acknowledged: "Marked for follow-up", confirmed_correct: "Confirmed by you", resolved: "Resolved" } as const;

export function FindingDetail({ finding, resolution, onBack }: { finding: Finding; resolution?: FindingResolution; onBack?: () => void }) {
  const docs = useSession((s) => s.session?.documents) ?? [];
  const setResolution = useSession((s) => s.setResolution);
  const openAssistant = useUi((s) => s.openAssistant);
  const withBox = finding.observations.map((o, i) => ({ o, i })).filter(({ o }) => o.docId && o.bbox);
  // Show the value that differs from the first (anchor) record by default.
  const firstDiff = withBox.find(({ o }) => o.value !== finding.observations[0]?.value);
  const [evidence, setEvidence] = useState<number | undefined>((firstDiff ?? withBox[0])?.i);
  const ev = evidence !== undefined ? finding.observations[evidence] : undefined;
  const evDoc = ev?.docId ? docs.find((d) => d.id === ev.docId) : undefined;
  const rule = getRule(finding.ruleId);
  const historical = resolution?.state === "resolved";
  const isIssue = !historical && (finding.status === "action" || finding.status === "review");

  return (
    <article className="space-y-6">
      {onBack && (
        <button onClick={onBack} className="inline-flex items-center gap-1 text-[14px] text-ink-3 hover:text-ink lg:hidden">
          <ArrowLeft className="size-4" /> All findings
        </button>
      )}
      <header>
        <div className="flex flex-wrap items-center gap-2">
          {historical ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pass-soft px-2.5 py-0.5 text-[12px] font-medium text-pass">Resolved</span>
          ) : (
            <StatusPill status={finding.status} />
          )}
          {finding.status !== "passed" && !historical && <SeverityTag severity={finding.severity} />}
          <BasisTag basis={finding.basis} />
          {resolution && resolution.state !== "open" && !historical && (
            <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[12px] text-ink-2">{RES_LABEL[resolution.state]}</span>
          )}
        </div>
        <h2 className="mt-3 text-[22px] font-semibold leading-snug tracking-tight">{finding.title}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{finding.summary}</p>
        {historical && (
          <p className="mt-3 rounded-lg bg-pass-soft px-3 py-2 text-[13px] text-[#15553a]">
            This issue was not found on the latest check. Below is how it looked when it was detected.
          </p>
        )}
      </header>

      {finding.observations.length > 0 && (
        <section>
          <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-3">What was compared</h3>
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-[14px]">
              <thead className="bg-surface-2 text-left text-[12px] text-ink-3">
                <tr>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Value</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {finding.observations.map((o, i) => (
                  <tr key={i} className={clsx(evidence === i && "bg-accent-soft/40")}>
                    <td className="px-3 py-2.5 align-top">
                      <p>{o.docLabel}</p>
                      <p className="text-[12px] text-ink-3">
                        {o.fieldLabel}
                        {o.page ? ` · page ${o.page}` : ""}
                      </p>
                    </td>
                    <td className="break-words px-3 py-2.5 align-top font-medium">{o.value}</td>
                    <td className="px-3 py-2.5 text-right align-top">
                      {o.docId && o.bbox && !historical && (
                        <button className={btn("ghost", "sm", "px-2")} onClick={() => setEvidence(i)} aria-label={`Show evidence on ${o.docLabel}`}>
                          <Eye className="size-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ev && evDoc && !historical && (
            <div className="mt-3">
              <p className="mb-2 text-[12px] text-ink-3">
                Evidence: {ev.docLabel}, {ev.fieldLabel.toLowerCase()}
                {ev.page ? `, page ${ev.page}` : ""}
              </p>
              <EvidenceViewer docId={evDoc.id} page={ev.page ?? 1} version={evDoc.version} highlights={[{ bbox: ev.bbox!, label: ev.fieldLabel, active: true, tone: finding.status === "action" ? "action" : finding.status === "review" ? "review" : "accent" }]} className="max-h-[420px] overflow-auto" />
            </div>
          )}
        </section>
      )}

      {finding.signals.length > 0 && (
        <section>
          <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-3">How RejectLess reached this</h3>
          <ol className="space-y-1.5 rounded-xl border border-line bg-surface-2 p-4 text-[14px] text-ink-2">
            {finding.signals.map((s, i) => (
              <li key={i} className={clsx(s.startsWith("   •") && "pl-4 text-[13px] text-ink-3")}>
                {s.replace(/^\s+•\s*/, "• ")}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line p-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-ink-3">Why it matters</h3>
          <p className="mt-2 text-[14px] leading-relaxed">{finding.whyItMatters}</p>
        </div>
        <div className={clsx("rounded-xl border p-4", finding.status === "action" ? "border-action/20 bg-action-soft/50" : "border-line")}>
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-ink-3">{finding.status === "passed" ? "Good to know" : "What to do"}</h3>
          <p className="mt-2 text-[14px] leading-relaxed">{finding.recommendation}</p>
        </div>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-ink-3">
          <BookOpen className="size-3.5" /> Sources
        </h3>
        <ul className="space-y-2 text-[14px]">
          {finding.sourceIds.map((id) => {
            const s = getSource(id);
            if (!s) return null;
            return (
              <li key={id}>
                <a href={s.url} target={s.url.startsWith("/") ? undefined : "_blank"} rel="noreferrer" className="text-accent hover:underline">
                  {s.title}
                </a>
                <span className="ml-1.5 text-[12px] text-ink-3">
                  · {s.kind === "official" ? "Official" : "Secondary"} · {s.publisher}
                  {s.publishedOn ? ` · ${s.publishedOn}` : ""}
                </span>
                {s.note && <p className="text-[12px] text-ink-3">{s.note}</p>}
              </li>
            );
          })}
        </ul>
        {rule && (
          <p className="mt-3 text-[12px] text-ink-3">
            Rule {rule.id} v{rule.version}
            {rule.effectiveFrom ? ` · effective ${rule.effectiveFrom}` : ""} · last verified {rule.lastVerified}
          </p>
        )}
      </section>

      {(isIssue || resolution) && (
        <section className="rounded-xl border border-line bg-surface p-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-ink-3">Resolve</h3>
          {isIssue && (
            <div className="mt-3 flex flex-wrap gap-2">
              {finding.affectedDocIds.length > 0 && (
                <Link href="/workspace" className={btn("secondary", "sm")}>
                  <Upload className="size-3.5" /> Upload a corrected document
                </Link>
              )}
              <Link href="/workspace/review" className={btn("secondary", "sm")}>Correct a misread value</Link>
              <Button size="sm" variant="secondary" onClick={() => setResolution(finding.key, "confirmed_correct", "You confirmed the values are correct as they are.")}>
                Values are correct
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setResolution(finding.key, "acknowledged", "Marked for follow-up.")}>
                Mark for follow-up
              </Button>
              <Link href="/workspace/check" className={btn("ghost", "sm")}>
                <RefreshCw className="size-3.5" /> Re-run checks
              </Link>
            </div>
          )}
          {isIssue && (
            <p className="mt-2 text-[12px] text-ink-3">
              &ldquo;Values are correct&rdquo; records your confirmation in the report. It does not change the result — only fixing the source data does.
            </p>
          )}
          {resolution && resolution.history.length > 0 && (
            <div className="mt-4">
              <p className="flex items-center gap-1.5 text-[13px] font-medium">
                <History className="size-3.5" /> History
              </p>
              <ol className="mt-2 space-y-1 border-l border-line pl-4 text-[13px] text-ink-2">
                {resolution.history.map((h, i) => (
                  <li key={i}>
                    <span className="text-ink-3 tabular">{new Date(h.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span> — {h.note}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}

      <button onClick={() => openAssistant(finding.key)} className={btn("secondary", "md", "w-full")}>
        <MessageCircleQuestion className="size-4" /> Ask about this finding
      </button>
    </article>
  );
}
