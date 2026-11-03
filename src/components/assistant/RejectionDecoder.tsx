"use client";

import { useRef, useState } from "react";
import { ExternalLink, FileUp, Languages, Search } from "lucide-react";
import { Button, Spinner } from "@/components/ui";
import { decodeRejection, readNotice, type Decoded } from "@/lib/rejection";
import { getRule } from "@/knowledge/rules";
import { verificationsFor } from "@/knowledge/verifications";
import { APPLICATIONS } from "@/knowledge/applications";
import { useActiveSession } from "@/lib/hooks";

/** Upload or paste a rejection notice; matched reasons are explained in English and Hindi with the fix. */
export function RejectionDecoder({ onAskAi }: { onAskAi?: (question: string) => void }) {
  const { session } = useActiveSession();
  const [appId, setAppId] = useState<string | undefined>(session?.appId);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string>();
  const [result, setResult] = useState<Decoded[]>();
  const [hindi, setHindi] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const verifications = appId ? verificationsFor(appId, session?.profile?.state) : [];

  async function onFile(f: File | undefined) {
    if (!f) return;
    setBusy("Reading the notice on your device…");
    try {
      const r = await readNotice(f);
      setText(r.text);
      setResult(decodeRejection(r.text, appId));
    } catch (e) {
      setText("");
      setResult([]);
      setBusy(undefined);
      alert((e as Error).message);
      return;
    }
    setBusy(undefined);
  }

  return (
    <div className="space-y-4 text-[14px]">
      <p className="text-ink-2">Upload the rejection letter, returned-claim message or notice (photo, screenshot or PDF) — or paste its text. It is read on this device and matched against known reasons.</p>
      <label className="block">
        <span className="font-semibold">Which application?</span>
        <select value={appId ?? ""} onChange={(e) => setAppId(e.target.value || undefined)} className="mt-1 h-10 w-full border border-line-strong bg-surface px-2">
          <option value="">Any</option>
          {APPLICATIONS.filter((a) => a.status === "available").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => input.current?.click()} disabled={!!busy}><FileUp className="size-4" /> Upload the notice</Button>
        <input ref={input} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => (onFile(e.target.files?.[0]), (e.target.value = ""))} />
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="…or paste the text of the notice here" className="w-full border border-line-strong px-3 py-2" />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => setResult(decodeRejection(text, appId))} disabled={!text.trim() || !!busy}><Search className="size-4" /> Decode</Button>
        <button onClick={() => setHindi(!hindi)} className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent underline underline-offset-2"><Languages className="size-3.5" /> {hindi ? "English" : "हिंदी में"}</button>
        {busy && <span className="inline-flex items-center gap-2 text-ink-3"><Spinner /> {busy}</span>}
      </div>

      {result && result.length === 0 && (
        <div className="border border-line bg-surface-2 p-4">
          <p className="font-semibold">No known rejection reason matched.</p>
          <p className="mt-1 text-ink-2">Either the notice uses wording we have not seen, or the problem is specific to your case. The text was read but nothing matched — it was not sent anywhere.</p>
          {onAskAi && text.trim() && (
            <Button size="sm" className="mt-3" onClick={() => onAskAi(`My ${appId ?? "application"} was rejected with this message: "${text.slice(0, 400)}". What does it mean and what should I do?`)}>
              Ask the assistant (names and numbers are removed first)
            </Button>
          )}
        </div>
      )}

      {result && result.length > 0 && (
        <ol className="space-y-3">
          {result.map(({ reason, evidence }, i) => (
            <li key={reason.id} className="gov-panel">
              <div className="gov-panel-head">{i + 1}. {hindi ? reason.titleHi : reason.title}</div>
              <div className="space-y-2 p-4">
                <p className="text-ink-2">{hindi ? reason.meaningHi : reason.meaning}</p>
                <p className="text-[12px] text-ink-3">Found in the notice: {evidence.map((e) => `“${e.slice(0, 90)}”`).join(" · ")}</p>
                <p className="font-semibold">{hindi ? "क्या करें" : "What to do"}</p>
                <ol className="list-decimal space-y-1 pl-5 text-ink-2">
                  {reason.steps.map((s) => <li key={s}>{s}</li>)}
                </ol>
                {reason.verifyIds?.length ? (
                  <ul className="space-y-1 text-[13px]">
                    {reason.verifyIds.map((vid) => {
                      const v = verifications.find((x) => x.id === vid);
                      return v ? (
                        <li key={vid}>
                          <a href={v.portal.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent underline underline-offset-2">{v.title} <ExternalLink className="size-3.5" /></a> — {v.enter}
                        </li>
                      ) : null;
                    })}
                  </ul>
                ) : null}
                <p className="text-[12px] text-ink-3">
                  RejectLess checks for this as {reason.ruleIds.map((id) => `${getRule(id)?.title ?? id} (${id})`).join(", ")}. {reason.basis === "secondary" ? "Wording as commonly seen; confirm on the portal." : ""} Run a new check after fixing it.
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
