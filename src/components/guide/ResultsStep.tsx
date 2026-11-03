"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import {
  CheckCircle2, ChevronDown, CircleHelp, ClipboardPen, CloudDownload, Download, ExternalLink, FileSearch, Globe2, MessageCircleQuestion, Pencil, RotateCw, SearchCheck, TriangleAlert, Upload, Wrench,
} from "lucide-react";
import type { DocTypeId, Finding } from "@/engine/types";
import { Button, Spinner } from "@/components/ui";
import { AuthorityCard, ReadAloud } from "@/components/gov";
import { FindingDetail } from "@/components/workspace/FindingDetail";
import { DigiLockerMock } from "@/components/workspace/DigiLockerMock";
import { ActionBar } from "./common";
import { useActiveSession } from "@/lib/hooks";
import { useSession } from "@/lib/store/session";
import { useUi } from "@/lib/store/ui";
import { addFiles } from "@/lib/actions";
import { ACCEPTED } from "@/lib/ingest/pipeline";
import { resolvedIssues } from "@/lib/reportData";
import { BUCKETS, groupFindings, missingDocType, type Bucket } from "@/lib/triage";
import { DOC_TYPES } from "@/knowledge/documents";
import { DOC_SOURCES, getAuthority } from "@/knowledge/authorities";
import { CORRECTIONS, verificationsFor, type Verification } from "@/knowledge/verifications";
import { DRAFT_LABEL } from "@/engine/profile";
import { inputSignature } from "@/lib/useRunCheck";

const BUCKET_UI: Record<Bucket, { Icon: typeof CheckCircle2; fg: string; bg: string }> = {
  passed: { Icon: CheckCircle2, fg: "text-pass", bg: "bg-pass-soft" },
  documents: { Icon: FileSearch, fg: "text-external", bg: "bg-external-soft" },
  review: { Icon: Wrench, fg: "text-action", bg: "bg-action-soft" },
  verify: { Icon: SearchCheck, fg: "text-accent", bg: "bg-accent-soft" },
  external: { Icon: Globe2, fg: "text-external", bg: "bg-external-soft" },
};

