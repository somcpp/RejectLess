"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Building2, Contrast, ExternalLink, Landmark, Phone, Volume2, VolumeX } from "lucide-react";
import type { Authority } from "@/knowledge/authorities";
import { getSource } from "@/knowledge/sources";

// The utility bar every Indian government portal opens with (GIGW): skip link,
// bilingual line, screen-reader / text-size controls. No emblem — RejectLess is
// independent and says so in the masthead and footer.

const SIZES = [100, 112, 125] as const;
const SIZE_KEY = "rl-text-size";

export function TopBar({ ministry }: { ministry?: { ministry: string; ministryHi: string } }) {
  const [size, setSize] = useState<number>(100);
  useEffect(() => {
    try {
      const s = Number(localStorage.getItem(SIZE_KEY));
      if (SIZES.includes(s as (typeof SIZES)[number])) apply(s);
    } catch {}
  }, []);
  function apply(s: number) {
    setSize(s);
    document.documentElement.style.fontSize = `${s}%`;
    try {
      localStorage.setItem(SIZE_KEY, String(s));
    } catch {}
  }
  return (
    <div className="bg-navy-deep text-[12px] text-white/90">
      <a href="#main" className="skip-link">Skip to main content</a>
      <div className="mx-auto flex h-8 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <p className="flex min-w-0 items-center gap-2 truncate">
          <span className="flex h-3 w-5 shrink-0 flex-col overflow-hidden rounded-[1px] border border-white/30" aria-hidden>
            <span className="flex-1 bg-[#ff9933]" />
            <span className="flex-1 bg-white" />
            <span className="flex-1 bg-[#138808]" />
          </span>
          {ministry ? (
            <span className="truncate">
              <span className="font-dev">{ministry.ministryHi}</span> <span className="text-white/50">|</span> {ministry.ministry}
            </span>
          ) : (
            <span className="truncate">
              <span className="font-dev">भारत सरकार की योजनाओं के लिए</span> <span className="text-white/50">|</span> For Government of India schemes
            </span>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <Link href="/privacy#accessibility" className="hidden items-center gap-1 hover:underline sm:inline-flex">
            <Contrast className="size-3.5" /> Screen reader access
          </Link>
          <div className="flex items-center gap-0.5 border-l border-white/20 pl-3" role="group" aria-label="Text size">
            {SIZES.map((s, i) => (
              <button
                key={s}
                onClick={() => apply(s)}
                aria-pressed={size === s}
                className={clsx("h-6 min-w-6 rounded-sm px-1 leading-none hover:bg-white/15", size === s && "bg-white text-navy-deep", i === 0 && "text-[11px]", i === 2 && "text-[14px] font-semibold")}
                aria-label={`Text size ${s}%`}
              >
                {i === 0 ? "A-" : i === 2 ? "A+" : "A"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Reads the screen's main text aloud with the browser's own voice. Helps users who find reading hard. */
export function ReadAloud({ text, lang = "en-IN", className }: { text: string; lang?: string; className?: string }) {
  const [speaking, setSpeaking] = useState(false);
  // false on the server so the markup matches on hydration; true in browsers that can speak.
  const supported = useSyncExternalStore(() => () => {}, () => "speechSynthesis" in window, () => false);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  if (!supported) return null;
  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.92;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  }
  return (
    <button
      onClick={toggle}
      className={clsx("inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-accent hover:border-accent", speaking && "border-saffron text-saffron", className)}
      aria-pressed={speaking}
    >
      {speaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      {speaking ? "Stop" : "Listen · सुनें"}
    </button>
  );
}

/** Panel with a coloured header strip, as on NIC-built portals. */
export function Panel({ title, tone = "navy", children, className, icon }: { title: string; tone?: "navy" | "saffron"; children: React.ReactNode; className?: string; icon?: React.ReactNode }) {
  return (
    <section className={clsx("gov-panel", className)}>
      <h2 className={clsx("gov-panel-head", tone === "saffron" && "saffron")}>
        {icon}
        {title}
      </h2>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function AuthorityCard({ a, compact = false, formName }: { a: Authority; compact?: boolean; formName?: string }) {
  const sources = a.sourceIds.map(getSource).filter(Boolean);
  return (
    <div className="gov-panel">
      <div className="gov-panel-head">
        <Landmark className="size-4" /> Who handles this
      </div>
      <div className="flex items-start gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-[15px] font-bold leading-snug text-accent">{a.department}</p>
          <p className="text-[13px] text-ink-2">
            <span className="font-dev">{a.ministryHi}</span> · {a.ministry}
          </p>
          {formName && <p className="mt-1 text-[13px] text-ink-3">Form: {formName}</p>}
        </div>
      </div>
      <div className="space-y-3 px-4 py-4 text-[14px] leading-relaxed sm:px-5">
        <p className="text-ink-2">{a.whatHappens}</p>
        {!compact && a.timeline && <p className="text-ink-2"><span className="font-semibold text-ink">How long: </span>{a.timeline}</p>}
        <p className="text-ink-2"><span className="font-semibold text-ink">Fee: </span>{a.fee}</p>
        <ul className="space-y-1.5">
          <li>
            <a href={a.portal.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-accent underline underline-offset-2">
              <ExternalLink className="size-3.5" /> {a.portal.label}
            </a>
          </li>
          {a.helplines.map((h) => (
            <li key={h.value} className="flex items-start gap-1.5 text-ink-2">
              <Phone className="mt-1 size-3.5 shrink-0 text-saffron" />
              <span>
                {h.label}: <span className="font-semibold text-ink tabular">{h.value}</span>
                {h.note && <span className="block text-[12px] text-ink-3">{h.note}</span>}
              </span>
            </li>
          ))}
          {a.grievance && (
            <li className="flex items-start gap-1.5 text-ink-2">
              <Building2 className="mt-1 size-3.5 shrink-0 text-saffron" />
              <span>
                Complaints:{" "}
                <a href={a.grievance.url} target="_blank" rel="noreferrer" className="font-semibold text-accent underline underline-offset-2">{a.grievance.label}</a>
              </span>
            </li>
          )}
        </ul>
        {!compact && sources.length > 0 && (
          <p className="text-[12px] text-ink-3">
            Sources: {sources.map((s, i) => (
              <span key={s!.id}>
                {i > 0 && ", "}
                <a href={s!.url} target="_blank" rel="noreferrer" className="underline">{s!.publisher}</a>
              </span>
            ))}
            . RejectLess is independent of these offices.
          </p>
        )}
      </div>
    </div>
  );
}
