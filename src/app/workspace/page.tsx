"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useActiveSession } from "@/lib/hooks";
import { useSession, type GuideStep } from "@/lib/store/session";
import { GUIDE_STAGES, GuideProgress, stageIndex } from "@/components/guide/common";
import { DocumentsStep } from "@/components/guide/DocumentsStep";
import { ConfirmStep } from "@/components/guide/ConfirmStep";
import { DetailsStep } from "@/components/guide/DetailsStep";
import { CheckStep } from "@/components/guide/CheckStep";
import { ResultsStep } from "@/components/guide/ResultsStep";

const ORDER: GuideStep[] = ["documents", "confirm", "details", "check", "results"];
// Where "Back" goes from each step. The check step is skipped on the way back (it re-runs automatically).
const PREV: Record<GuideStep, GuideStep | "start"> = { documents: "start", confirm: "documents", details: "confirm", check: "details", results: "details" };

/** The guided flow: one clear step at a time. Detailed views stay available under "All details". */
export default function GuidePage() {
  const { session, latestRun } = useActiveSession();
  const setGuideStep = useSession((s) => s.setGuideStep);
  const router = useRouter();
  const step: GuideStep = session?.guideStep === "results" && !latestRun ? "check" : (session?.guideStep ?? "documents");
  // Slide forward or back depending on where the user came from.
  const [shown, setShown] = useState({ step, dir: "step-fwd" });
  if (shown.step !== step) setShown({ step, dir: ORDER.indexOf(step) >= ORDER.indexOf(shown.step) ? "step-fwd" : "step-back" });
  const dir = shown.dir;
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);
  if (!session) return null;

  const stage = stageIndex(step);
  function back() {
    const prev = PREV[step];
    if (prev === "start") router.push("/start");
    else setGuideStep(prev);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button onClick={back} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface pl-2.5 pr-3.5 text-[14px] font-medium text-ink-2 hover:border-line-strong" aria-label="Back">
          <ArrowLeft className="size-5" /> Back
        </button>
        <p className="text-[13px] text-ink-3">
          Step {stage + 1} of {GUIDE_STAGES.length} · <span className="font-dev">{GUIDE_STAGES[stage].labelHi}</span>
        </p>
      </div>
      <GuideProgress step={step} onJump={(s) => setGuideStep(s)} />
      <div key={step} className={`${dir} pt-8`}>
        {step === "documents" && <DocumentsStep />}
        {step === "confirm" && <ConfirmStep />}
        {step === "details" && <DetailsStep />}
        {step === "check" && <CheckStep />}
        {step === "results" && <ResultsStep />}
      </div>
    </div>
  );
}
