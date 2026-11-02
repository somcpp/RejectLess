"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { ReactNode } from "react";
import { ArrowLeft, FlaskConical, House, LayoutList, MessageCircleQuestion, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/site";
import { GovBand } from "@/components/gov";
import { btn, Spinner } from "@/components/ui";
import { useActiveSession } from "@/lib/hooks";
import { useUi } from "@/lib/store/ui";
import { getGoal, goalForVariant, stateName } from "@/knowledge/onboarding";
import { getAuthority } from "@/knowledge/authorities";
import { ConsentGate } from "./ConsentGate";
import { AssistantPanel } from "./AssistantPanel";
import { DemoGuide } from "./DemoGuide";

const DETAIL_TABS = [
  { href: "/workspace/documents", label: "Documents" },
  { href: "/workspace/review", label: "What we read" },
  { href: "/workspace/profile", label: "Side by side" },
  { href: "/workspace/findings", label: "All findings" },
  { href: "/workspace/check", label: "Run check" },
  { href: "/workspace/report", label: "Report" },
];

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session, hydrated, app, variant } = useActiveSession();
  const openAssistant = useUi((s) => s.openAssistant);
  const assistantOpen = useUi((s) => s.assistantOpen);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-ink-3">
        <Spinner /> Loading…
      </div>
    );
  }

  if (!session || !app || !variant) {
    return (
      <div className="flex min-h-screen flex-col">
        <GovBand />
        <header className="mx-auto flex h-16 w-full max-w-5xl items-center px-5">
          <Logo />
        </header>
        <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-6 py-20 text-center">
          <p className="text-[24px] font-semibold">Nothing in progress</p>
          <p className="mt-2 text-ink-2">Checks are kept in this browser for 24 hours. Start a new one — it takes about 5 minutes.</p>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <Link href="/start" className={btn("primary", "lg")}>Get started</Link>
            <Link href="/demo" className={btn("ghost", "lg")}>Try a demo</Link>
          </div>
        </main>
      </div>
    );
  }

  const guided = pathname === "/workspace";
  const goal = getGoal(session.profile?.goal) ?? goalForVariant(session.appId, session.variantId);
  const where = session.profile?.state ? stateName(session.profile.state) : undefined;
  const auth = getAuthority(session.appId);

  return (
    <div className="flex min-h-screen flex-col">
      <GovBand ministry={auth} />
      <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-5">
          <Link href="/" className="rounded-lg p-2 text-ink-2 hover:bg-black/[0.05]" title="Home" aria-label="Home">
            <House className="size-5" />
          </Link>
          <Logo className="hidden shrink-0 sm:inline-flex" />
          <div className="min-w-0 flex-1 border-l border-line pl-3">
            <p className="truncate text-[14px] font-medium leading-tight">{goal?.label ?? variant.name}</p>
            <p className="truncate text-[12px] text-ink-3">
              {variant.formName}
              {where ? ` · ${where}` : ""}
              {session.demoScenarioId && <span className="ml-1.5 font-medium text-external">· Demo, fictional data</span>}
            </p>
          </div>
          {guided ? (
            <Link href="/workspace/findings" className={btn("ghost", "sm")} title="All details">
              <LayoutList className="size-4" /> <span className="hidden sm:inline">All details</span>
            </Link>
          ) : (
            <Link href="/workspace" className={btn("secondary", "sm")}>
              <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Back to guide</span><span className="sm:hidden">Guide</span>
            </Link>
          )}
          <button onClick={() => openAssistant()} className="rounded-lg p-2 text-ink-2 hover:bg-black/[0.05] sm:hidden" aria-label="Ask a question">
            <MessageCircleQuestion className="size-5" />
          </button>
          <Link href="/privacy" className="rounded-lg p-2 text-ink-2 hover:bg-black/[0.05]" title="Privacy" aria-label="Privacy">
            <ShieldCheck className="size-5" />
          </Link>
        </div>
        {!guided && (
          <nav aria-label="Details" className="mx-auto max-w-5xl overflow-x-auto px-5">
            <ol className="flex min-w-max gap-1 pb-2">
              {DETAIL_TABS.map((t) => {
                const active = pathname.startsWith(t.href);
                return (
                  <li key={t.href}>
                    <Link
                      href={t.href}
                      aria-current={active ? "page" : undefined}
                      className={clsx("block rounded-lg px-3 py-1.5 text-[13px]", active ? "bg-ink text-white" : "text-ink-2 hover:bg-black/[0.05]")}
                    >
                      {t.label}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
      </header>

      <main className={clsx("mx-auto w-full flex-1 px-5 pb-28 pt-6", guided ? "max-w-5xl sm:pt-10" : "max-w-7xl sm:pt-8")}>{children}</main>

      <footer className="px-5 pb-6 text-center text-[12px] text-ink-3">
        RejectLess is not a government service and can&rsquo;t approve applications.
        {session.demoScenarioId && (
          <span className="ml-1 inline-flex items-center gap-1 text-external">
            <FlaskConical className="size-3" /> All data here is fictional.
          </span>
        )}
      </footer>

      {!assistantOpen && (
        <button
          onClick={() => openAssistant()}
          className="fixed bottom-6 right-6 z-40 hidden h-12 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-white shadow-[0_12px_30px_-10px_rgba(30,33,36,0.6)] transition-transform hover:-translate-y-0.5 sm:inline-flex"
          aria-label="Ask a question"
        >
          <MessageCircleQuestion className="size-5" /> Ask
        </button>
      )}

      <ConsentGate />
      <AssistantPanel />
      {session.demoScenarioId && <DemoGuide />}
    </div>
  );
}
