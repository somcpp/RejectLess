"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import clsx from "clsx";
import { Building2, ExternalLink, Landmark, Phone, Volume2, VolumeX } from "lucide-react";
import type { Authority } from "@/knowledge/authorities";
import { getSource } from "@/knowledge/sources";

// Visual grammar familiar from Indian government portals — tricolour rule, bilingual
// labels, text-size control — without any emblem or claim to be a government site.

const SIZES = [100, 112, 125] as const;
const SIZE_KEY = "rl-text-size";

export function GovBand({ ministry, className }: { ministry?: { ministry: string; ministryHi: string }; className?: string }) {
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
    <div className={clsx("text-[12px]", className)}>
      <div className="flex h-1" aria-hidden>
        <span className="flex-1 bg-[#ff9933]" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-[#138808]" />
      </div>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-1.5 text-ink-3">
        <p className="min-w-0 truncate">
          {ministry ? (
            <>
              <span className="font-dev">{ministry.ministryHi}</span> · {ministry.ministry}
            </>
          ) : (
            <>
              <span className="font-dev">सरकारी आवेदन की तैयारी</span> · Preparing Government of India applications
            </>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Text size">
          {SIZES.map((s, i) => (
            <button
              key={s}
              onClick={() => apply(s)}
              aria-pressed={size === s}
              className={clsx("rounded px-1.5 py-0.5 leading-none hover:bg-black/[0.05]", size === s && "bg-ink text-white", i === 0 && "text-[11px]", i === 2 && "text-[14px] font-medium")}
              aria-label={`Text size ${s}%`}
            >
              A
            </button>
          ))}
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
      className={clsx("inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] text-ink-2 hover:border-line-strong", speaking && "border-accent text-accent", className)}
      aria-pressed={speaking}
    >
      {speaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      {speaking ? "Stop" : "Listen"}
    </button>
  );
}

export function AuthorityCard({ a, compact = false, formName }: { a: Authority; compact?: boolean; formName?: string }) {
  const sources = a.sourceIds.map(getSource).filter(Boolean);
  return (
    <div className="rounded-2xl border border-line bg-surface">
      <div className="flex items-start gap-3 border-b border-line px-5 py-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Landmark className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-medium uppercase tracking-wide text-ink-3">Who handles this</p>
          <p className="mt-0.5 text-[15px] font-semibold leading-snug">{a.department}</p>
          <p className="text-[13px] text-ink-2">
            <span className="font-dev">{a.ministryHi}</span> · {a.ministry}
          </p>
          {formName && <p className="mt-1 text-[13px] text-ink-3">Form: {formName}</p>}
        </div>
      </div>
      <div className="space-y-3 px-5 py-4 text-[14px] leading-relaxed">
        <p className="text-ink-2">{a.whatHappens}</p>
        {!compact && a.timeline && <p className="text-ink-2"><span className="font-medium text-ink">How long: </span>{a.timeline}</p>}
        <p className="text-ink-2"><span className="font-medium text-ink">Fee: </span>{a.fee}</p>
        <ul className="space-y-1.5">
          <li>
            <a href={a.portal.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline">
              <ExternalLink className="size-3.5" /> {a.portal.label}
            </a>
          </li>
          {a.helplines.map((h) => (
            <li key={h.value} className="flex items-start gap-1.5 text-ink-2">
              <Phone className="mt-1 size-3.5 shrink-0 text-ink-3" />
              <span>
                {h.label}: <span className="font-medium text-ink tabular">{h.value}</span>
                {h.note && <span className="block text-[12px] text-ink-3">{h.note}</span>}
              </span>
            </li>
          ))}
          {a.grievance && (
            <li className="flex items-start gap-1.5 text-ink-2">
              <Building2 className="mt-1 size-3.5 shrink-0 text-ink-3" />
              <span>
                Complaints:{" "}
                <a href={a.grievance.url} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">{a.grievance.label}</a>
              </span>
            </li>
          )}
        </ul>
        {!compact && sources.length > 0 && (
          <p className="text-[12px] text-ink-3">
            Sources: {sources.map((s, i) => (
              <span key={s!.id}>
                {i > 0 && ", "}
                <a href={s!.url} target="_blank" rel="noreferrer" className="hover:underline">{s!.publisher}</a>
              </span>
            ))}
            . RejectLess is independent of these offices.
          </p>
        )}
      </div>
    </div>
  );
}
