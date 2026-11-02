"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase, ChevronDown, DoorOpen, FileText, GraduationCap, HandHelping, Landmark, Lightbulb, Lock, MapPin, Search, Sprout } from "lucide-react";
import { Choice, Question, StepFrame } from "@/components/flow";
import { AuthorityCard, ReadAloud } from "@/components/gov";
import { Button } from "@/components/ui";
import { getAuthority } from "@/knowledge/authorities";
import {
  ROLES, STATES, WORK_NOTES, WORK_TYPES, getGoal, goalsFor, recommendPf, stateName, stateNote,
  type PfAnswers, type Recommendation, type RoleId, type UserProfile, type WorkId,
} from "@/knowledge/onboarding";
import { getVariant } from "@/knowledge/applications";
import { DOC_TYPES } from "@/knowledge/documents";
import { useSession } from "@/lib/store/session";

type Step = "role" | "work" | "state" | "goal" | "help-left" | "help-when" | "help-years" | "help-age" | "help-result" | "plan";

const ROLE_ICONS: Record<string, React.ReactNode> = {
  briefcase: <Briefcase className="size-5" />,
  door: <DoorOpen className="size-5" />,
  graduation: <GraduationCap className="size-5" />,
  sprout: <Sprout className="size-5" />,
  hands: <HandHelping className="size-5" />,
};

const PROGRESS: Record<Step, number> = {
  role: 0.12, work: 0.3, state: 0.48, goal: 0.66,
  "help-left": 0.7, "help-when": 0.74, "help-years": 0.78, "help-age": 0.82, "help-result": 0.86, plan: 0.94,
};

