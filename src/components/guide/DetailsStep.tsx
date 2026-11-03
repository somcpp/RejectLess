"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui";
import { ActionBar, StepTitle } from "./common";
import { useActiveSession } from "@/lib/hooks";
import { useSession } from "@/lib/store/session";
import { sampleDraftFor } from "@/demo/sampleDraft";

export function DetailsStep() {
  const { session, variant } = useActiveSession();
  const setDraft = useSession((s) => s.setDraft);
  const setDraftAll = useSession((s) => s.setDraftAll);
  const setGuideStep = useSession((s) => s.setGuideStep);
  const [sampled, setSampled] = useState(false);
  const seeded = useRef(false);

  // Arriving with nothing typed: fill in sample answers once, and say so.
  useEffect(() => {
    if (!session || seeded.current) return;
    seeded.current = true;
    const sample = sampleDraftFor(session.appId, session.variantId);
    if (sample && Object.values(session.draft).every((v) => !v)) {
      const t = setTimeout(() => {
        setDraftAll({ ...sample });
        setSampled(true);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [session, setDraftAll]);

  if (!session || !variant) return null;
  const filled = variant.draftFields.filter((f) => session.draft[f.key]).length;
  const sample = sampleDraftFor(session.appId, session.variantId);
  const blanks = sample ? Object.keys(sample).filter((k) => !session.draft[k]) : [];
  function fillBlanks() {
    if (!sample) return;
    setDraftAll({ ...session!.draft, ...Object.fromEntries(blanks.map((k) => [k, sample[k]])) });
    setSampled(true);
  }

  return (
    <div>
      <StepTitle
        title="What will you type on the portal?"
        sub="We compare it with your documents to catch typos before EPFO or NSP does. Leave blank anything you're not sure about."
      />
      {sample && blanks.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3 border border-line bg-surface px-4 py-3 text-[14px]">
          <Sparkles className="size-4 shrink-0 text-saffron" />
          <p className="min-w-0 flex-1">{blanks.length} answer{blanks.length > 1 ? "s are" : " is"} blank.</p>
          <Button size="sm" variant="secondary" onClick={fillBlanks}>Fill blanks with sample answers</Button>
        </div>
      )}
      {sampled && (
        <div className="mb-5 flex items-start gap-3 border border-saffron/40 bg-saffron-soft px-4 py-3 text-[14px]">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-saffron" />
          <p className="flex-1">
            <span className="font-semibold">Filled with sample answers</span> so you can see how the check and the portal form work. Change anything that isn&rsquo;t yours.
          </p>
          <button
            onClick={() => {
              setDraftAll({});
              setSampled(false);
            }}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent underline underline-offset-2"
          >
            <X className="size-3.5" /> Clear all
          </button>
        </div>
      )}
      <div className="space-y-5">
        {variant.draftFields.map((f) => (
          <label key={f.key} className="block">
            {f.section && <span className="mb-3 mt-2 block border-b-2 border-accent pb-1 text-[13px] font-bold uppercase tracking-wide text-accent">{f.section}</span>}
            <span className="text-[15px] font-medium">{f.label}</span>
            {f.help && <span className="mt-0.5 block text-[13px] text-ink-3">{f.help}</span>}
            {f.type === "select" ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {f.options!.map((o) => (
                  <button
                    type="button"
                    key={o.value}
                    onClick={() => setDraft(f.key, session.draft[f.key] === o.value ? "" : o.value)}
                    className={`rounded-xl border px-4 py-2.5 text-left text-[14px] transition-colors ${session.draft[f.key] === o.value ? "border-accent bg-accent text-white" : "border-line-strong bg-surface hover:border-ink-3"}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type={f.type === "date" ? "date" : "text"}
                inputMode={f.type === "number" || ["account_number", "mobile", "pincode"].includes(f.key) ? "numeric" : undefined}
                autoComplete="off"
                spellCheck={false}
                value={session.draft[f.key] ?? ""}
                onChange={(e) => setDraft(f.key, f.key === "ifsc" ? e.target.value.toUpperCase() : e.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-line-strong bg-surface px-4 text-[16px] tabular"
              />
            )}
          </label>
        ))}
      </div>
      <ActionBar>
        <Button size="lg" variant="ghost" onClick={() => setGuideStep("confirm")}>Back</Button>
        <Button size="lg" onClick={() => setGuideStep("check")}>
          {filled ? "Check my application" : "Skip and check"} <ArrowRight className="size-4" />
        </Button>
      </ActionBar>
    </div>
  );
}
