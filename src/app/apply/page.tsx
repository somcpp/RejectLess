import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, Briefcase, GraduationCap, Landmark, Wheat } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site";
import { Card, Eyebrow } from "@/components/ui";
import { APPLICATIONS, CATEGORIES } from "@/knowledge/applications";

export const metadata: Metadata = { title: "What are you applying for?" };

const ICONS = { briefcase: Briefcase, graduation: GraduationCap, wheat: Wheat, badge: BadgeCheck, landmark: Landmark };

export default function DiscoverPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <Eyebrow>Step 1 of 5 · Discover</Eyebrow>
        <h1 className="mt-2 text-[32px] font-semibold tracking-tight sm:text-[38px]">What are you trying to apply for?</h1>
        <p className="mt-3 max-w-2xl text-ink-2">
          Choose an application to see what it needs and what RejectLess will check. Applications we have not yet researched are listed as coming soon — we do not guess requirements.
        </p>

        <div className="mt-10 space-y-10">
          {CATEGORIES.map((cat) => {
            const apps = APPLICATIONS.filter((a) => a.categoryId === cat.id);
            const Icon = ICONS[cat.icon];
            return (
              <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-surface border border-line">
                    <Icon className="size-[18px] text-ink-2" aria-hidden />
                  </span>
                  <div>
                    <h2 id={`cat-${cat.id}`} className="font-semibold">{cat.name}</h2>
                    <p className="text-[13px] text-ink-3">{cat.description}</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {apps.map((app) =>
                    app.status === "available" ? (
                      <Link key={app.id} href={`/apply/${app.id}`} className="group">
                        <Card className="h-full p-5 transition-shadow group-hover:shadow-[0_10px_30px_-18px_rgba(30,33,36,0.4)] group-hover:border-line-strong">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold">{app.name}</p>
                              <p className="mt-0.5 text-[13px] text-ink-3">{app.authority}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-pass-soft px-2.5 py-0.5 text-[12px] font-medium text-pass">Available</span>
                          </div>
                          <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{app.description}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {app.variants.map((v) => (
                              <span key={v.id} className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-[12px] text-ink-2">
                                {v.name}
                              </span>
                            ))}
                          </div>
                          <p className="mt-4 flex items-center justify-between text-[13px]">
                            <span className="text-ink-3">For: {app.audience}</span>
                            <span className="inline-flex items-center gap-1 font-medium text-accent">
                              See requirements <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                            </span>
                          </p>
                        </Card>
                      </Link>
                    ) : (
                      <Card key={app.id} className="h-full border-dashed bg-transparent p-5" aria-disabled>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-ink-2">{app.name}</p>
                            <p className="mt-0.5 text-[13px] text-ink-3">{app.authority}</p>
                          </div>
                          <span className="shrink-0 rounded-full border border-line px-2.5 py-0.5 text-[12px] text-ink-3">Coming soon</span>
                        </div>
                        <p className="mt-3 text-[14px] text-ink-3">{app.description} Requirements not yet researched, so no checks are offered.</p>
                      </Card>
                    ),
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
