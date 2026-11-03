"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, FlaskConical, Lock, X } from "lucide-react";
import type { DocTypeId } from "@/engine/types";
import { Button, Spinner } from "@/components/ui";
import { DOC_TYPES } from "@/knowledge/documents";
import { DOC_SOURCES } from "@/knowledge/authorities";
import { mockDigiLockerFetch } from "@/lib/actions";
import { useSession } from "@/lib/store/session";

type Phase = "intro" | "signin" | "fetching" | "added" | "unavailable";

/**
 * A simulated DigiLocker flow, clearly labelled as such. RejectLess has no DigiLocker
 * integration yet: in demo sessions it adds a fictional specimen; otherwise it explains
 * how to get the document yourself.
 */
export function DigiLockerMock({ docType, onClose }: { docType: DocTypeId; onClose: () => void }) {
  const demo = useSession((s) => !!s.session?.demoScenarioId);
  const [phase, setPhase] = useState<Phase>("intro");
  const def = DOC_TYPES[docType];
  const src = DOC_SOURCES[docType];

  useEffect(() => {
    if (phase !== "fetching") return;
    let alive = true;
    // A short pause so the "fetching" state is visible, then the real (simulated) outcome.
    const t = setTimeout(async () => {
      const r = await mockDigiLockerFetch(docType);
      if (alive) setPhase(r);
    }, 900);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [phase, docType]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6" role="dialog" aria-modal aria-labelledby="dl-title">
      <div className="w-full max-w-md overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl">
        <div className="flex items-center gap-2 border-b border-line bg-external-soft px-5 py-2.5 text-[12px] text-[#24406a]">
          <FlaskConical className="size-3.5" /> Simulation — RejectLess is not connected to DigiLocker yet.
          <button onClick={onClose} className="ml-auto rounded p-1 hover:bg-black/[0.05]" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-6">
          {phase === "intro" && (
            <>
              <h2 id="dl-title" className="text-[20px] font-semibold">Get your {def.short} from DigiLocker</h2>
              <p className="mt-2 text-[14px] text-ink-2">
                DigiLocker is the government&rsquo;s document wallet. Issuers like UIDAI and school boards put verified copies there, so you don&rsquo;t need to scan anything.
              </p>
              {src?.digilocker === "depends" && <p className="mt-3 rounded-xl bg-review-soft px-4 py-3 text-[14px] text-[#5f3a05]">{src.digilockerNote}</p>}
              <ol className="mt-4 space-y-2 text-[14px] text-ink-2">
                <li className="flex gap-2"><span className="font-medium text-ink">1.</span> Sign in to DigiLocker with your Aadhaar-linked mobile.</li>
                <li className="flex gap-2"><span className="font-medium text-ink">2.</span> Allow RejectLess to read only this document.</li>
                <li className="flex gap-2"><span className="font-medium text-ink">3.</span> It is read on your device like any upload. Nothing is stored online.</li>
              </ol>
              <p className="mt-4 flex items-start gap-1.5 text-[12px] text-ink-3">
                <Lock className="mt-0.5 size-3.5 shrink-0" /> This preview does not ask for your Aadhaar, mobile number or OTP.
              </p>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={onClose}>Not now</Button>
                <Button onClick={() => setPhase("signin")}>Continue (preview)</Button>
              </div>
            </>
          )}
          {phase === "signin" && (
            <>
              <h2 id="dl-title" className="text-[20px] font-semibold">Allow access to one document</h2>
              <p className="mt-2 text-[14px] text-ink-2">RejectLess would request only:</p>
              <p className="mt-3 flex items-center gap-2 rounded-xl border border-line px-4 py-3 text-[15px] font-medium">
                <Check className="size-4 text-pass" /> {def.label}
              </p>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button onClick={() => setPhase("fetching")}>Allow and fetch</Button>
              </div>
            </>
          )}
          {phase === "fetching" && (
            <div className="flex items-center gap-3 py-6">
              <Spinner className="text-accent" />
              <div>
                <p className="font-medium">Fetching {def.short}…</p>
                <p className="text-[14px] text-ink-3">{demo ? "Preparing a fictional specimen for this demo." : "Checking whether a connection is available."}</p>
              </div>
            </div>
          )}
          {phase === "added" && (
            <>
              <h2 id="dl-title" className="flex items-center gap-2 text-[20px] font-semibold"><Check className="size-5 text-pass" /> Added</h2>
              <p className="mt-2 text-[14px] text-ink-2">
                A fictional specimen {def.short} was added and is being read on your device. Run the check again to see the updated results.
              </p>
              <div className="mt-6 flex justify-end">
                <Button onClick={onClose}>Done</Button>
              </div>
            </>
          )}
          {phase === "unavailable" && (
            <>
              <h2 id="dl-title" className="text-[20px] font-semibold">Not connected yet</h2>
              <p className="mt-2 text-[14px] text-ink-2">
                DigiLocker access needs approval from the government as a &ldquo;requester&rdquo;, which RejectLess does not have yet. Here is how to get your {def.short} yourself:
              </p>
              {src && (
                <ol className="mt-3 space-y-1.5 text-[14px] text-ink-2">
                  {src.steps.map((s, i) => (
                    <li key={i} className="flex gap-2"><span className="font-medium text-ink">{i + 1}.</span> {s}</li>
                  ))}
                </ol>
              )}
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={onClose}>Close</Button>
                {src?.link && (
                  <a href={src.link.url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover">
                    Open {src.link.label} <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
