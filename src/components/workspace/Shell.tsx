"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { ReactNode } from "react";
import { ArrowLeft, FlaskConical, House, LayoutList, MessageCircleQuestion, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/site";
import { TopBar } from "@/components/gov";
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
        <TopBar />
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
            <Logo />
          </div>
        </header>
        <main id="main" className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-6 py-20 text-center">
          <p className="text-[24px] font-bold text-accent">Nothing in progress</p>
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
      <header className="sticky top-0 z-30 shadow-[0_2px_6px_rgba(0,0,0,0.12)]">
        <TopBar ministry={auth} />
        <div className="border-b border-line bg-surface">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
            <Logo className="shrink-0 [&>span]:hidden md:[&>span]:block" />
            <div className="min-w-0 flex-1 border-l-2 border-saffron pl-3">
              <p className="truncate text-[14px] font-bold leading-tight text-accent">{goal?.label ?? variant.name}</p>
              <p className="truncate text-[12px] text-ink-3">
                {variant.formName}
                {where ? ` · ${where}` : ""}
                {session.demoScenarioId && <span className="ml-1.5 font-semibold text-external">· Demo, fictional data</span>}
              </p>
            </div>
            <button onClick={() => openAssistant()} className="rounded-sm p-2 text-accent hover:bg-accent-soft sm:hidden" aria-label="Ask a question">
              <MessageCircleQuestion className="size-5" />
            </button>
            <Link href="/privacy" className="rounded-sm p-2 text-accent hover:bg-accent-soft" title="Privacy" aria-label="Privacy">
              <ShieldCheck className="size-5" />
            </Link>
          </div>
        </div>
        <nav aria-label="Workspace" className="bg-accent text-white">
          <div className="mx-auto flex max-w-6xl items-stretch justify-between px-4 sm:px-6">
            <ol className="flex min-w-0 items-stretch overflow-x-auto">
              <li>
                <Link href="/" className="flex h-10 items-center gap-1.5 whitespace-nowrap border-b-[3px] border-transparent px-3 text-[12px] font-semibold uppercase tracking-wide hover:bg-white/10" aria-label="Home">
                  <House className="size-4" /> <span className="hidden sm:inline">Home</span>
                </Link>
              </li>
              <li>
                <Link href="/workspace" aria-current={guided ? "page" : undefined} className={clsx("flex h-10 items-center gap-1.5 whitespace-nowrap border-b-[3px] px-3 text-[12px] font-semibold uppercase tracking-wide hover:bg-white/10", guided ? "border-saffron bg-white/10" : "border-transparent")}>
                  {!guided && <ArrowLeft className="size-4" />} Step by step
                </Link>
              </li>
              {DETAIL_TABS.map((t) => {
                const active = pathname.startsWith(t.href);
                return (
                  <li key={t.href} className={clsx(guided && "hidden lg:block")}>
                    <Link
                      href={t.href}
                      aria-current={active ? "page" : undefined}
                      className={clsx("flex h-10 items-center whitespace-nowrap border-b-[3px] px-3 text-[12px] font-semibold uppercase tracking-wide hover:bg-white/10", active ? "border-saffron bg-white/10" : "border-transparent")}
                    >
                      {t.label}
                    </Link>
                  </li>
                );
              })}
              {guided && (
                <li className="lg:hidden">
                  <Link href="/workspace/findings" className="flex h-10 items-center gap-1.5 whitespace-nowrap border-b-[3px] border-transparent px-3 text-[12px] font-semibold uppercase tracking-wide hover:bg-white/10">
                    <LayoutList className="size-4" /> All details
                  </Link>
                </li>
              )}
            </ol>
          </div>
        </nav>
      </header>

      <main id="main" className={clsx("mx-auto w-full flex-1 px-4 pb-28 pt-6 sm:px-6", guided ? "max-w-6xl sm:pt-8" : "max-w-7xl sm:pt-8")}>{children}</main>

      <footer className="border-t border-line bg-surface px-5 py-4 text-center text-[12px] text-ink-3">
        RejectLess is an independent tool, not a government service, and can&rsquo;t approve applications.
        {session.demoScenarioId && (
          <span className="ml-1 inline-flex items-center gap-1 text-external">
            <FlaskConical className="size-3" /> All data here is fictional.
          </span>
        )}
      </footer>

      {!assistantOpen && (
        <button
          onClick={() => openAssistant()}
          className="fixed bottom-24 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-sm bg-saffron px-5 text-[14px] font-bold text-white shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition-transform hover:-translate-y-0.5 sm:bottom-6 sm:right-6"
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