export function ResultsStep() {
  const { session, app, latestRun } = useActiveSession();
  const setGuideStep = useSession((s) => s.setGuideStep);
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState<Bucket>();
  if (!session || !app || !latestRun) return null;

  const groups = groupFindings(latestRun.findings);
  const verifications = verificationsFor(app.id, session.profile?.state);
  const counts: Record<Bucket, number> = { passed: groups.passed.length, documents: groups.documents.length, review: groups.review.length, verify: verifications.length, external: groups.external.length };
  const todo = counts.documents + counts.review;
  const fixed = resolvedIssues(session);
  const changedSinceRun = !!latestRun.inputSig && latestRun.inputSig !== inputSignature(session);
  const auth = getAuthority(app.id);
  // Start on what needs doing; otherwise on what passed.
  const active: Bucket = chosen ?? (counts.documents ? "documents" : counts.review ? "review" : "passed");
  const meta = BUCKETS.find((b) => b.id === active)!;
  const Icon = BUCKET_UI[active].Icon;

  const headline = todo ? `${todo} thing${todo > 1 ? "s" : ""} to do before you apply` : "Everything we could check looks right";
  const sub = todo
    ? `${counts.documents ? `${counts.documents} document${counts.documents > 1 ? "s" : ""} or detail${counts.documents > 1 ? "s" : ""} needed` : ""}${counts.documents && counts.review ? ", " : ""}${counts.review ? `${counts.review} to review` : ""}. Work down the list on the left.`
    : `Confirm the external verifications and the portal items on the left before you apply. This isn't an approval — only ${app.shortName} can approve your application.`;

  async function download() {
    setBusy(true);
    try {
      const { downloadReport } = await import("@/lib/report");
      await downloadReport(useSession.getState().session!);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-6 border-l-4 border-saffron pl-4">
        <p className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-saffron">Your results · नतीजे</p>
        <h1 className="text-[26px] font-bold leading-tight text-accent sm:text-[30px]">{headline}</h1>
        <p className="mt-2 text-[16px] text-ink-2">{sub}</p>
        <ReadAloud className="mt-3" text={`${headline}. ${sub} ${BUCKETS.map((b) => `${b.label}: ${counts[b.id]}.`).join(" ")}`} />
      </div>

      {changedSinceRun && (
        <div className="mb-5 flex flex-col gap-3 border border-accent/30 bg-accent-soft/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[14px]">You changed something since this check. Check again to see if it&rsquo;s fixed.</p>
          <Button onClick={() => setGuideStep("check")}>
            <RotateCw className="size-4" /> Check again
          </Button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Left: the five sections, vertical */}
        <nav aria-label="Result sections" className="lg:sticky lg:top-40 lg:self-start">
          <ol className="gov-panel flex overflow-x-auto lg:block">
            {BUCKETS.map((b, i) => {
              const ui = BUCKET_UI[b.id];
              const on = active === b.id;
              const n = counts[b.id];
              return (
                <li key={b.id} className="min-w-[150px] flex-1 border-b border-line last:border-b-0 lg:min-w-0">
                  <button
                    onClick={() => setChosen(b.id)}
                    aria-current={on ? "true" : undefined}
                    className={clsx("flex w-full items-center gap-3 border-l-4 px-3 py-3 text-left transition-colors", on ? "border-saffron bg-accent-soft/60" : "border-transparent hover:bg-surface-2")}
                  >
                    <span className={clsx("flex size-9 shrink-0 items-center justify-center", ui.bg, ui.fg)}>
                      <ui.Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={clsx("block text-[14px] leading-tight", on ? "font-bold text-accent" : "font-semibold text-ink")}>{i + 1}. {b.label}</span>
                      <span className="font-dev block truncate text-[12px] text-ink-3">{b.labelHi}</span>
                    </span>
                    <span className={clsx("shrink-0 min-w-7 px-1.5 py-0.5 text-center text-[13px] font-bold tabular", n ? `${ui.bg} ${ui.fg}` : "bg-surface-2 text-ink-3")}>{n}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Right: the active section */}
        <section key={active} className="rise min-w-0" aria-live="polite">
          <div className="gov-panel-head">
            <Icon className="size-4" /> {meta.label} <span className="font-dev font-normal opacity-80">· {meta.labelHi}</span>
          </div>
          <div className="border border-t-0 border-line bg-surface-2 px-4 py-3 text-[14px] text-ink-2">{meta.blurb}</div>
          <div className="mt-4">
            {active === "passed" && <PassedByDocument findings={groups.passed} />}
            {active === "documents" && (counts.documents ? <ul className="space-y-3">{groups.documents.map((f, i) => <NeededCard key={f.key} f={f} index={i} />)}</ul> : <Empty text="Every document we need is here and readable." />)}
            {active === "review" && (counts.review ? <ul className="space-y-3">{groups.review.map((f, i) => <IssueCard key={f.key} f={f} index={i} />)}</ul> : <Empty text="No mismatches between your documents and details." />)}
            {active === "verify" && <VerificationList items={verifications} />}
            {active === "external" && <ExternalChecklist findings={groups.external} portal={app.officialPortal} />}
          </div>
        </section>
      </div>

      {fixed.length > 0 && (
        <Section icon={<CheckCircle2 className="size-4 text-pass" />} title={`Fixed since your first check (${fixed.length})`}>
          <ul className="space-y-1.5">
            {fixed.map(({ finding }) => (
              <li key={finding.key} className="flex items-center gap-2 text-[15px]">
                <CheckCircle2 className="size-4 text-pass" /> {finding.title}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {auth && (
        <div className="mt-6">
          <p className="mb-2 text-[13px] font-semibold text-ink-3">{todo ? "When everything above is done, apply here" : "Ready? Apply here"}</p>
          <AuthorityCard a={auth} compact />
        </div>
      )}

      <ActionBar>
        <Button size="lg" variant="ghost" onClick={() => setGuideStep("check")}>
          <RotateCw className="size-4" /> Check again
        </Button>
        <Button size="lg" variant="secondary" onClick={download} disabled={busy}>
          {busy ? <Spinner /> : <Download className="size-4" />} Download report
        </Button>
        {app.id === "nsp-csss" && (
          <a href="/forms/nsp" target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-sm border border-accent bg-surface px-5 text-[15px] font-semibold text-accent hover:bg-accent-soft" title="Opens in a new tab">
            <ClipboardPen className="size-4" /> Open scholarship application
          </a>
        )}
        {!todo && app.officialPortal && (
          <a href={app.officialPortal} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-saffron px-5 text-[15px] font-semibold text-white hover:bg-saffron-hover">
            Open the official portal <ExternalLink className="size-4" />
          </a>
        )}
      </ActionBar>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="border border-dashed border-line px-5 py-6 text-center text-[15px] text-ink-3">{text}</p>;
}

function Section({ icon, title, children, defaultOpen = false }: { icon: React.ReactNode; title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="gov-panel mt-4">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-5 py-4 text-left" aria-expanded={open}>
        {icon}
        <span className="flex-1 font-semibold">{title}</span>
        <ChevronDown className={clsx("size-4 text-ink-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="rise px-5 pb-5">{children}</div>}
    </section>
  );
}

// ---------------------------------------------------------------------------- 1. passed, by document

function PassedByDocument({ findings }: { findings: Finding[] }) {
  const docs = useSession((s) => s.session?.documents) ?? [];
  // "Aadhaar — Name, Date of birth": which document, which details.
  const byDoc = new Map<string, Set<string>>();
  const general: Finding[] = [];
  for (const f of findings) {
    if (!f.observations.length) {
      general.push(f);
      continue;
    }
    for (const o of f.observations) {
      const label = o.docLabel === DRAFT_LABEL ? "Details you typed" : o.docLabel;
      if (!byDoc.has(label)) byDoc.set(label, new Set());
      byDoc.get(label)!.add(o.fieldLabel);
    }
  }
  // Documents that were read but took part in no passed check yet.
  const quiet = docs.filter((d) => d.status !== "failed" && d.status !== "processing" && !byDoc.has(DOC_TYPES[d.typeId].short));
  if (!findings.length) return <Empty text="Nothing has passed yet — add your documents and check again." />;
  return (
    <div className="space-y-3">
      {Array.from(byDoc.entries()).map(([doc, fields]) => (
        <div key={doc} className="gov-panel px-5 py-4">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="size-4 text-pass" /> {doc} <span className="text-[13px] font-normal text-ink-3">— passed</span>
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {Array.from(fields).map((fl) => (
              <li key={fl} className="bg-pass-soft px-2.5 py-0.5 text-[13px] text-pass">{fl} ✓</li>
            ))}
          </ul>
        </div>
      ))}
      {quiet.map((d) => (
        <div key={d.id} className="gov-panel px-5 py-4 text-[14px] text-ink-2">
          <span className="font-semibold text-ink">{DOC_TYPES[d.typeId].short}</span> was read ({d.fields.length} details) but no comparison passed on it yet — see the other sections.
        </div>
      ))}
      {general.length > 0 && (
        <div className="gov-panel px-5 py-4">
          <p className="font-semibold">Other checks that passed</p>
          <ul className="mt-2 space-y-1.5 text-[14px] text-ink-2">
            {general.map((f) => (
              <li key={f.key} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-pass" />
                <span><span className="text-ink">{f.title}</span> — {f.summary}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------- 4. external verifications (knowledge)

function VerificationList({ items }: { items: Verification[] }) {
  const resolutions = useSession((s) => s.session?.resolutions);
  const setResolution = useSession((s) => s.setResolution);
  const done = items.filter((v) => resolutions?.[`verify:${v.id}`]?.state === "acknowledged").length;
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-ink-3">{done} of {items.length} done. These portals verify your details against the issuer&rsquo;s own records — RejectLess cannot do that for you.</p>
      {items.map((v, i) => {
        const key = `verify:${v.id}`;
        const on = resolutions?.[key]?.state === "acknowledged";
        return (
          <article key={v.id} className={clsx("gov-panel p-5", on && "opacity-70")}>
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center bg-accent text-[14px] font-bold text-white">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <h3 className={clsx("text-[17px] font-bold leading-snug", on && "line-through decoration-line-strong")}>{v.title}</h3>
                {v.titleHi && <p className="font-dev text-[13px] text-ink-3">{v.titleHi}</p>}
                <dl className="mt-3 space-y-2 text-[14px]">
                  <div className="flex gap-2"><dt className="w-24 shrink-0 font-semibold text-ink-3">Where</dt><dd><a href={v.portal.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent underline underline-offset-2">{v.portal.label} <ExternalLink className="size-3.5" /></a></dd></div>
                  <div className="flex gap-2"><dt className="w-24 shrink-0 font-semibold text-ink-3">Enter</dt><dd className="text-ink-2">{v.enter}</dd></div>
                  <div className="flex gap-2"><dt className="w-24 shrink-0 font-semibold text-ink-3">You should see</dt><dd className="text-ink-2">{v.expect}</dd></div>
                  <div className="flex gap-2"><dt className="w-24 shrink-0 font-semibold text-ink-3">Why</dt><dd className="text-ink-2">{v.why}</dd></div>
                </dl>
                {v.basis === "secondary" && <p className="mt-2 text-[12px] text-review">Portal or steps as commonly reported — confirm on the site.</p>}
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-[14px]">
                  <input type="checkbox" checked={!!on} onChange={(e) => setResolution(key, e.target.checked ? "acknowledged" : "open", e.target.checked ? `You verified: ${v.title}` : "Unticked.")} className="size-5 accent-[var(--accent)]" />
                  I checked this
                </label>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------- 5. confirm on the portal (engine "external" findings)

function ExternalChecklist({ findings, portal }: { findings: Finding[]; portal?: string }) {
  const resolutions = useSession((s) => s.session?.resolutions);
  const setResolution = useSession((s) => s.setResolution);
  const items = findings.flatMap((f) => (f.signals.length ? f.signals : [f.summary]).map((text, i) => ({ key: `${f.key}#${i}`, text, title: f.title })));
  const done = items.filter((it) => resolutions?.[it.key]?.state === "acknowledged").length;
  if (!items.length) return <Empty text="Nothing to confirm on the portal for this application." />;
  return (
    <div className="gov-panel px-5 py-4">
      <p className="text-[13px] text-ink-3">
        {done} of {items.length} confirmed by you. RejectLess cannot see these systems; ticking only records your own check.
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((it) => {
          const on = resolutions?.[it.key]?.state === "acknowledged";
          return (
            <li key={it.key}>
              <label className={clsx("flex cursor-pointer items-start gap-3 px-3 py-2.5 text-[15px] hover:bg-surface-2", on && "text-ink-3 line-through decoration-line-strong")}>
                <input
                  type="checkbox"
                  checked={!!on}
                  onChange={(e) => setResolution(it.key, e.target.checked ? "acknowledged" : "open", e.target.checked ? "You confirmed this on the official portal." : "Unticked.")}
                  className="mt-1 size-5 shrink-0 accent-[var(--accent)]"
                />
                <span>{it.text}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {portal && (
        <a href={portal} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-[14px] font-semibold text-accent underline underline-offset-2">
          Open the official portal to check <ExternalLink className="size-3.5" />
        </a>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------- 2. documents needed

function NeededCard({ f, index }: { f: Finding; index: number }) {
  const { session } = useActiveSession();
  const setGuideStep = useSession((s) => s.setGuideStep);
  const unskipDoc = useSession((s) => s.unskipDoc);
  const openAssistant = useUi((s) => s.openAssistant);
  const [dl, setDl] = useState(false);
  const [steps, setSteps] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const missingType = missingDocType(f) as DocTypeId | undefined;
  const quality = f.ruleId === "GEN-QUALITY";
  const badDoc = quality ? session?.documents.find((d) => d.id === f.affectedDocIds[0]) : undefined;
  const docType = missingType ?? badDoc?.typeId;
  const def = docType ? DOC_TYPES[docType] : undefined;
  const src = docType ? DOC_SOURCES[docType] : undefined;
  const kind = quality ? "Re-upload needed" : def ? "Document needed" : "Detail needed";
  const title = quality && def ? `A clearer copy of your ${def.short}` : def ? `Your ${def.short}` : `Your ${f.missingInput}`;

  return (
    <li className="rise gov-panel p-5" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex items-start gap-3">
        <FileSearch className="mt-1 size-5 shrink-0 text-external" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold uppercase tracking-wide text-ink-3">{kind}</p>
          <h2 className="mt-0.5 text-[18px] font-bold leading-snug">{title}</h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{f.summary}</p>

          {quality && (
            <div className="mt-3 bg-surface-2 px-4 py-3 text-[15px] leading-relaxed">
              <p className="font-semibold">How to take a photo that reads well</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-[14px] text-ink-2">
                <li>Lay the document flat in daylight; no shadow of your hand or phone.</li>
                <li>Keep all four edges inside the frame — don&rsquo;t cut the corners.</li>
                <li>Hold still until the camera focuses; text should look sharp when you zoom in.</li>
                <li>JPG, PNG or PDF up to 10 MB. The official digital PDF is always better than a photo.</li>
              </ol>
            </div>
          )}

          {src && (
            <div className="mt-3 bg-surface-2 px-4 py-3 text-[15px] leading-relaxed">
              <p><span className="font-semibold">Where to get it: </span>{src.where}</p>
              {src.link && (
                <a href={src.link.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[14px] font-semibold text-accent underline underline-offset-2">
                  {src.link.label} <ExternalLink className="size-3.5" />
                </a>
              )}
              <button onClick={() => setSteps(!steps)} className="mt-1 block text-[14px] text-ink-3 hover:text-ink" aria-expanded={steps}>
                {steps ? "Hide steps" : "What to fill in to get it"}
              </button>
              {steps && (
                <ol className="rise mt-2 space-y-1 text-[14px] text-ink-2">
                  {src.steps.map((s, i) => (
                    <li key={i} className="flex gap-2"><span className="font-semibold text-ink">{i + 1}.</span> {s}</li>
                  ))}
                </ol>
              )}
            </div>
          )}
          {!def && (
            <p className="mt-3 bg-surface-2 px-4 py-3 text-[15px] leading-relaxed">
              <span className="font-semibold">What to do: </span>
              {f.recommendation}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {quality && badDoc && (
              <>
                <Button onClick={() => input.current?.click()} disabled={badDoc.status === "processing"}>
                  {badDoc.status === "processing" ? <Spinner /> : <Upload className="size-4" />} Upload a clearer {def?.short}
                </Button>
                <input ref={input} type="file" accept={ACCEPTED.join(",")} className="hidden" onChange={(e) => { if (e.target.files?.length) addFiles(Array.from(e.target.files), { replaceId: badDoc.id }); e.target.value = ""; }} />
              </>
            )}
            {docType && src?.digilocker !== "no" && (
              <Button variant={quality ? "secondary" : "primary"} onClick={() => setDl(true)}>
                <CloudDownload className="size-4" /> Get from DigiLocker
              </Button>
            )}
            {missingType && (
              <Button variant={src?.digilocker !== "no" ? "secondary" : "primary"} onClick={() => { unskipDoc(missingType); setGuideStep("documents"); }}>
                <Upload className="size-4" /> Upload it now
              </Button>
            )}
            {!docType && (
              <>
                <Button onClick={() => setGuideStep("details")}>
                  <Pencil className="size-4" /> Type it in
                </Button>
                <Button variant="secondary" onClick={() => setGuideStep("documents")}>
                  <Upload className="size-4" /> Add a document
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => openAssistant(f.key)}>
              <MessageCircleQuestion className="size-4" /> Explain this
            </Button>
          </div>
        </div>
      </div>
      {dl && docType && <DigiLockerMock docType={docType} onClose={() => setDl(false)} />}
    </li>
  );
}

// ---------------------------------------------------------------------------- 3. needs review

/** The most useful next action for a finding, in the user's terms. */
function primaryAction(f: Finding) {
  // The engine already knows when the typed details are the odd one out.
  if (f.abstract.includes("application draft is the odd one out")) return { kind: "details" as const };
  // Eligibility results (waiting periods, TDS, limits) are facts to act on, not document errors.
  if (!["consistency", "identity", "quality", "format", "completeness"].includes(f.category)) return undefined;
  const first = f.observations[0];
  const differing = f.observations.find((o) => o.value !== first?.value);
  if (differing && differing.docLabel === DRAFT_LABEL) return { kind: "details" as const };
  const target = (differing?.docId ? differing : f.observations.find((o) => o.docId)) ?? undefined;
  if (target?.docId) return { kind: "replace" as const, docId: target.docId, label: target.docLabel };
  if (f.observations.some((o) => o.docLabel === DRAFT_LABEL)) return { kind: "details" as const };
  return undefined;
}

function IssueCard({ f, index }: { f: Finding; index: number }) {
  const { session } = useActiveSession();
  const setGuideStep = useSession((s) => s.setGuideStep);
  const setResolution = useSession((s) => s.setResolution);
  const openAssistant = useUi((s) => s.openAssistant);
  const [why, setWhy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const res = session?.resolutions[f.key];
  const act = primaryAction(f);
  const replacing = act?.kind === "replace" ? session?.documents.find((d) => d.id === act.docId) : undefined;
  const isAction = f.status === "action";
  // Where each involved document can be corrected.
  const involved = Array.from(new Set(f.affectedDocIds.map((id) => session?.documents.find((d) => d.id === id)?.typeId).filter(Boolean))) as DocTypeId[];
  const fixes = involved.map((t) => ({ t, c: CORRECTIONS[t] })).filter((x) => x.c);
  // "Aadhaar p.1 vs Bank passbook p.2": say exactly where each value was seen.
  const where = f.observations.filter((o) => o.docId).map((o) => `${o.docLabel}${o.page ? ` (page ${o.page})` : ""}: ${o.value}`);

  return (
    <li className="rise gov-panel p-5" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex items-start gap-3">
        {isAction ? <TriangleAlert className="mt-1 size-5 shrink-0 text-action" /> : <CircleHelp className="mt-1 size-5 shrink-0 text-review" />}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold uppercase tracking-wide text-ink-3">{isAction ? "Mismatch — fix before applying" : "Worth checking"}</p>
          <h2 className="mt-0.5 text-[18px] font-bold leading-snug">{f.title}</h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{f.summary}</p>
          {where.length > 1 && (
            <ul className="mt-2 space-y-0.5 text-[14px] text-ink-2">
              {where.map((w) => (
                <li key={w} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 bg-action" />{w}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 bg-surface-2 px-4 py-3 text-[15px] leading-relaxed">
            <span className="font-semibold">What to do: </span>
            {f.recommendation}
          </p>
          {fixes.length > 0 && (
            <div className="mt-2 space-y-1.5 text-[14px]">
              {fixes.map(({ t, c }) => (
                <p key={t} className="text-ink-2">
                  <span className="font-semibold text-ink">Fix it on your {DOC_TYPES[t].short}: </span>
                  {c!.url ? (
                    <a href={c!.url} target="_blank" rel="noreferrer" className="font-semibold text-accent underline underline-offset-2">{c!.label}</a>
                  ) : (
                    <span className="font-semibold">{c!.label}</span>
                  )}
                  {" — "}{c!.how}
                </p>
              ))}
            </div>
          )}
          {res?.state === "confirmed_correct" && <p className="mt-2 text-[13px] text-pass">You confirmed this is fine.</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            {act?.kind === "replace" && (
              <>
                <Button onClick={() => input.current?.click()} disabled={replacing?.status === "processing"}>
                  {replacing?.status === "processing" ? <Spinner /> : <Upload className="size-4" />} Upload corrected {act.label}
                </Button>
                <input ref={input} type="file" accept={ACCEPTED.join(",")} className="hidden" onChange={(e) => { if (e.target.files?.length) addFiles(Array.from(e.target.files), { replaceId: act.docId }); e.target.value = ""; }} />
              </>
            )}
            {act?.kind === "details" && (
              <Button onClick={() => setGuideStep("details")}>
                <Pencil className="size-4" /> Edit my details
              </Button>
            )}
            <Button variant="secondary" onClick={() => openAssistant(f.key)}>
              <MessageCircleQuestion className="size-4" /> Explain this
            </Button>
            <Button variant="ghost" onClick={() => setWhy(!why)} aria-expanded={why}>
              {why ? "Hide evidence" : "Show evidence"}
            </Button>
            {!isAction && res?.state !== "confirmed_correct" && (
              <Button variant="ghost" onClick={() => setResolution(f.key, "confirmed_correct", "You confirmed the values are correct as they are.")}>
                It&rsquo;s fine
              </Button>
            )}
          </div>
        </div>
      </div>
      {why && (
        <div className="rise mt-5 border-t border-line pt-5">
          <FindingDetail finding={f} resolution={res} />
        </div>
      )}
    </li>
  );
}
