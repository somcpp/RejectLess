import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import type { FindingStatus, RuleBasis, Severity } from "@/engine/types";
import { CheckCircle2, CircleAlert, CircleHelp, Globe2, ShieldCheck, TriangleAlert } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "saffron";
type Size = "sm" | "md" | "lg";

// Square-cornered, solid buttons as on government portals; saffron is the "go" action.
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";
const btnVariants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  saffron: "bg-saffron text-white hover:bg-saffron-hover",
  secondary: "bg-surface text-accent border border-accent hover:bg-accent-soft",
  ghost: "text-accent hover:bg-accent-soft",
  danger: "bg-action text-white hover:bg-[#931f18]",
};
const btnSizes: Record<Size, string> = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm", lg: "h-12 px-5 text-[15px]" };

export function btn(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return clsx(btnBase, btnVariants[variant], btnSizes[size], extra);
}

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={btn(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={btn(variant, size, className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={clsx("rounded-[var(--radius-card)] border border-line bg-surface", className)} {...props} />;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={clsx("flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-saffron", className)}>
      <span className="h-3 w-1 bg-saffron" aria-hidden />
      {children}
    </p>
  );
}

export const STATUS_META: Record<FindingStatus, { label: string; short: string; fg: string; bg: string; Icon: typeof CheckCircle2 }> = {
  passed: { label: "Passed", short: "Passed", fg: "text-pass", bg: "bg-pass-soft", Icon: CheckCircle2 },
  review: { label: "Needs review", short: "Review", fg: "text-review", bg: "bg-review-soft", Icon: CircleHelp },
  action: { label: "Action required", short: "Action", fg: "text-action", bg: "bg-action-soft", Icon: TriangleAlert },
  external: { label: "External verification", short: "External", fg: "text-external", bg: "bg-external-soft", Icon: Globe2 },
};

export function StatusPill({ status, className }: { status: FindingStatus; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium", m.fg, m.bg, className)}>
      <m.Icon className="size-3.5" aria-hidden />
      {m.label}
    </span>
  );
}

const SEV: Record<Severity, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low", info: "Info" };
export function SeverityTag({ severity }: { severity: Severity }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md border px-1.5 py-px text-[11px] font-medium",
        severity === "critical" && "border-action/30 text-action",
        severity === "high" && "border-action/20 text-action/90",
        severity === "medium" && "border-review/30 text-review",
        (severity === "low" || severity === "info") && "border-line-strong text-ink-3",
      )}
    >
      {SEV[severity]}
    </span>
  );
}

export const BASIS_META: Record<RuleBasis, { label: string; title: string; cls: string }> = {
  official: { label: "Official source", title: "Taken from an official government source.", cls: "text-pass border-pass/25 bg-pass-soft" },
  secondary: {
    label: "Verify",
    title: "Based on reputable reporting; the official text could not be confirmed. Check the official portal.",
    cls: "text-review border-review/25 bg-review-soft",
  },
  engine: { label: "RejectLess check", title: "A data-quality check by RejectLess, not an official requirement.", cls: "text-ink-2 border-line-strong bg-surface-2" },
  demo: { label: "Demo rule", title: "Illustrative rule for demonstration — not an official requirement.", cls: "text-external border-external/25 bg-external-soft" },
};

export function BasisTag({ basis }: { basis: RuleBasis }) {
  const m = BASIS_META[basis];
  return (
    <span title={m.title} className={clsx("inline-flex items-center gap-1 rounded-md border px-1.5 py-px text-[11px] font-medium", m.cls)}>
      {basis === "official" ? <ShieldCheck className="size-3" aria-hidden /> : <CircleAlert className="size-3" aria-hidden />}
      {m.label}
    </span>
  );
}

export function Notice({ tone = "neutral", children, className }: { tone?: "neutral" | "review" | "action" | "external" | "pass"; children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        "rounded-xl border px-4 py-3 text-[14px] leading-relaxed",
        tone === "neutral" && "border-line bg-surface-2 text-ink-2",
        tone === "review" && "border-review/20 bg-review-soft text-[#5f3a05]",
        tone === "action" && "border-action/20 bg-action-soft text-[#7a1a14]",
        tone === "external" && "border-external/20 bg-external-soft text-[#24406a]",
        tone === "pass" && "border-pass/20 bg-pass-soft text-[#15553a]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={clsx("inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)} aria-hidden />;
}

export function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone = pct >= 85 ? "bg-pass" : pct >= 70 ? "bg-review" : "bg-action";
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3 tabular" title={`Extraction confidence ${pct}%`}>
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-line">
        <span className={clsx("block h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
      </span>
      {pct}%
    </span>
  );
}
