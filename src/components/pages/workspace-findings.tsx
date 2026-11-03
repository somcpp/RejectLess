"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, CheckCheck, ChevronRight } from "lucide-react";
import type { Finding, FindingStatus } from "@/engine/types";
import { btn, Card, Eyebrow, Notice, SeverityTag, STATUS_META } from "@/components/ui";
import { FindingDetail } from "@/components/workspace/FindingDetail";
import { useActiveSession } from "@/lib/hooks";

type Tab = FindingStatus | "resolved";
const TABS: Tab[] = ["action", "review", "external", "passed", "resolved"];
const SEV_RANK = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export function FindingsPage() {
  const { session, latestRun } = useActiveSession();
  const [chosenTab, setTab] = useState<Tab>();
  const [selectedKey, setSelectedKey] = useState<string>();
  const [sort, setSort] = useState<"severity" | "category">("severity");

  const resolvedKeys = useMemo(
    () => Object.entries(session?.resolutions ?? {}).filter(([, r]) => r.state === "resolved").map(([k]) => k),
    [session?.resolutions],
  );
  // Resolved issues: take the last version of the finding seen as an issue.
  const resolvedFindings = useMemo(() => {
    const out: Finding[] = [];
    for (const key of resolvedKeys) {
      for (let i = (session?.runs.length ?? 0) - 1; i >= 0; i--) {
        const f = session!.runs[i].findings.find((x) => x.key === key && (x.status === "action" || x.status === "review"));
        if (f) {
          out.push(f);
          break;
        }
      }
    }
    return out;
  }, [resolvedKeys, session]);

  if (!session) return null;
  if (!latestRun) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <p className="text-[18px] font-semibold">No findings yet</p>
        <p className="mt-2 text-ink-2">Run the readiness check to see what passed and what needs attention.</p>
        <Link href="/workspace/check" className={btn("primary", "md", "mt-5")}>Go to the check</Link>
      </Card>
    );
  }

  const byTab = (t: Tab) => (t === "resolved" ? resolvedFindings : latestRun.findings.filter((f) => f.status === t));
  const tab: Tab = chosenTab ?? TABS.find((t) => byTab(t).length > 0) ?? "action";
  const list = [...byTab(tab)].sort((a, b) => (sort === "severity" ? SEV_RANK[a.severity] - SEV_RANK[b.severity] : a.category.localeCompare(b.category)));
  const selected = list.find((f) => f.key === selectedKey) ?? (typeof window !== "undefined" && window.innerWidth >= 1024 ? list[0] : undefined);
  const open = latestRun.findings.filter((f) => f.status === "action" || f.status === "review").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Step 6 · Findings</Eyebrow>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">
            {open === 0 ? "No open issues found" : `${open} thing${open > 1 ? "s" : ""} to look at before you apply`}
          </h1>
          <p className="mt-1 text-ink-2">
            Checked {new Date(latestRun.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}. Results reflect the documents and details available at that time.
          </p>
        </div>
        <Link href="/workspace/report" className={btn("secondary")}>
          Readiness report <ArrowRight className="size-4" />
        </Link>
      </div>

      {open === 0 && (
        <Notice tone="pass" className="flex items-start gap-2">
          <CheckCheck className="mt-0.5 size-4 shrink-0" />
          Every check RejectLess could perform passed. Review the external verification items — only the official system can confirm those. This is not an approval.
        </Notice>
      )}

      <div role="tablist" aria-label="Finding categories" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {TABS.map((t) => {
          const n = byTab(t).length;
          const m = t === "resolved" ? { label: "Resolved", fg: "text-ink-2", bg: "bg-black/[0.04]" } : STATUS_META[t];
          return (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => (setTab(t), setSelectedKey(undefined))}
              className={clsx("rounded-xl border px-4 py-3 text-left transition-colors", tab === t ? "border-ink bg-surface ring-1 ring-ink" : "border-line bg-surface hover:border-line-strong")}
            >
              <p className={clsx("text-[22px] font-semibold tabular", n ? m.fg : "text-ink-3")}>{n}</p>
              <p className="text-[13px] text-ink-2">{m.label}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className={clsx(selected && "hidden lg:block")}>
          <div className="mb-2 flex items-center justify-between text-[13px] text-ink-3">
            <span>{list.length} item{list.length === 1 ? "" : "s"}</span>
            <label className="flex items-center gap-1.5">
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-md border border-line-strong bg-surface px-1.5 py-0.5">
                <option value="severity">by severity</option>
                <option value="category">by type</option>
              </select>
            </label>
          </div>
          {list.length === 0 ? (
            <Card className="p-6 text-center text-[14px] text-ink-3">
              {tab === "resolved" ? "Issues you fix will appear here after you re-run the check." : "Nothing in this category."}
            </Card>
          ) : (
            <ul className="space-y-2">
              {list.map((f) => {
                const res = session.resolutions[f.key];
                return (
                  <li key={f.key}>
                    <button
                      onClick={() => setSelectedKey(f.key)}
                      className={clsx(
                        "flex w-full items-start gap-3 rounded-xl border bg-surface px-4 py-3 text-left transition-colors",
                        selected?.key === f.key ? "border-accent ring-1 ring-accent" : "border-line hover:border-line-strong",
                      )}
                    >
                      <span className={clsx("mt-1.5 size-2 shrink-0 rounded-full", tab === "resolved" ? "bg-pass" : f.status === "action" ? "bg-action" : f.status === "review" ? "bg-review" : f.status === "external" ? "bg-external" : "bg-pass")} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium leading-snug">{f.title}</span>
                        <span className="mt-0.5 line-clamp-2 block text-[13px] text-ink-3">{f.summary}</span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {f.status !== "passed" && tab !== "resolved" && <SeverityTag severity={f.severity} />}
                          {res?.state === "confirmed_correct" && <span className="text-[11px] text-pass">confirmed by you</span>}
                          {res?.state === "acknowledged" && <span className="text-[11px] text-ink-3">follow-up</span>}
                          {tab === "resolved" && <span className="text-[11px] text-pass">resolved after re-check</span>}
                        </span>
                      </span>
                      <ChevronRight className="mt-1 size-4 shrink-0 text-ink-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="min-w-0">
          {selected ? (
            <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6">
              <FindingDetail key={selected.key} finding={selected} resolution={session.resolutions[selected.key]} onBack={() => setSelectedKey(undefined)} />
            </div>
          ) : (
            <div className="hidden h-full items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line-strong p-10 text-ink-3 lg:flex">
              Select a finding to see its evidence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
