"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Cpu, Database, Sparkles, Trash2 } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site";
import { btn, Button, Card, Eyebrow, Notice, Spinner } from "@/components/ui";
import { useActiveSession } from "@/lib/hooks";
import { useSession } from "@/lib/store/session";
import { DOC_TYPES } from "@/knowledge/documents";
import { aiStatus } from "@/lib/assistant/assistant";

function fmt(iso?: string | null) {
  return iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

export function PrivacyCentre() {
  const { session, hydrated, app, variant } = useActiveSession();
  const consent = useSession((s) => s.consent);
  const setConsent = useSession((s) => s.setConsent);
  const deleteSession = useSession((s) => s.deleteSession);
  const [deleted, setDeleted] = useState<{ previews: number; docs: number; fields: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<{ enabled: boolean; model?: string; provider?: string }>();
  useEffect(() => void aiStatus().then(setAi), []);

  async function onDelete() {
    if (!session) return;
    if (!window.confirm("Delete this session? Extracted details, page previews, findings and consent records will be removed from this browser. This cannot be undone.")) return;
    setBusy(true);
    const docs = session.documents.length;
    const fields = session.documents.reduce((s, d) => s + d.fields.length, 0);
    const r = await deleteSession();
    setDeleted({ previews: r.previewsDeleted, docs, fields });
    setBusy(false);
  }

  const fieldCount = session?.documents.reduce((s, d) => s + d.fields.length, 0) ?? 0;
  const ocrDocs = session?.documents.filter((d) => d.textMethod === "ocr").length ?? 0;

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <Eyebrow>Privacy Centre</Eyebrow>
        <h1 className="mt-2 text-[32px] font-semibold tracking-tight">What RejectLess holds about you — right now</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          This page reads the actual state stored in this browser. It is not a policy statement — it is your data.
        </p>

        {deleted && (
          <Notice tone="pass" className="mt-6">
            <p className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="size-4" /> Session deleted
            </p>
            <p className="mt-1">
              Removed from this browser: {deleted.docs} document record{deleted.docs === 1 ? "" : "s"}, {deleted.fields} extracted detail{deleted.fields === 1 ? "" : "s"}, {deleted.previews} page preview
              {deleted.previews === 1 ? "" : "s"}, all findings, history and consent records. The text-recognition engine was shut down and its memory released.
            </p>
            <p className="mt-1 text-[13px]">
              Not covered: copies you made yourself — for example a downloaded report PDF in your Downloads folder — and files you selected from your device, which were never copied.
            </p>
          </Notice>
        )}

        {!hydrated ? (
          <p className="mt-8 flex items-center gap-2 text-ink-3"><Spinner /> Reading this browser&rsquo;s storage…</p>
        ) : !session ? (
          !deleted && (
            <Card className="mt-8 p-6">
              <p className="font-medium">No active session in this browser</p>
              <p className="mt-1 text-ink-2">RejectLess holds no documents, extracted details or findings for you here.</p>
              <Link href="/apply" className={btn("primary", "md", "mt-4")}>Start a check</Link>
            </Card>
          )
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <Card className="p-5">
                <p className="font-semibold">Current session</p>
                <dl className="mt-3 grid grid-cols-[150px_1fr] gap-y-2 text-[14px]">
                  <dt className="text-ink-3">Reference</dt>
                  <dd className="tabular">{session.id}{session.demoScenarioId && " (demo · fictional data)"}</dd>
                  <dt className="text-ink-3">Application</dt>
                  <dd>{app?.name} · {variant?.name}</dd>
                  <dt className="text-ink-3">Started</dt>
                  <dd>{fmt(session.createdAt)}</dd>
                  <dt className="text-ink-3">Last activity</dt>
                  <dd>{fmt(session.lastActiveAt)}</dd>
                  <dt className="text-ink-3">Expires</dt>
                  <dd>{fmt(session.expiresAt)} <span className="text-ink-3">(24 h after last activity; removed when you next open RejectLess after that)</span></dd>
                </dl>
              </Card>

              <Card>
                <p className="flex items-center gap-2 border-b border-line px-5 py-4 font-semibold">
                  <Database className="size-4" /> Stored in this browser (IndexedDB)
                </p>
                <ul className="divide-y divide-line text-[14px]">
                  <li className="flex justify-between gap-4 px-5 py-3">
                    <span>Extracted details</span>
                    <span className="text-ink-2">{fieldCount} values from {session.documents.length} documents</span>
                  </li>
                  <li className="flex justify-between gap-4 px-5 py-3">
                    <span>Aadhaar number</span>
                    <span className="text-ink-2">last 4 digits only + format-check result</span>
                  </li>
                  <li className="flex justify-between gap-4 px-5 py-3">
                    <span>Page previews (for evidence)</span>
                    <span className="text-ink-2">{session.documents.reduce((s, d) => s + d.pageCount, 0)} small images</span>
                  </li>
                  <li className="flex justify-between gap-4 px-5 py-3">
                    <span>Original files</span>
                    <span className="text-pass">Not kept</span>
                  </li>
                  <li className="flex justify-between gap-4 px-5 py-3">
                    <span>Full recognised text</span>
                    <span className="text-ink-2">memory only, cleared when the tab closes</span>
                  </li>
                  <li className="flex justify-between gap-4 px-5 py-3">
                    <span>Details you typed</span>
                    <span className="text-ink-2">{Object.values(session.draft).filter(Boolean).length} values</span>
                  </li>
                  <li className="flex justify-between gap-4 px-5 py-3">
                    <span>Check runs & resolution history</span>
                    <span className="text-ink-2">{session.runs.length} runs · {Object.keys(session.resolutions).length} tracked findings</span>
                  </li>
                  <li className="flex justify-between gap-4 px-5 py-3">
                    <span>On RejectLess servers</span>
                    <span className="text-pass">Nothing — there is no document storage server</span>
                  </li>
                </ul>
              </Card>

              <Card>
                <p className="border-b border-line px-5 py-4 font-semibold">Documents processed</p>
                {session.documents.length === 0 ? (
                  <p className="px-5 py-4 text-[14px] text-ink-3">None yet.</p>
                ) : (
                  <ul className="divide-y divide-line text-[14px]">
                    {session.documents.map((d) => (
                      <li key={d.id} className="px-5 py-3">
                        <p className="font-medium">{DOC_TYPES[d.typeId].short} — <span className="font-normal text-ink-3">{d.fileName}</span></p>
                        <p className="text-[13px] text-ink-3">
                          {d.textMethod === "text-layer" ? "Digital PDF text read in browser" : d.textMethod === "ocr" ? "Text recognised in browser (Tesseract)" : d.status} · fields kept:{" "}
                          {d.fields.map((f) => f.key.replace(/_/g, " ")).join(", ") || "none"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-5">
                <p className="flex items-center gap-2 font-semibold"><Cpu className="size-4" /> Processing</p>
                <ul className="mt-3 space-y-2 text-[14px] text-ink-2">
                  <li>Mode: <span className="text-ink">on this device</span></li>
                  <li>Document consent: <span className="text-ink">{session.demoScenarioId ? "not needed (fictional demo data)" : consent.processing ? `given ${fmt(consent.processing)}` : "not given"}</span></li>
                  <li>Text-recognition engine: {ocrDocs ? "downloaded from jsDelivr CDN (no document data sent)" : "not used yet"}</li>
                </ul>
              </Card>
              <Card className="p-5">
                <p className="flex items-center gap-2 font-semibold"><Sparkles className="size-4" /> AI assistant</p>
                <ul className="mt-3 space-y-2 text-[14px] text-ink-2">
                  <li>Status: <span className="text-ink">{consent.ai ? `on since ${fmt(consent.ai)}` : "off — offline answers only"}</span></li>
                  <li>Provider: {ai?.enabled ? `${ai.provider} · ${ai.model}` : "not configured on this server"}</li>
                  <li>Sent when on: your question (names and numbers removed), finding summaries without personal values, knowledge-base passages.</li>
                  <li>Never sent: documents, images, names, dates of birth, identifiers.</li>
                </ul>
                {consent.ai && (
                  <Button size="sm" variant="secondary" className="mt-3" onClick={() => setConsent({ ai: null })}>
                    Turn AI off
                  </Button>
                )}
              </Card>
              <Card className="border-action/25 p-5">
                <p className="flex items-center gap-2 font-semibold"><Trash2 className="size-4" /> Delete session</p>
                <p className="mt-2 text-[14px] text-ink-2">Removes everything listed on this page from this browser, immediately.</p>
                <Button variant="danger" className="mt-4 w-full" onClick={onDelete} disabled={busy}>
                  {busy ? <Spinner /> : <Trash2 className="size-4" />} Delete everything now
                </Button>
              </Card>
            </div>
          </div>
        )}

        <section className="mt-12 max-w-3xl space-y-3 text-[14px] leading-relaxed text-ink-2" id="policy">
          <h2 className="text-[20px] font-semibold text-ink">How RejectLess handles data</h2>
          <p><strong className="text-ink">Purpose limitation.</strong> Documents are used only to prepare the application you selected. Only the fields that application needs are extracted.</p>
          <p><strong className="text-ink">No training.</strong> Your documents are never used to train any model. They never reach a server, including ours.</p>
          <p><strong className="text-ink">No analytics on personal data.</strong> RejectLess does not include analytics or tracking scripts. Server logs do not contain request bodies.</p>
          <p><strong className="text-ink">Honest deletion.</strong> Deleting a session removes data from this browser&rsquo;s storage immediately. Files you downloaded yourself must be deleted by you.</p>
        </section>

        <section className="mt-12 max-w-3xl space-y-3 text-[14px] leading-relaxed text-ink-2 scroll-mt-32" id="accessibility">
          <h2 className="text-[20px] font-semibold text-ink">Accessibility statement</h2>
          <p>RejectLess follows the conventions of the Guidelines for Indian Government Websites (GIGW) that help people with low vision, low literacy or screen readers, even though it is not a government site:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>A &ldquo;Skip to main content&rdquo; link is the first element reached by keyboard on every page.</li>
            <li>Text size can be increased with the A-/A/A+ control at the top of every page; the choice is remembered in this browser.</li>
            <li>Every step and result has a &ldquo;Listen&rdquo; button that reads the screen aloud using the browser&rsquo;s own voice. Nothing is sent anywhere.</li>
            <li>Step names and result groups are shown in English and Hindi. A full Hindi interface is planned.</li>
            <li>Pages use landmarks (banner, navigation, main, contentinfo), visible focus outlines and colour that is never the only signal.</li>
          </ul>
          <p>If something is hard to use, tell us at the address on the About page.</p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
