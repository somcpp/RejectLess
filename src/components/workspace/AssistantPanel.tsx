"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { ArrowLeft, BookOpen, ChevronDown, Cpu, FileSearch, ScanLine, Search, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { SchemeFinder } from "@/components/assistant/SchemeFinder";
import { RejectionDecoder } from "@/components/assistant/RejectionDecoder";
import { DocumentScanner } from "@/components/scanner/DocumentScanner";
import { addFiles } from "@/lib/actions";
import { goalForVariant } from "@/knowledge/onboarding";
import { redact } from "@/lib/assistant/assistant";
import { Button, Spinner } from "@/components/ui";
import { useActiveSession } from "@/lib/hooks";
import { useUi } from "@/lib/store/ui";
import { useSession } from "@/lib/store/session";
import { aiStatus, answerLocally, answerWithAi, buildPayload, type AiPayload, type AssistantAnswer } from "@/lib/assistant/assistant";
import { chunkSources } from "@/lib/assistant/kb";

interface Msg {
  role: "user" | "assistant";
  text: string;
  answer?: AssistantAnswer;
  sent?: AiPayload;
  redacted?: number;
}

/** Minimal, safe rendering of **bold**, line breaks and numbered lists (no HTML injection). */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => (part.startsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : <Fragment key={j}>{part}</Fragment>))}
        </Fragment>
      ))}
    </>
  );
}

