import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site";
import { Eyebrow, Notice } from "@/components/ui";
import { APPLICATIONS, getApplication } from "@/knowledge/applications";
import { getSource } from "@/knowledge/sources";
import { VariantPicker } from "./VariantPicker";

export function generateStaticParams() {
  return APPLICATIONS.filter((a) => a.status === "available").map((a) => ({ appId: a.id }));
}

export async function generateMetadata({ params }: PageProps<"/apply/[appId]">): Promise<Metadata> {
  const { appId } = await params;
  return { title: getApplication(appId)?.name ?? "Application" };
}

export default async function OverviewPage({ params }: PageProps<"/apply/[appId]">) {
  const { appId } = await params;
  const app = getApplication(appId);
  if (!app || app.status !== "available") notFound();
  const sources = app.sourceIds.map(getSource).filter(Boolean);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <Link href="/apply" className="inline-flex items-center gap-1 text-[14px] text-ink-3 hover:text-ink">
          <ChevronLeft className="size-4" /> All applications
        </Link>
        <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_320px]">
          <div>
            <Eyebrow>Step 1 of 5 · Understand the requirements</Eyebrow>
            <h1 className="mt-2 text-[32px] font-semibold tracking-tight">{app.name}</h1>
            <p className="mt-1 text-ink-3">{app.authority}</p>
            <p className="mt-4 max-w-2xl leading-relaxed text-ink-2">{app.description}</p>
            <div className="mt-6 space-y-3">
              {app.notices.map((n) => (
                <Notice key={n} tone="review">{n}</Notice>
              ))}
            </div>
            <VariantPicker appId={app.id} />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
              <p className="font-medium">Before you start</p>
              <ul className="mt-3 space-y-2.5 text-[14px] text-ink-2">
                <li>• You do not need an account.</li>
                <li>• Your documents are read in this browser and are not uploaded.</li>
                <li>• RejectLess does not submit your application. You will still apply on the official portal.</li>
                <li>• No check here guarantees approval.</li>
              </ul>
            </div>
            <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
              <p className="font-medium">Official sources</p>
              <ul className="mt-3 space-y-3 text-[14px]">
                {sources.map((s) => (
                  <li key={s!.id}>
                    <a href={s!.url} target="_blank" rel="noreferrer" className="group inline-flex items-start gap-1.5 text-ink-2 hover:text-accent">
                      <ExternalLink className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        {s!.title}
                        <span className="block text-[12px] text-ink-3">
                          {s!.kind === "official" ? "Official" : "Secondary source"} · accessed {s!.accessedOn}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[12px] text-ink-3">Rule pack {app.rulePackVersion} · reviewed {app.lastReviewed}</p>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
