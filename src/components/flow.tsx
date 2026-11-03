"use client";

import Link from "next/link";
import clsx from "clsx";
import type { ReactNode } from "react";
import { ArrowLeft, Check, ChevronRight, House } from "lucide-react";
import { TopBar } from "./gov";
import { Logo } from "./site";

/** Full-height step layout: portal chrome on top, one question in the middle, action at the bottom. */
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
  const backCls = "inline-flex h-10 items-center gap-1.5 rounded-sm border border-accent bg-surface pl-2.5 pr-3.5 text-[14px] font-semibold text-accent hover:bg-accent-soft";
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar ministry={ministry} />
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo className="[&>span]:hidden sm:[&>span]:block" />
          <Link href="/" className="inline-flex h-9 items-center gap-1.5 rounded-sm px-2 text-[13px] font-semibold text-accent hover:bg-accent-soft" aria-label="Home">
            <House className="size-4" /> Home
          </Link>
        </div>
      </div>
      <div className="h-1 bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label={label ?? "Progress"}>
        <div className="h-full bg-saffron transition-[width] duration-500 ease-out" style={{ width: `${Math.max(3, progress * 100)}%` }} />
      </div>
      <header className="mx-auto flex w-full max-w-xl items-center gap-3 px-5 pt-5">
        {onBack ? (
          <button onClick={onBack} className={backCls} aria-label="Back">
            <ArrowLeft className="size-5" /> Back
          </button>
        ) : backHref ? (
          <Link href={backHref} className={backCls} aria-label="Back">
            <ArrowLeft className="size-5" /> Back
          </Link>
        ) : null}
        <span className="text-[13px] text-ink-3">{Math.round(progress * 100)}% complete</span>
      </header>
      <main id="main" key={stepKey} className={clsx("mx-auto w-full max-w-xl flex-1 px-5 pb-8 pt-6 sm:pt-10", dir === "fwd" ? "step-fwd" : "step-back")}>
        {children}
      </main>
      {footer && (
        <div className="sticky bottom-0 border-t border-line bg-surface sm:static sm:border-0 sm:bg-transparent">
          <div className="mx-auto w-full max-w-xl px-5 py-4 sm:pb-10">{footer}</div>
        </div>
      )}
    </div>
  );
}

export function Question({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: ReactNode }) {
  return (
    <div className="mb-7 border-l-4 border-saffron pl-4">
      {eyebrow && <p className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-saffron">{eyebrow}</p>}
      <h1 className="text-[26px] font-bold leading-tight text-accent sm:text-[30px]">{title}</h1>
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
        "group flex w-full items-center gap-4 border border-l-4 bg-surface px-4 py-4 text-left transition-colors duration-150",
        selected ? "border-accent border-l-saffron bg-accent-soft/40" : "border-line border-l-line hover:border-accent hover:border-l-saffron",
        disabled && "pointer-events-none opacity-55",
      )}
    >
      {icon && (
        <span className={clsx("flex size-11 shrink-0 items-center justify-center transition-colors", selected ? "bg-accent text-white" : "bg-accent-soft text-accent")}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[14px] text-ink-2">{hint}</span>}
        {meta && <span className="mt-1.5 block text-[12px] text-ink-3">{meta}</span>}
      </span>
      {tag ? (
        <span className="shrink-0 border border-line px-2 py-0.5 text-[11px] font-semibold uppercase text-ink-3">{tag}</span>
      ) : selected ? (
        <Check className="size-5 shrink-0 text-accent" />
      ) : (
        <ChevronRight className="size-5 shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
      )}
    </button>
  );
}
