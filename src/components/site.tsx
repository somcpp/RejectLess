"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { TopBar } from "./gov";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 text-ink ${className}`} aria-label="RejectLess home">
      <svg viewBox="0 0 36 36" className="size-10 shrink-0" aria-hidden>
        <rect x="1" y="1" width="34" height="34" rx="3" fill="var(--accent)" />
        <path d="M10 18.5l5.5 5.5L26 13" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="1" y="30" width="34" height="5" fill="var(--saffron)" />
      </svg>
      <span className="leading-tight">
        <span className="block text-[18px] font-bold tracking-tight text-accent">RejectLess</span>
        <span className="font-dev block text-[12px] text-ink-2">आवेदन तैयारी जाँच · Application readiness check</span>
      </span>
    </Link>
  );
}

/** White masthead under the utility bar: identity on the left, a plain "independent" notice on the right. */
export function Masthead({ right }: { right?: React.ReactNode }) {
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <Logo />
        {right ?? (
          <p className="hidden max-w-[260px] text-right text-[12px] leading-snug text-ink-3 md:block">
            An independent preparation tool. <span className="font-semibold text-ink-2">Not a government website</span> — it never submits applications.
          </p>
        )}
      </div>
    </div>
  );
}

const NAV = [
  { href: "/", label: "Home", labelHi: "मुख्य पृष्ठ" },
  { href: "/apply", label: "Applications", labelHi: "आवेदन" },
  { href: "/demo", label: "Demo", labelHi: "डेमो" },
  { href: "/about", label: "About & sources", labelHi: "परिचय" },
  { href: "/privacy", label: "Privacy", labelHi: "गोपनीयता" },
];

/** Navy navigation bar with the saffron call-to-action, as on ministry portals. */
export function NavBar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="bg-accent text-white">
      <div className="mx-auto flex max-w-6xl items-stretch justify-between px-4 sm:px-6">
        <ul className="flex min-w-0 items-stretch overflow-x-auto">
          {NAV.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx("flex h-11 items-center whitespace-nowrap border-b-[3px] px-3 text-[13px] font-semibold uppercase tracking-wide hover:bg-white/10 sm:px-4", active ? "border-saffron bg-white/10" : "border-transparent")}
                >
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <Link href="/start" className="my-1.5 ml-3 inline-flex shrink-0 items-center rounded-sm bg-saffron px-4 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-saffron-hover">
          Get started
        </Link>
      </div>
    </nav>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 shadow-[0_2px_6px_rgba(0,0,0,0.12)]">
      <TopBar />
      <Masthead />
      <NavBar />
    </header>
  );
}

const UPDATED = "2 November 2026";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-navy-deep text-[13px] text-white/80">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <p className="text-[15px] font-bold text-white">RejectLess</p>
          <p className="mt-2 leading-relaxed">
            An independent application-readiness checker. It is <span className="font-semibold text-white">not a government service</span>: it never submits applications, verifies against government databases or promises approval.
          </p>
        </div>
        <FooterCol title="Applications" links={[["/apply", "All applications"], ["/start", "Start a check"], ["/demo", "Demo with fictional data"]]} />
        <FooterCol title="Website policies" links={[["/privacy", "Privacy policy"], ["/about#terms", "Terms of use"], ["/about#methodology", "Sources & methodology"], ["/privacy#accessibility", "Accessibility statement"]]} />
        <FooterCol
          title="Official portals"
          external
          links={[
            ["https://unifiedportal-mem.epfindia.gov.in/memberinterface/", "EPFO Member e-Sewa"],
            ["https://scholarships.gov.in/", "National Scholarship Portal"],
            ["https://www.digilocker.gov.in/", "DigiLocker"],
            ["https://www.india.gov.in/", "National Portal of India"],
          ]}
        />
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-[12px] text-white/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Content owned and maintained by the RejectLess project. Rules cite their sources and are marked “Verify” when the official text could not be confirmed.</p>
          <p className="shrink-0">Last updated: {UPDATED}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links, external }: { title: string; links: [string, string][]; external?: boolean }) {
  return (
    <div>
      <p className="border-b border-saffron pb-1.5 text-[14px] font-bold uppercase tracking-wide text-white">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map(([href, label]) =>
          external ? (
            <li key={href}><a href={href} target="_blank" rel="noreferrer" className="hover:text-white hover:underline">{label}</a></li>
          ) : (
            <li key={href}><Link href={href} className="hover:text-white hover:underline">{label}</Link></li>
          ),
        )}
      </ul>
    </div>
  );
}
