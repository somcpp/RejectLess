import Link from "next/link";
import { ArrowRight, BadgeIndianRupee, CheckCircle2, CircleHelp, FileUp, GraduationCap, Landmark, Lock, Megaphone, Phone, Receipt, ShieldCheck, TriangleAlert, UserRound, Wheat } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site";
import { Panel } from "@/components/gov";
import { btn } from "@/components/ui";
import { GOALS } from "@/knowledge/onboarding";
import { AUTHORITIES, getAuthority } from "@/knowledge/authorities";
import { getVariant } from "@/knowledge/applications";

const steps = [
  { Icon: UserRound, title: "Tell us about you", body: "A few taps: who you are, where you live and what you're applying for." },
  { Icon: FileUp, title: "Add your documents", body: "One at a time. They're read on your phone or computer — never uploaded." },
  { Icon: CheckCircle2, title: "Fix what's flagged", body: "Each problem in plain words, why it matters, and where to get what's missing." },
];

const GOAL_ICONS: Record<string, typeof Landmark> = { "epf-final": BadgeIndianRupee, "epf-partial": BadgeIndianRupee, "epf-pension": BadgeIndianRupee, "nsp-csss": GraduationCap, "pm-kisan": Wheat, "itr-1": Receipt, "income-cert": Landmark };

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        {/* Hero band */}
        <section className="bg-accent text-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-16">
            <div>
              <p className="rise inline-flex items-center gap-2 border border-white/30 px-3 py-1 text-[12px] font-semibold uppercase tracking-wide">
                <span className="size-1.5 bg-saffron" /> EPF · Scholarships · PM-KISAN · Income tax
              </p>
              <h1 className="rise rise-2 mt-5 text-[34px] font-bold leading-[1.12] sm:text-[46px]">
                Check your application before you submit it.
              </h1>
              <p className="font-dev rise rise-2 mt-2 text-[18px] text-white/85">जमा करने से पहले अपना आवेदन जाँचें।</p>
              <p className="rise rise-3 mt-4 max-w-xl text-[17px] leading-relaxed text-white/85">
                Answer a few questions, add your documents, and we tell you exactly what needs fixing — in plain language, with the office, helpline and portal for your scheme.
              </p>
              <div className="rise rise-4 mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/start" className={btn("saffron", "lg", "w-full px-7 sm:w-auto")}>
                  Get started <ArrowRight className="size-4" />
                </Link>
                <Link href="/demo" className={btn("secondary", "lg", "w-full border-white bg-transparent text-white hover:bg-white/10 sm:w-auto")}>Try a demo first</Link>
              </div>
              <ul className="rise rise-4 mt-6 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-white/75">
                <li className="inline-flex items-center gap-1.5"><Lock className="size-3.5" /> No sign-up</li>
                <li className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5" /> Documents stay on your device</li>
                <li>Free</li>
              </ul>
            </div>

            {/* Example result, in the portal's boxed style */}
            <div className="rise rise-4 gov-panel self-center text-ink" aria-label="Example result">
              <div className="gov-panel-head saffron">Example result · उदाहरण</div>
              <div className="p-5">
                <p className="text-[20px] font-bold">2 things to fix before you apply</p>
                <ul className="mt-4 space-y-2.5 text-[14px]">
                  <li className="flex items-start gap-3 border-l-4 border-action bg-action-soft px-3.5 py-3">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-action" />
                    <span><span className="font-semibold">Your IFSC has changed.</span> <span className="text-ink-2">Your bank merged; use the new code.</span></span>
                  </li>
                  <li className="flex items-start gap-3 border-l-4 border-review bg-review-soft px-3.5 py-3">
                    <CircleHelp className="mt-0.5 size-4 shrink-0 text-review" />
                    <span><span className="font-semibold">Name spelt differently.</span> <span className="text-ink-2">Saurabh on Aadhaar, Sourabh at the bank.</span></span>
                  </li>
                  <li className="flex items-center gap-3 px-3.5 py-1 text-ink-3">
                    <CheckCircle2 className="size-4 shrink-0 text-pass" /> 17 other checks passed
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Notice strip */}
        <div className="border-b border-saffron/40 bg-saffron-soft">
          <div className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-2.5 text-[13px] text-[#6b3a0f] sm:px-6">
            <Megaphone className="mt-0.5 size-4 shrink-0 text-saffron" />
            <p>
              <span className="font-semibold">Notice:</span> RejectLess is an independent tool and not a government website. Applications are filed only on the official portals. Government services are free — never pay an agent to “approve” your claim.
            </p>
          </div>
        </div>

        {/* Services grid */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[26px] font-bold text-accent">Services · सेवाएँ</h2>
              <p className="mt-1 text-ink-2">Pick what you want to do. Each check knows which office handles it.</p>
            </div>
            <Link href="/apply" className="hidden text-[14px] font-semibold text-accent underline underline-offset-2 sm:block">All applications</Link>
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GOALS.map((g) => {
              const Icon = GOAL_ICONS[g.id] ?? Landmark;
              const auth = getAuthority(g.appId);
              const v = g.appId && g.variantId ? getVariant(g.appId, g.variantId) : undefined;
              const inner = (
                <>
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center bg-accent-soft text-accent">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[16px] font-bold leading-snug text-accent">{g.label}</p>
                      <p className="mt-0.5 text-[13px] text-ink-2">{g.hint}</p>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-line pt-3 text-[12px] text-ink-3">
                    {auth ? (
                      <>
                        <span className="font-semibold text-ink-2">{auth.department.replace(/\s*\(.*\)\s*$/, "")}</span>
                        {v ? ` · ${v.formName}` : ""}
                      </>
                    ) : (
                      "Rules not yet researched"
                    )}
                  </div>
                </>
              );
              return (
                <li key={g.id}>
                  {g.comingSoon ? (
                    <div className="gov-panel h-full p-5 opacity-60">
                      <span className="float-right border border-line px-2 py-0.5 text-[11px] font-semibold uppercase text-ink-3">Coming soon</span>
                      {inner}
                    </div>
                  ) : (
                    <Link href="/start" className="gov-panel block h-full border-t-4 border-t-saffron p-5 transition-shadow hover:shadow-[0_6px_16px_rgba(31,61,122,0.18)]">
                      {inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* How it works + helplines */}
        <section id="how" className="scroll-mt-28 border-t border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_360px]">
            <div>
              <h2 className="text-[26px] font-bold text-accent">How it works · कैसे काम करता है</h2>
              <ol className="mt-6 grid gap-4 sm:grid-cols-3">
                {steps.map(({ Icon, title, body }, i) => (
                  <li key={title} className="gov-panel p-5">
                    <span className="flex size-9 items-center justify-center bg-saffron text-[15px] font-bold text-white">{i + 1}</span>
                    <Icon className="mt-4 size-5 text-accent" aria-hidden />
                    <p className="mt-2 text-[16px] font-bold">{title}</p>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{body}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-8">
                <Link href="/start" className={btn("primary", "lg")}>
                  Get started <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
            <Panel title="Official helplines · हेल्पलाइन" icon={<Phone className="size-4" />}>
              <ul className="divide-y divide-line text-[14px]">
                {AUTHORITIES.filter((a) => a.helplines.length).map((a) => (
                  <li key={a.appId} className="py-2.5 first:pt-0 last:pb-0">
                    <p className="font-semibold">{a.department.replace(/\s*\(.*\)\s*$/, "")}</p>
                    {a.helplines.map((h) => (
                      <p key={h.value} className="text-ink-2">
                        {h.label}: <span className="font-semibold text-ink tabular">{h.value}</span>
                      </p>
                    ))}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] text-ink-3">As published on the official portals on 2 Nov 2026. Verify before calling.</p>
            </Panel>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <Lock className="mx-auto size-6 text-accent" />
          <p className="mt-3 text-[18px] font-bold">Your documents never leave your device.</p>
          <p className="mx-auto mt-2 max-w-lg text-[14px] leading-relaxed text-ink-2">
            Everything is read in your browser. The optional AI helper only sees a summary — never your documents, names or numbers.{" "}
            <Link href="/privacy" className="font-semibold text-accent underline underline-offset-2">How we protect you</Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