export default function StartPage() {
  const router = useRouter();
  const { session, hydrated, startSession, setConsent } = useSession();
  const [step, setStep] = useState<Step>("role");
  const [history, setHistory] = useState<Step[]>([]);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [role, setRole] = useState<RoleId>();
  const [work, setWork] = useState<WorkId>();
  const [stateCode, setStateCode] = useState<string>();
  const [goalId, setGoalId] = useState<string>();
  const [pf, setPf] = useState<Partial<PfAnswers>>({});
  const [rec, setRec] = useState<Recommendation>();
  const [query, setQuery] = useState("");
  const [showConsent, setShowConsent] = useState(false);
  const [about, setAbout] = useState<string>();

  function go(next: Step) {
    setHistory((h) => [...h, step]);
    setDir("fwd");
    setStep(next);
    window.scrollTo({ top: 0 });
  }
  function back() {
    const prev = history.at(-1);
    if (!prev) return router.push("/");
    setHistory((h) => h.slice(0, -1));
    setDir("back");
    setStep(prev);
  }
  // Short pause so the tapped choice visibly registers before moving on.
  const pick = (fn: () => void, next: Step) => {
    fn();
    setTimeout(() => go(next), 160);
  };

  const goal = getGoal(goalId);
  const variant = goal?.appId && goal.variantId ? getVariant(goal.appId, goal.variantId) : undefined;
  const states = useMemo(() => STATES.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase())), [query]);

  function finishHelp(answers: PfAnswers) {
    const r = recommendPf(answers);
    setRec(r);
    go("help-result");
  }

  function begin() {
    if (!goal?.appId || !goal.variantId || !role || !stateCode) return;
    if (session && session.documents.length && !session.demoScenarioId) {
      if (!window.confirm("Starting a new check will delete the one in progress from this browser. Continue?")) return;
    }
    const profile: UserProfile = { role, work, state: stateCode, goal: goal.id };
    setConsent({ processing: new Date().toISOString() });
    startSession(goal.appId, goal.variantId, undefined, profile);
    router.push("/workspace");
  }

  // ------------------------------------------------------------------ steps
  if (step === "role") {
    return (
      <StepFrame stepKey={step} dir={dir} progress={PROGRESS.role} backHref="/">
        {hydrated && session && (
          <Link href="/workspace" className="mb-6 flex items-center justify-between rounded-2xl border border-accent/30 bg-accent-soft/60 px-4 py-3 text-[14px]">
            <span>
              <span className="font-medium">You have a check in progress.</span> <span className="text-ink-2">Pick up where you left off.</span>
            </span>
            <ArrowRight className="size-4 text-accent" />
          </Link>
        )}
        <Question eyebrow="Let's get to know you" title="Which describes you best?" sub="This helps us show only what applies to you." />
        <div className="space-y-3">
          {ROLES.map((r) => (
            <Choice
              key={r.id}
              label={r.label}
              hint={r.hint}
              icon={ROLE_ICONS[r.icon]}
              selected={role === r.id}
              onClick={() => pick(() => setRole(r.id), r.id === "employee" || r.id === "former_employee" ? "work" : "state")}
            />
          ))}
        </div>
      </StepFrame>
    );
  }

  if (step === "work") {
    return (
      <StepFrame stepKey={step} dir={dir} progress={PROGRESS.work} onBack={back}>
        <Question title={role === "former_employee" ? "Where did you work?" : "Where do you work?"} sub="PF rules depend on the type of employer." />
        <div className="space-y-3">
          {WORK_TYPES.map((w) => (
            <Choice key={w.id} label={w.label} hint={w.hint} selected={work === w.id} onClick={() => pick(() => setWork(w.id), "state")} />
          ))}
        </div>
      </StepFrame>
    );
  }

  if (step === "state") {
    return (
      <StepFrame stepKey={step} dir={dir} progress={PROGRESS.state} onBack={back}>
        <Question title="Which state do you live in?" sub="Some documents, like income certificates, are issued by your state." />
        <label className="relative mb-4 block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && states[0]) pick(() => setStateCode(states[0].code), "goal");
            }}
            placeholder="Search your state"
            className="h-13 w-full rounded-2xl border border-line-strong bg-surface py-3.5 pl-11 pr-4 text-[16px]"
            aria-label="Search your state"
          />
        </label>
        <ul className="max-h-[52vh] space-y-1.5 overflow-y-auto pr-1">
          {states.map((s) => (
            <li key={s.code}>
              <button
                onClick={() => pick(() => setStateCode(s.code), "goal")}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[15px] transition-colors ${stateCode === s.code ? "bg-accent text-white" : "hover:bg-surface"}`}
              >
                <MapPin className={`size-4 ${stateCode === s.code ? "text-white" : "text-ink-3"}`} />
                <span className="flex-1">{s.name}</span>
                {s.ut && <span className={`text-[12px] ${stateCode === s.code ? "text-white/80" : "text-ink-3"}`}>UT</span>}
              </button>
            </li>
          ))}
          {states.length === 0 && <li className="px-4 py-3 text-ink-3">No state matches &ldquo;{query}&rdquo;.</li>}
        </ul>
      </StepFrame>
    );
  }

  if (step === "goal" && role) {
    const options = goalsFor(role);
    const pfRole = role === "employee" || role === "former_employee" || role === "helper";
    const available = options.filter((g) => !g.comingSoon);
    return (
      <StepFrame stepKey={step} dir={dir} progress={PROGRESS.goal} onBack={back}>
        <Question title="What would you like to do?" sub={available.length ? "Pick one. You can come back for another later." : undefined} />
        <ReadAloud className="-mt-4 mb-5" text={`What would you like to do? ${options.map((g) => `${g.label}. ${g.hint}.`).join(" ")}`} />
        <div className="space-y-3">
          {options.map((g) => {
            const auth = getAuthority(g.appId);
            const v = g.appId && g.variantId ? getVariant(g.appId, g.variantId) : undefined;
            const open = about === g.id;
            return (
              <div key={g.id}>
                <Choice
                  label={g.label}
                  hint={g.hint}
                  meta={auth ? (
                    <span className="inline-flex items-center gap-1">
                      <Landmark className="size-3" /> {auth.department.replace(/\s*\(.*\)\s*$/, "")}
                      {v ? ` · ${v.formName}` : ""}
                    </span>
                  ) : undefined}
                  icon={<FileText className="size-5" />}
                  disabled={g.comingSoon}
                  tag={g.comingSoon ? "Coming soon" : undefined}
                  selected={goalId === g.id}
                  onClick={() => pick(() => setGoalId(g.id), "plan")}
                />
                {auth && (
                  <button
                    onClick={() => setAbout(open ? undefined : g.id)}
                    aria-expanded={open}
                    className="mt-1 inline-flex items-center gap-1 px-2 py-1 text-[13px] text-ink-3 hover:text-ink"
                  >
                    <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
                    {open ? "Hide details" : "Who runs this and what happens"}
                  </button>
                )}
                {open && auth && (
                  <div className="rise mt-2">
                    <AuthorityCard a={auth} compact formName={v?.formName} />
                  </div>
                )}
              </div>
            );
          })}
          {pfRole && (
            <Choice
              label="I'm not sure"
              hint="Answer 3 quick questions and we'll suggest the right claim"
              icon={<Lightbulb className="size-5" />}
              onClick={() => {
                if (role === "employee") {
                  setPf({ leftJob: "no" });
                  go("help-years");
                } else if (role === "former_employee") {
                  setPf({ leftJob: "yes" });
                  go("help-when");
                } else go("help-left");
              }}
            />
          )}
        </div>
        {!available.length && (
          <p className="mt-6 rounded-2xl bg-surface p-4 text-[14px] text-ink-2">
            We&rsquo;re still researching the rules for these, so we can&rsquo;t check them yet — we never guess requirements.{" "}
            <Link href="/demo" className="font-medium text-accent hover:underline">Try the demo</Link> to see how RejectLess works.
          </p>
        )}
      </StepFrame>
    );
  }

  if (step === "help-left") {
    return (
      <StepFrame stepKey={step} dir={dir} progress={PROGRESS["help-left"]} onBack={back}>
        <Question eyebrow="Quick question 1" title="Have they left their job?" />
        <div className="space-y-3">
          <Choice label="Yes, they've left or retired" onClick={() => pick(() => setPf({ leftJob: "yes" }), "help-when")} />
          <Choice label="No, they're still working" onClick={() => pick(() => setPf({ leftJob: "no" }), "help-years")} />
        </div>
      </StepFrame>
    );
  }

  if (step === "help-when") {
    const opts: [PfAnswers["monthsSinceLeft"], string][] = [
      ["lt1", "Less than a month ago"],
      ["1to12", "1 to 12 months ago"],
      ["12to36", "1 to 3 years ago"],
      ["gt36", "More than 3 years ago"],
    ];
    return (
      <StepFrame stepKey={step} dir={dir} progress={PROGRESS["help-when"]} onBack={back}>
        <Question eyebrow="Quick question" title="When did you leave your last job?" />
        <div className="space-y-3">
          {opts.map(([v, l]) => (
            <Choice key={v} label={l} selected={pf.monthsSinceLeft === v} onClick={() => pick(() => setPf((p) => ({ ...p, monthsSinceLeft: v })), "help-years")} />
          ))}
        </div>
      </StepFrame>
    );
  }

  if (step === "help-years") {
    const opts: [PfAnswers["years"], string][] = [
      ["lt1", "Less than 1 year"],
      ["1to5", "1 to 5 years"],
      ["5to10", "5 to 10 years"],
      ["gt10", "More than 10 years"],
    ];
    return (
      <StepFrame stepKey={step} dir={dir} progress={PROGRESS["help-years"]} onBack={back}>
        <Question eyebrow="Quick question" title="How long have you had PF in total?" sub="Add up all jobs where PF was deducted." />
        <div className="space-y-3">
          {opts.map(([v, l]) => (
            <Choice key={v} label={l} selected={pf.years === v} onClick={() => pick(() => setPf((p) => ({ ...p, years: v })), "help-age")} />
          ))}
        </div>
      </StepFrame>
    );
  }

  if (step === "help-age") {
    return (
      <StepFrame stepKey={step} dir={dir} progress={PROGRESS["help-age"]} onBack={back}>
        <Question eyebrow="Last question" title="Are you 58 or older?" />
        <div className="space-y-3">
          <Choice label="Yes" onClick={() => finishHelp({ ...(pf as PfAnswers), age58: "yes" })} />
          <Choice label="No" onClick={() => finishHelp({ ...(pf as PfAnswers), age58: "no" })} />
        </div>
      </StepFrame>
    );
  }

  if (step === "help-result" && rec) {
    const g = getGoal(rec.goalId)!;
    return (
      <StepFrame
        stepKey={step}
        dir={dir}
        progress={PROGRESS["help-result"]}
        onBack={back}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button size="lg" className="w-full sm:w-auto" onClick={() => (setGoalId(g.id), go("plan"))}>
              Continue with this <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="ghost" className="w-full sm:w-auto" onClick={back}>Choose something else</Button>
          </div>
        }
      >
        <Question eyebrow="Our suggestion" title={g.label} />
        <div className="space-y-4 text-[16px] leading-relaxed">
          <p className="rounded-2xl bg-surface p-5">{rec.why}</p>
          {rec.later && <p className="rounded-2xl border border-line p-5 text-ink-2"><span className="font-medium text-ink">Later: </span>{rec.later}</p>}
          <p className="text-[13px] text-ink-3">Based on the EPF Scheme, 2026 as reported. We&rsquo;ll confirm with the dates on your documents.</p>
        </div>
      </StepFrame>
    );
  }

  if (step === "plan" && goal && variant) {
    const docs = variant.documents;
    const workNote = work ? WORK_NOTES[work] : undefined;
    const auth = getAuthority(goal.appId);
    return (
      <StepFrame
        stepKey={step}
        dir={dir}
        progress={PROGRESS.plan}
        onBack={back}
        ministry={auth}
        footer={
          <div>
            <Button size="lg" className="w-full" onClick={begin}>
              Start <ArrowRight className="size-4" />
            </Button>
            <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-[13px] text-ink-3">
              <Lock className="mt-0.5 size-3.5 shrink-0" />
              <span>
                By starting, you agree that your documents are read on this device.{" "}
                <button className="font-medium text-accent hover:underline" onClick={() => setShowConsent(!showConsent)}>
                  {showConsent ? "Hide details" : "What does this mean?"}
                </button>
              </span>
            </p>
            {showConsent && (
              <ul className="mt-3 space-y-1.5 rounded-xl bg-surface p-4 text-[13px] text-ink-2">
                <li>• Documents are read in your browser and never uploaded.</li>
                <li>• We keep only the details this application needs, and only the last 4 digits of Aadhaar.</li>
                <li>• Photos are read with a text-recognition engine downloaded once from the jsDelivr CDN; no document data is sent.</li>
                <li>• Everything is deleted after 24 hours of inactivity, or any time from the Privacy page.</li>
                <li>• The AI helper is off unless you turn it on, and never sees your documents.</li>
              </ul>
            )}
          </div>
        }
      >
        <Question eyebrow="Here's your plan" title={goal.label} sub={`${variant.formName} · ${stateName(stateCode)}`} />
        <ReadAloud
          className="-mt-4 mb-5"
          text={`Your plan: ${goal.label}. You will need: ${docs.map((d) => DOC_TYPES[d.docType].label).join(", ")}. ${auth ? `This is handled by ${auth.department}. ${auth.fee}` : ""} It takes about 5 minutes.`}
        />
        <div className="space-y-6">
          {auth && <AuthorityCard a={auth} formName={variant.formName} />}
          <section>
            <h2 className="text-[15px] font-semibold">You&rsquo;ll need</h2>
            <ul className="mt-3 space-y-2">
              {docs.map((d) => (
                <li key={d.docType} className="flex items-start gap-3 rounded-xl bg-surface px-4 py-3">
                  <FileText className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span className="text-[15px]">
                    {DOC_TYPES[d.docType].label}
                    {d.need !== "required" && <span className="ml-1.5 text-[13px] text-ink-3">({d.need === "conditional" ? "maybe" : "optional"})</span>}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[13px] text-ink-3">Don&rsquo;t have them all? Start anyway — we&rsquo;ll tell you what&rsquo;s missing.</p>
          </section>
          <section className="space-y-2 text-[14px] leading-relaxed text-ink-2">
            <p>{stateNote(goal.id, stateCode)}</p>
            {workNote && <p>{workNote}</p>}
            <p>It takes about 5 minutes. You can stop and come back within 24 hours.</p>
          </section>
        </div>
      </StepFrame>
    );
  }

  // Fallback (e.g. refreshed mid-flow): restart.
  return (
    <StepFrame stepKey="restart" progress={0.1} backHref="/">
      <Question title="Let's start again" />
      <Button onClick={() => setStep("role")}>Begin</Button>

    </StepFrame>
  );
}