export function AssistantPanel() {
  const { assistantOpen, assistantFindingKey, closeAssistant } = useUi();
  const { session, latestRun } = useActiveSession();
  const consent = useSession((s) => s.consent);
  const setConsent = useSession((s) => s.setConsent);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<{ enabled: boolean; model?: string }>({ enabled: false });
  const [askConsent, setAskConsent] = useState(false);
  const [tool, setTool] = useState<"finder" | "decoder" | "scanner">();
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const startSession = useSession((s) => s.startSession);
  const focus = latestRun?.findings.find((f) => f.key === assistantFindingKey);
  const aiOn = !!consent.ai && ai.enabled;

  useEffect(() => {
    if (assistantOpen) void aiStatus().then(setAi);
  }, [assistantOpen]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  if (!assistantOpen || !session) return null;

  const suggestions = focus
    ? ["Why is this a problem?", "How do I fix this?", "Which document needs to change?", "Where is the official procedure?"]
    : latestRun
      ? ["What should I do next?", "What does 'External verification' mean?", "Will TDS be deducted?", "What changed in the 2026 EPF rules?"]
      : ["What documents do I need?", "Is my data sent anywhere?", "What changed in the 2026 EPF rules?"];

  async function ask(q: string) {
    if (!q.trim() || busy || !session) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      if (aiOn) {
        const { payload, chunks, redactedCount } = buildPayload(q, session, focus?.key);
        try {
          const answer = await answerWithAi(payload, chunks);
          setMsgs((m) => [...m, { role: "assistant", text: answer.text, answer, sent: payload, redacted: redactedCount }]);
        } catch (e) {
          const local = answerLocally(q, session, focus?.key);
          setMsgs((m) => [...m, { role: "assistant", text: local.text, answer: { ...local, note: `${(e as Error).message} Showing the offline answer.` } }]);
        }
      } else {
        const local = answerLocally(q, session, focus?.key);
        setMsgs((m) => [...m, { role: "assistant", text: local.text, answer: local }]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/25" onClick={closeAssistant}>
      <aside
        role="dialog"
        aria-label="Ask about your application"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-[460px] flex-col bg-surface shadow-2xl"
      >
        <header className="border-b border-line px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Ask about your application</p>
              <p className="text-[12px] text-ink-3">Answers come from RejectLess&rsquo;s sources and your findings. It cannot see your documents.</p>
            </div>
            <button onClick={closeAssistant} className="rounded-lg p-1.5 hover:bg-black/[0.05]" aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
          <div className="mt-3 flex rounded-lg border border-line p-0.5 text-[13px]" role="radiogroup" aria-label="Answer mode">
            <button
              role="radio"
              aria-checked={!aiOn}
              onClick={() => setConsent({ ai: null })}
              className={clsx("flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5", !aiOn ? "bg-ink text-white" : "text-ink-2")}
            >
              <Cpu className="size-3.5" /> Offline
            </button>
            <button
              role="radio"
              aria-checked={aiOn}
              disabled={!ai.enabled}
              onClick={() => (consent.ai ? undefined : setAskConsent(true))}
              title={ai.enabled ? undefined : "AI answers are not configured on this server (no GROQ_API_KEY)."}
              className={clsx("flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 disabled:opacity-40", aiOn ? "bg-ink text-white" : "text-ink-2")}
            >
              <Sparkles className="size-3.5" /> AI reasoning
            </button>
          </div>
          {!ai.enabled && <p className="mt-1.5 text-[11px] text-ink-3">AI mode is unavailable on this deployment. Offline answers still use the same verified sources.</p>}
          {askConsent && (
            <div className="mt-3 rounded-lg border border-external/25 bg-external-soft p-3 text-[13px] text-[#24406a]">
              <p className="font-medium">Turn on AI reasoning?</p>
              <p className="mt-1">Your questions will be answered by {ai.model ?? "an open model"} hosted by Groq. RejectLess sends:</p>
              <ul className="mt-1 list-disc pl-5">
                <li>your question, with numbers, dates and your names removed</li>
                <li>the application type and short summaries of findings (no names, numbers or dates)</li>
                <li>the relevant passages from RejectLess&rsquo;s knowledge base</li>
              </ul>
              <p className="mt-1">Never documents, images or identifiers. You can switch back to offline at any time.</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => (setConsent({ ai: new Date().toISOString() }), setAskConsent(false))}>Turn on</Button>
                <Button size="sm" variant="ghost" onClick={() => setAskConsent(false)}>Cancel</Button>
              </div>
            </div>
          )}
          {focus && (
            <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-[12px] text-ink-2">
              About: <span className="font-medium">{focus.title}</span>
            </p>
          )}
        </header>

        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {tool && tool !== "scanner" ? (
            <div>
              <button onClick={() => setTool(undefined)} className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-accent"><ArrowLeft className="size-4" /> Back to questions</button>
              <p className="mb-3 text-[16px] font-bold text-accent">{tool === "finder" ? "Which schemes could I apply for?" : "Decode a rejection notice"}</p>
              {tool === "finder" && (
                <SchemeFinder
                  onPick={(appId, variantId) => {
                    if (session.appId === appId && session.variantId === variantId) { setTool(undefined); closeAssistant(); return; }
                    if (!window.confirm("Start a new check for this scheme? The current one will be replaced in this browser.")) return;
                    const goal = goalForVariant(appId, variantId);
                    startSession(appId, variantId, undefined, { ...(session.profile ?? { role: "helper", state: "" }), goal: goal?.id ?? "" });
                    closeAssistant();
                    router.push("/workspace");
                  }}
                />
              )}
              {tool === "decoder" && <RejectionDecoder onAskAi={(q) => { setTool(undefined); void ask(redact(q, session).text); }} />}
            </div>
          ) : null}
          {!tool && msgs.length === 0 && (
            <div className="mb-4 grid gap-2">
              <p className="text-[13px] text-ink-3">Tools</p>
              {[
                { id: "scanner" as const, Icon: ScanLine, title: "Scan a document", sub: "Camera scanner: finds the page, straightens it, cleans it up" },
                { id: "finder" as const, Icon: Search, title: "Which schemes could I apply for?", sub: "A few questions → schemes RejectLess can screen you for" },
                { id: "decoder" as const, Icon: FileSearch, title: "Decode a rejection notice", sub: "Upload the letter; get the reason and the fix in English / हिंदी" },
              ].map((t) => (
                <button key={t.id} onClick={() => setTool(t.id)} className="flex items-center gap-3 border border-line bg-surface px-3 py-2.5 text-left hover:border-accent">
                  <span className="flex size-9 shrink-0 items-center justify-center bg-accent-soft text-accent"><t.Icon className="size-5" /></span>
                  <span className="min-w-0"><span className="block text-[14px] font-semibold">{t.title}</span><span className="block text-[12px] text-ink-3">{t.sub}</span></span>
                </button>
              ))}
            </div>
          )}
          {!tool && msgs.length === 0 && (
            <div className="space-y-2">
              <p className="text-[13px] text-ink-3">Try asking:</p>
              {suggestions.map((s) => (
                <button key={s} onClick={() => ask(s)} className="block w-full rounded-lg border border-line px-3 py-2 text-left text-[14px] hover:border-line-strong hover:bg-surface-2">
                  {s}
                </button>
              ))}
            </div>
          )}
          {!tool && msgs.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="ml-10 rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-[14px] text-white">
                {m.text}
              </div>
            ) : (
              <AssistantBubble key={i} msg={m} onFollowUp={ask} />
            ),
          )}
          {busy && (
            <div className="flex items-center gap-2 text-[13px] text-ink-3">
              <Spinner /> {aiOn ? "Reasoning over your findings…" : "Looking it up…"}
            </div>
          )}
        </div>

        <form
          className="flex gap-2 border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={focus ? "Ask about this finding…" : "Ask a question… (English or हिंदी)"}
            className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong px-3 text-[14px]"
            aria-label="Your question"
          />
          <Button type="submit" className="h-11" disabled={busy || !input.trim()} aria-label="Send">
            <Send className="size-4" />
          </Button>
        </form>
      </aside>
      {tool === "scanner" && (
        <DocumentScanner
          title="Scan a document"
          onClose={() => setTool(undefined)}
          onCapture={(files) => {
            setTool(undefined);
            addFiles(files);
            setMsgs((m) => [...m, { role: "assistant", text: `Added ${files.length === 1 ? files[0].name : files.length + " pages"} to your documents. It is being read on your device — check the Documents step, then run the check again.`, answer: { text: "", citations: [], mode: "local", grounded: true } }]);
          }}
        />
      )}
    </div>
  );
}

