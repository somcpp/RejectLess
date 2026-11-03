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

/** Numbered circles joined by a line — the stepper used on e-District and NSP forms. Completed stages are tappable. */
export function GuideProgress({ step, onJump }: { step: GuideStep; onJump?: (s: GuideStep) => void }) {
  const idx = stageIndex(step);
  return (
    <ol className="gov-panel flex items-start px-2 py-4 sm:px-4" aria-label="Your progress">
      {GUIDE_STAGES.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        const circle = (
          <span
            className={clsx(
              "flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-[14px] font-bold",
              done ? "border-pass bg-pass text-white" : current ? "border-saffron bg-saffron text-white" : "border-line-strong bg-surface text-ink-3",
            )}
          >
            {done ? <Check className="size-4" /> : i + 1}
          </span>
        );
        const text = (
          <span className="mt-1.5 block w-full text-center">
            <span className={clsx("block truncate text-[12px] sm:text-[13px]", current ? "font-bold text-accent" : done ? "font-semibold text-pass" : "text-ink-3")}>{s.label}</span>
            <span className="font-dev hidden truncate text-[11px] text-ink-3 sm:block">{s.labelHi}</span>
          </span>
        );
        return (
          <li key={s.label} className="relative flex min-w-0 flex-1 flex-col items-center">
            {i > 0 && <span className={clsx("absolute left-[-50%] right-[50%] top-[18px] h-0.5", i <= idx ? "bg-pass" : "bg-line")} aria-hidden />}
            {done && onJump ? (
              <button onClick={() => onJump(s.id[0])} className="relative flex w-full flex-col items-center rounded-sm hover:bg-accent-soft/50" title={`Back to ${s.label}`}>
                {circle}
                {text}
              </button>
            ) : (
              <div className="relative flex w-full flex-col items-center" aria-current={current ? "step" : undefined}>
                {circle}
                {text}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function StepTitle({ eyebrow, title, sub, listen = true }: { eyebrow?: string; title: string; sub?: ReactNode; listen?: boolean }) {
  return (
    <div className="mb-6 border-l-4 border-saffron pl-4">
      {eyebrow && <p className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-saffron">{eyebrow}</p>}
      <h1 className="text-[24px] font-bold leading-tight text-accent sm:text-[28px]">{title}</h1>
      {sub && <p className="mt-2 text-[16px] leading-relaxed text-ink-2">{sub}</p>}
      {listen && <ReadAloud className="mt-3" text={`${title}. ${typeof sub === "string" ? sub : ""}`} />}
    </div>
  );
}

/** Bottom action bar: sticky on phones so the next step is always one thumb away. */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-8 border-t border-line bg-surface px-5 py-4 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">{children}</div>
    </div>
  );
}
