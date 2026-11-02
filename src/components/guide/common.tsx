"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import { Check, FileUp, Eye, Pencil, ListChecks } from "lucide-react";
import type { GuideStep } from "@/lib/store/session";
import { ReadAloud } from "@/components/gov";

export const GUIDE_STAGES: { id: GuideStep[]; label: string; labelHi: string; Icon: typeof Check }[] = [
  { id: ["documents"], label: "Documents", labelHi: "दस्तावेज़", Icon: FileUp },
  { id: ["confirm"], label: "Confirm", labelHi: "पुष्टि", Icon: Eye },
  { id: ["details"], label: "Your details", labelHi: "आपकी जानकारी", Icon: Pencil },
  { id: ["check", "results"], label: "Results", labelHi: "नतीजे", Icon: ListChecks },
];

export function stageIndex(step: GuideStep) {
  return GUIDE_STAGES.findIndex((s) => s.id.includes(step));
}

/** Numbered, icon-led stages. Completed stages are tappable so the user can go back without hunting for a link. */
export function GuideProgress({ step, onJump }: { step: GuideStep; onJump?: (s: GuideStep) => void }) {
  const idx = stageIndex(step);
  return (
    <ol className="flex items-start gap-2" aria-label="Your progress">
      {GUIDE_STAGES.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        const inner = (
          <>
            <span className={clsx("h-1.5 w-full rounded-full transition-colors duration-500", i <= idx ? "bg-accent" : "bg-line")} />
            <span className={clsx("flex items-center gap-1.5 text-[12px] sm:text-[13px]", current ? "font-medium text-ink" : "text-ink-3")}>
              <span className={clsx("flex size-5 shrink-0 items-center justify-center rounded-full text-[11px]", done ? "bg-pass-soft text-pass" : current ? "bg-accent text-white" : "bg-line text-ink-3")}>
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="truncate">{s.label}</span>
            </span>
          </>
        );
        return (
          <li key={s.label} className="min-w-0 flex-1">
            {done && onJump ? (
              <button onClick={() => onJump(s.id[0])} className="flex w-full flex-col gap-1.5 rounded-lg text-left hover:bg-black/[0.03]" title={`Back to ${s.label}`}>
                {inner}
              </button>
            ) : (
              <div className="flex flex-col gap-1.5" aria-current={current ? "step" : undefined}>{inner}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function StepTitle({ eyebrow, title, sub, listen = true }: { eyebrow?: string; title: string; sub?: ReactNode; listen?: boolean }) {
  return (
    <div className="mb-6">
      {eyebrow && <p className="mb-2 text-[13px] font-medium text-accent">{eyebrow}</p>}
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight sm:text-[30px]">{title}</h1>
      {sub && <p className="mt-2 text-[16px] leading-relaxed text-ink-2">{sub}</p>}
      {listen && <ReadAloud className="mt-3" text={`${title}. ${typeof sub === "string" ? sub : ""}`} />}
    </div>
  );
}

/** Bottom action bar: sticky on phones so the next step is always one thumb away. */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-8 border-t border-line bg-bg/95 px-5 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">{children}</div>
    </div>
  );
}
