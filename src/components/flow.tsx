"use client";

import Link from "next/link";
import clsx from "clsx";
import type { ReactNode } from "react";
import { ArrowLeft, Check, ChevronRight, House } from "lucide-react";
import { GovBand } from "./gov";

/** Full-height step layout: back + progress + home on top, one question in the middle, action at the bottom. */
export function StepFrame({
  progress,
  onBack,
  backHref,
  children,
  footer,
  stepKey,
  dir = "fwd",
  label,
  ministry,
}: {
  progress: number;
  onBack?: () => void;
  backHref?: string;
  children: ReactNode;
  footer?: ReactNode;
  stepKey: string;
  dir?: "fwd" | "back";
  label?: string;
  ministry?: { ministry: string; ministryHi: string };
}) {
  const backCls = "inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface pl-2.5 pr-3.5 text-[14px] font-medium text-ink-2 hover:border-line-strong";
  return (
    <div className="flex min-h-dvh flex-col">
      <GovBand ministry={ministry} />
      <header className="mx-auto flex w-full max-w-xl items-center gap-3 px-5 pt-4">
        {onBack ? (
          <button onClick={onBack} className={backCls} aria-label="Back">
            <ArrowLeft className="size-5" /> Back
          </button>
        ) : backHref ? (
          <Link href={backHref} className={backCls} aria-label="Back">
            <ArrowLeft className="size-5" /> Back
          </Link>
        ) : (
          <span className="h-10" />
        )}
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label={label ?? "Progress"}>
          <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${Math.max(4, progress * 100)}%` }} />
        </div>
        <Link href="/" className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-surface text-ink-2 hover:border-line-strong" aria-label="Home" title="Home">
          <House className="size-5" />
        </Link>
      </header>
      <main key={stepKey} className={clsx("mx-auto w-full max-w-xl flex-1 px-5 pb-8 pt-8 sm:pt-14", dir === "fwd" ? "step-fwd" : "step-back")}>
        {children}
      </main>
      {footer && (
        <div className="sticky bottom-0 border-t border-line bg-bg/95 backdrop-blur sm:static sm:border-0 sm:bg-transparent">
          <div className="mx-auto w-full max-w-xl px-5 py-4 sm:pb-10">{footer}</div>
        </div>
      )}
    </div>
  );
}

export function Question({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: ReactNode }) {
  return (
    <div className="mb-7">
      {eyebrow && <p className="mb-2 text-[13px] font-medium text-accent">{eyebrow}</p>}
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">{title}</h1>
      {sub && <p className="mt-2 text-[16px] leading-relaxed text-ink-2">{sub}</p>}
    </div>
  );
}

export function Choice({
  label,
  hint,
  meta,
  icon,
  selected,
  disabled,
  tag,
  onClick,
}: {
  label: string;
  hint?: string;
  /** Small third line, e.g. the office that handles the form. */
  meta?: ReactNode;
  icon?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  tag?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={clsx(
        "group flex w-full items-center gap-4 rounded-2xl border bg-surface px-4 py-4 text-left transition-all duration-150",
        selected ? "border-accent ring-2 ring-accent/30" : "border-line hover:-translate-y-px hover:border-line-strong hover:shadow-[0_8px_24px_-16px_rgba(30,33,36,0.4)]",
        disabled && "pointer-events-none opacity-55",
      )}
    >
      {icon && (
        <span className={clsx("flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors", selected ? "bg-accent text-white" : "bg-accent-soft text-accent")}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-[14px] text-ink-3">{hint}</span>}
        {meta && <span className="mt-1.5 block text-[12px] text-ink-3">{meta}</span>}
      </span>
      {tag ? (
        <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[12px] text-ink-3">{tag}</span>
      ) : selected ? (
        <Check className="size-5 shrink-0 text-accent" />
      ) : (
        <ChevronRight className="size-5 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
      )}
    </button>
  );
}