function AssistantBubble({ msg, onFollowUp }: { msg: Msg; onFollowUp: (q: string) => void }) {
  const a = msg.answer!;
  const [showSent, setShowSent] = useState(false);
  const [openCite, setOpenCite] = useState<string>();
  let badge: ReactNode;
  if (a.mode === "ai")
    badge = a.grounded ? (
      <span className="inline-flex items-center gap-1 text-pass"><ShieldCheck className="size-3" /> AI · grounded in {a.citations.length} source{a.citations.length > 1 ? "s" : ""}</span>
    ) : (
      <span className="text-review">AI · no verified source cited — treat with caution</span>
    );
  else badge = <span className="inline-flex items-center gap-1 text-ink-3"><Cpu className="size-3" /> Offline · from the knowledge base</span>;

  return (
    <div className="mr-4 space-y-2">
      <div className="rounded-2xl rounded-bl-sm border border-line bg-surface-2 px-4 py-3 text-[14px] leading-relaxed">
        <Rich text={msg.text} />
      </div>
      <p className="text-[11px]">{badge}</p>
      {a.note && <p className="text-[12px] text-review">{a.note}</p>}
      {a.citations.length > 0 && (
        <div className="space-y-1">
          {a.citations.map((c) => (
            <div key={c.id} className="rounded-lg border border-line text-[12px]">
              <button className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left" onClick={() => setOpenCite(openCite === c.id ? undefined : c.id)}>
                <BookOpen className="size-3 shrink-0 text-ink-3" />
                <span className="flex-1">{c.title}</span>
                {c.confidence === "verify" && <span className="rounded bg-review-soft px-1 text-[10px] text-review">verify</span>}
                <ChevronDown className={clsx("size-3 transition-transform", openCite === c.id && "rotate-180")} />
              </button>
              {openCite === c.id && (
                <div className="border-t border-line px-2.5 py-2 text-ink-2">
                  <p>{c.text}</p>
                  <ul className="mt-1.5 space-y-0.5">
                    {chunkSources(c).map((s) => (
                      <li key={s!.id}>
                        <a href={s!.url} target={s!.url.startsWith("/") ? undefined : "_blank"} rel="noreferrer" className="text-accent hover:underline">
                          {s!.title}
                        </a>{" "}
                        <span className="text-ink-3">({s!.kind})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {a.followUps && a.followUps.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {a.followUps.map((f) => (
            <button key={f} onClick={() => onFollowUp(f)} className="rounded-full border border-line px-2.5 py-1 text-[12px] hover:bg-surface-2">
              {f}
            </button>
          ))}
        </div>
      )}
      {msg.sent && (
        <div className="text-[12px]">
          <button onClick={() => setShowSent(!showSent)} className="text-ink-3 underline-offset-2 hover:underline">
            {showSent ? "Hide" : "Show"} exactly what was sent{msg.redacted ? ` (${msg.redacted} item${msg.redacted > 1 ? "s" : ""} removed)` : ""}
          </button>
          {showSent && <pre className="mt-1 max-h-60 overflow-auto rounded-lg bg-ink p-3 text-[11px] leading-snug text-white/90">{JSON.stringify(msg.sent, null, 2)}</pre>}
        </div>
      )}
    </div>
  );
}
