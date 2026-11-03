"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Camera, Check, FileUp, Plus, Trash2, Wand2, X } from "lucide-react";
import { Button, Spinner } from "@/components/ui";
import { quadDelta, type Quad } from "@/engine/scan/geometry";
import { analyseFrame, capturePage, guidance, packagePages, type FrameReport } from "@/lib/scanner";

const MAX_PAGES = 4;

/**
 * Camera scanner: live edge detection with guidance, auto-capture when the page is steady and
 * sharp, perspective correction, "document" enhancement, up to four pages → JPEG or PDF.
 * Falls back to the file picker where no camera is available. Frames never leave the device.
 */
export function DocumentScanner({ title, onCapture, onClose }: { title: string; onCapture: (files: File[]) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const work = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const [report, setReport] = useState<FrameReport | null>(null);
  const [pages, setPages] = useState<HTMLCanvasElement[]>([]);
  const [enhance, setEnhance] = useState(true);
  const [auto, setAuto] = useState(true);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const steady = useRef<{ quad: Quad; n: number } | null>(null);
  const lastShot = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  // Camera on/off with the dialog.
  useEffect(() => {
    let stream: MediaStream | undefined;
    let stopped = false;
    (async () => {
      // Browsers expose the camera only on https:// or localhost. Over plain http on a phone
      // (e.g. http://192.168.1.5:3000) navigator.mediaDevices is undefined even with permission.
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError(`Live camera needs a secure address (https:// or localhost); this page is ${location.protocol}//${location.host}. Use “Take a photo” below — it opens your phone camera directly.`);
        return;
      }
      const attempts: MediaStreamConstraints[] = [
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
        { video: { facingMode: "environment" }, audio: false },
        { video: true, audio: false },
      ];
      let lastErr: unknown;
      for (const c of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(c);
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!stream) {
        const name = (lastErr as { name?: string })?.name ?? "";
        setError(
          name === "NotAllowedError"
            ? "Camera permission was refused. Allow it in the browser's site settings, or use “Take a photo” below."
            : name === "NotFoundError"
              ? "No camera was found on this device. Use “Take a photo” / “Use a photo instead”."
              : name === "NotReadableError"
                ? "Another app is using the camera. Close it and try again, or use “Take a photo” below."
                : `Camera could not start (${name || "unknown error"}). Use “Take a photo” below.`,
        );
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      if (video.current) {
        video.current.srcObject = stream;
        try {
          await video.current.play();
        } catch {
          /* autoplay can be blocked until a tap; the muted video still starts on the first interaction */
        }
      }
    })();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Analyse a few frames a second (setInterval, not rAF — see CLAUDE.md).
  useEffect(() => {
    const id = setInterval(() => {
      if (!video.current || !work.current) return;
      const r = analyseFrame(video.current, work.current);
      setReport(r);
      drawOverlay(r);
      // Auto-capture: the same quad for ~6 ticks with a sharp, glare-free frame.
      if (!r?.quad || !guidance(r).ok || !auto) {
        steady.current = null;
        return;
      }
      const prev = steady.current;
      steady.current = prev && quadDelta(prev.quad, r.quad) < 0.02 ? { quad: r.quad, n: prev.n + 1 } : { quad: r.quad, n: 1 };
      if (steady.current.n >= 6 && Date.now() - lastShot.current > 2500 && pages.length < MAX_PAGES) {
        steady.current = null;
        void shoot(r.quad);
      }
    }, 220);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, enhance, pages.length]);

  function drawOverlay(r: FrameReport | null) {
    const c = overlay.current, v = video.current;
    if (!c || !v) return;
    c.width = v.clientWidth;
    c.height = v.clientHeight;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    if (!r?.quad) return;
    const ok = guidance(r).ok;
    ctx.strokeStyle = ok ? "#1d7348" : "#d6621a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    r.quad.forEach((p, i) => (i ? ctx.lineTo(p.x * c.width, p.y * c.height) : ctx.moveTo(p.x * c.width, p.y * c.height)));
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = ok ? "rgba(29,115,72,0.12)" : "rgba(214,98,26,0.10)";
    ctx.fill();
  }

  async function shoot(quad: Quad | null) {
    if (!video.current || busy) return;
    setBusy(true);
    lastShot.current = Date.now();
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    try {
      const page = capturePage(video.current, quad, enhance);
      setPages((p) => [...p, page].slice(0, MAX_PAGES));
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!pages.length) return;
    setBusy(true);
    try {
      onCapture(await packagePages(pages, title.replace(/\W+/g, "-").toLowerCase()));
    } finally {
      setBusy(false);
    }
  }

  const g = guidance(report);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 sm:items-center sm:p-6" role="dialog" aria-modal aria-label={title}>
      <div className="flex max-h-[96vh] w-full max-w-2xl flex-col overflow-hidden bg-surface sm:rounded-sm">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Camera className="size-5 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{title}</p>
            <p className="text-[12px] text-ink-3">Finds the page, straightens it and cleans it up — all on this device.</p>
          </div>
          <button onClick={onClose} className="rounded-sm p-1.5 hover:bg-black/5" aria-label="Close"><X className="size-5" /></button>
        </header>

        <div className="relative bg-black">
          <video ref={video} playsInline muted className="block max-h-[52vh] w-full object-contain" />
          <canvas ref={overlay} className="pointer-events-none absolute inset-0 h-full w-full" />
          <canvas ref={work} className="hidden" />
          {flash && <div className="absolute inset-0 bg-white/80" />}
          <div className={clsx("absolute inset-x-0 top-0 flex items-center justify-center gap-2 px-3 py-2 text-center text-[14px] font-semibold text-white", error ? "bg-action/90" : g.ok ? "bg-pass/85" : "bg-ink/70")}>
            {g.ok && auto && !error ? <Spinner className="size-3.5" /> : null} {error ?? g.text}
          </div>
          {report && (
            <p className="absolute bottom-2 left-3 text-[11px] text-white/80">
              {report.quad ? `page ${Math.round(report.coverage * 100)}% of frame` : "no page"} · {report.glare > 0.02 ? "glare" : "no glare"} · {report.sharpness < 60 ? "soft" : "sharp"}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <Button onClick={() => shoot(report?.quad ?? null)} disabled={busy || !!error || pages.length >= MAX_PAGES}>
            <Camera className="size-4" /> Capture now
          </Button>
          <label className="inline-flex items-center gap-1.5 text-[13px]">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="size-4 accent-[var(--accent)]" /> Auto-capture when steady
          </label>
          <label className="inline-flex items-center gap-1.5 text-[13px]">
            <input type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} className="size-4 accent-[var(--accent)]" /> <Wand2 className="size-3.5" /> Clean up (document mode)
          </label>
          <button onClick={() => cameraInput.current?.click()} className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-accent underline underline-offset-2">
            <Camera className="size-3.5" /> Take a photo
          </button>
          <button onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent underline underline-offset-2">
            <FileUp className="size-3.5" /> Use a photo instead
          </button>
          {/* capture="environment" opens the phone's camera app even over plain http. */}
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { if (e.target.files?.length) onCapture(Array.from(e.target.files)); e.target.value = ""; }} />
          <input ref={fileInput} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { if (e.target.files?.length) onCapture(Array.from(e.target.files)); e.target.value = ""; }} />
        </div>

        <div className="flex items-center gap-3 overflow-x-auto px-4 py-3">
          {pages.map((p, i) => (
            <div key={i} className="relative shrink-0">
              <canvas ref={(el) => { if (el) { el.width = p.width; el.height = p.height; el.getContext("2d")!.drawImage(p, 0, 0); } }} className="h-24 w-auto border border-line bg-white" />
              <span className="absolute left-1 top-1 bg-ink px-1.5 text-[11px] font-semibold text-white">Page {i + 1}</span>
              <button onClick={() => setPages((ps) => ps.filter((_, k) => k !== i))} className="absolute right-1 top-1 bg-white/90 p-0.5" aria-label={`Remove page ${i + 1}`}><Trash2 className="size-3.5 text-action" /></button>
            </div>
          ))}
          {pages.length === 0 && <p className="text-[13px] text-ink-3">Captured pages appear here. Multi-page documents become one PDF (up to {MAX_PAGES} pages).</p>}
          {pages.length > 0 && pages.length < MAX_PAGES && <p className="inline-flex items-center gap-1 text-[12px] text-ink-3"><Plus className="size-3.5" /> add another page, or finish</p>}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-line px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={finish} disabled={!pages.length || busy}>
            {busy ? <Spinner /> : <Check className="size-4" />} Use {pages.length || ""} page{pages.length === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </div>
  );
}
