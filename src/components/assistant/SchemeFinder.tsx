"use client";

import { useState } from "react";
import clsx from "clsx";
import { ArrowRight, Check, CircleHelp, Search, X } from "lucide-react";
import { Button } from "@/components/ui";
import { screenSchemes, type FinderAnswers } from "@/knowledge/eligibility";
import { getScheme } from "@/knowledge/schemes";
import { getMinistry } from "@/knowledge/ministries";
import { getSource } from "@/knowledge/sources";
import { STATES } from "@/knowledge/onboarding";

const EDU = [["below10", "Below Class 10"], ["class10", "Class 10 passed"], ["class12", "Class 12 passed"], ["ug", "Graduate / in college"], ["pg", "Postgraduate"]] as const;
const WORK = [["student", "Student"], ["salaried_pf", "Salaried, PF deducted"], ["salaried_no_pf", "Salaried, no PF"], ["self_employed", "Self-employed / shop"], ["farmer", "Farmer"], ["unorganised", "Daily-wage / gig / unorganised"], ["unemployed", "Not working"], ["retired", "Retired"]] as const;

/** Deterministic scheme screening from a few answers; never claims eligibility beyond the researched conditions. */
export function SchemeFinder({ onPick }: { onPick?: (appId: string, variantId: string) => void }) {
  const [a, setA] = useState<FinderAnswers>({});
  const [results, setResults] = useState<ReturnType<typeof screenSchemes>>();
  const set = <K extends keyof FinderAnswers>(k: K, v: FinderAnswers[K]) => setA((x) => ({ ...x, [k]: v }));
  const chip = (on: boolean) => clsx("border px-3 py-1.5 text-[13px]", on ? "border-accent bg-accent text-white" : "border-line-strong bg-surface hover:border-accent");

  if (results) {
    const fits = results.filter((r) => r.verdict === "fits"), maybe = results.filter((r) => r.verdict === "maybe"), no = results.filter((r) => r.verdict === "no");
    return (
      <div className="space-y-4 text-[14px]">
        <p className="text-ink-2">
          Screened {results.length} schemes RejectLess knows the rules of. <span className="font-semibold">{fits.length} fit</span> your answers, {maybe.length} need more information, {no.length} don&rsquo;t apply. This is a screen, not an approval — only the scheme office decides.
        </p>
        {[["Likely fit", fits], ["Need more information", maybe], ["Don't apply to you", no]].map(([title, list]) => (
          (list as typeof results).length > 0 && (
            <div key={title as string}>
              <p className="mb-2 font-bold text-accent">{title as string}</p>
              <ul className="space-y-2">
                {(list as typeof results).map((r) => {
                  const s = getScheme(r.schemeId)!;
                  const m = getMinistry(s.ministryId);
                  return (
                    <li key={r.schemeId} className="gov-panel p-4">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-[12px] text-ink-3">{m?.name}</p>
                      <ul className="mt-2 space-y-1">
                        {r.conditions.map((c) => (
                          <li key={c.text} className="flex gap-2">
                            {c.status === "met" ? <Check className="mt-0.5 size-4 shrink-0 text-pass" /> : c.status === "unmet" ? <X className="mt-0.5 size-4 shrink-0 text-action" /> : <CircleHelp className="mt-0.5 size-4 shrink-0 text-review" />}
                            <span className={clsx(c.status === "unmet" && "text-ink-3")}>{c.text}{c.basis === "secondary" && <span className="ml-1 bg-review-soft px-1 text-[10px] font-semibold text-review">verify</span>}</span>
                          </li>
                        ))}
                      </ul>
                      {r.missing.length > 0 && <p className="mt-2 text-[13px] text-ink-2"><span className="font-semibold">Still needed:</span> {r.missing.join("; ")}.</p>}
                      <p className="mt-2 text-[12px] text-ink-3">
                        Usually asked for: {s.docs.join(", ")}.
                        {r.sourceIds.length > 0 && <> Source: {r.sourceIds.map(getSource).filter(Boolean).map((x) => x!.publisher).join(", ")}.</>}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {s.appId && r.verdict !== "no" && (
                          <Button size="sm" onClick={() => onPick?.(s.appId!, s.variantId!)}>Check my documents for this <ArrowRight className="size-3.5" /></Button>
                        )}
                        {s.portal && <a href={s.portal.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center px-2 text-[13px] font-semibold text-accent underline underline-offset-2">{s.portal.label}</a>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )
        ))}
        <p className="text-[12px] text-ink-3">Other schemes in the catalogue have not been researched for eligibility yet, so they are not listed here — browse them from the Start page.</p>
        <Button variant="ghost" onClick={() => setResults(undefined)}>Change answers</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-[14px]">
      <p className="text-ink-2">Answer what you can. Nothing here is personal identity; it stays in this browser.</p>
      <label className="block">
        <span className="font-semibold">Age</span>
        <input type="number" inputMode="numeric" min={5} max={110} value={a.age ?? ""} onChange={(e) => set("age", e.target.value ? Number(e.target.value) : undefined)} className="mt-1 h-10 w-32 border border-line-strong px-3" />
      </label>
      <div>
        <p className="font-semibold">Education</p>
        <div className="mt-1 flex flex-wrap gap-1.5">{EDU.map(([v, l]) => <button key={v} className={chip(a.education === v)} onClick={() => set("education", a.education === v ? undefined : v)}>{l}</button>)}</div>
      </div>
      <div>
        <p className="font-semibold">Work</p>
        <div className="mt-1 flex flex-wrap gap-1.5">{WORK.map(([v, l]) => <button key={v} className={chip(a.employment === v)} onClick={() => set("employment", a.employment === v ? undefined : v)}>{l}</button>)}</div>
      </div>
      <label className="block">
        <span className="font-semibold">Family income per year (₹)</span>
        <input type="number" inputMode="numeric" value={a.income ?? ""} onChange={(e) => set("income", e.target.value ? Number(e.target.value) : undefined)} className="mt-1 h-10 w-48 border border-line-strong px-3" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="font-semibold">Does your family hold farmland?</p>
          <div className="mt-1 flex gap-1.5">{(["yes", "no"] as const).map((v) => <button key={v} className={chip(a.landholder === v)} onClick={() => set("landholder", a.landholder === v ? undefined : v)}>{v === "yes" ? "Yes" : "No"}</button>)}</div>
        </div>
        <div>
          <p className="font-semibold">Does anyone in the family pay income tax?</p>
          <div className="mt-1 flex gap-1.5">{(["yes", "no"] as const).map((v) => <button key={v} className={chip(a.taxpayer === v)} onClick={() => set("taxpayer", a.taxpayer === v ? undefined : v)}>{v === "yes" ? "Yes" : "No"}</button>)}</div>
        </div>
      </div>
      <label className="block">
        <span className="font-semibold">State</span>
        <select value={a.state ?? ""} onChange={(e) => set("state", e.target.value || undefined)} className="mt-1 h-10 w-full border border-line-strong bg-surface px-2">
          <option value="">-- Select --</option>
          {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
      </label>
      <Button onClick={() => setResults(screenSchemes(a))}><Search className="size-4" /> Find schemes</Button>
    </div>
  );
}
