"use client";

import "regenerator-runtime/runtime.js";
import type { DocSpec } from "./scenarios";
import { renderSpec, type TextRun } from "./render";

// Turns a rendered specimen into a real File that goes through the same upload
// pipeline as a user's document.

let devFontBytes: Promise<ArrayBuffer> | null = null;

async function toSearchablePdf(canvas: HTMLCanvasElement, runs: TextRun[]): Promise<Blob> {
  const [{ PDFDocument, StandardFonts }, fontkit] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit")]);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit.default);
  pdf.setTitle("RejectLess demo specimen (fictional)");
  pdf.setProducer("RejectLess demo sandbox");
  devFontBytes ??= fetch("/fonts/NotoSansDevanagari-Regular.ttf").then((r) => r.arrayBuffer());
  const dev = await pdf.embedFont(await devFontBytes, { subset: true });
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const s = 0.5; // canvas px → PDF points
  const W = canvas.width * s;
  const H = canvas.height * s;
  const page = pdf.addPage([W, H]);
  const png = await pdf.embedPng(await new Promise<ArrayBuffer>((res) => canvas.toBlob((b) => b!.arrayBuffer().then(res), "image/png")));
  page.drawImage(png, { x: 0, y: 0, width: W, height: H });
  // Invisible text layer, positioned over the printed text (like a scanner's OCR layer).
  for (const r of runs) {
    const font = /^[\x20-\x7e]*$/.test(r.text) ? helv : dev;
    page.drawText(r.text, { x: r.x * s, y: H - r.y * s, size: r.size * s, font, opacity: 0 });
  }
  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

async function toPhoto(canvas: HTMLCanvasElement, spec: DocSpec): Promise<Blob> {
  const g = spec.degrade ?? {};
  const margin = 0.07;
  const out = document.createElement("canvas");
  out.width = Math.round(canvas.width * (1 + margin * 2));
  out.height = Math.round(canvas.height * (1 + margin * 2));
  const ctx = out.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, out.width, out.height);
  grad.addColorStop(0, "#8f7f6b");
  grad.addColorStop(1, "#6f604f");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.save();
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate(((g.rotate ?? 0.8) * Math.PI) / 180);
  const filters = [];
  if (g.blur) filters.push(`blur(${g.blur}px)`);
  if (g.dark) filters.push(`brightness(${g.dark})`);
  ctx.filter = filters.join(" ") || "none";
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 24;
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  ctx.restore();
  if (g.glare) {
    // A bright reflection from a window or tube light, as on a phone photo of glossy paper.
    const cx = out.width * 0.62, cy = out.height * 0.3, r = Math.min(out.width, out.height) * 0.28 * g.glare;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    glow.addColorStop(0, "rgba(255,255,255,1)");
    glow.addColorStop(0.55, "rgba(255,255,255,0.95)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, out.width, out.height);
  }
  let final = out;
  if (g.crop) {
    // Cut off the left part of the document, as when a phone photo is framed badly.
    const cut = Math.round(out.width * g.crop);
    final = document.createElement("canvas");
    final.width = out.width - cut;
    final.height = Math.round(out.height * 0.92);
    final.getContext("2d")!.drawImage(out, -cut, -Math.round(out.height * 0.08));
  }
  return new Promise((res) => final.toBlob((b) => res(b!), "image/jpeg", 0.85));
}

export async function specToFile(spec: DocSpec): Promise<File> {
  const { canvas, runs } = await renderSpec(spec);
  const blob = spec.format === "pdf" ? await toSearchablePdf(canvas, runs) : await toPhoto(canvas, spec);
  return new File([blob], spec.fileName, { type: blob.type });
}

export async function specPreviewUrl(spec: DocSpec): Promise<string> {
  const { canvas } = await renderSpec(spec);
  return canvas.toDataURL("image/jpeg", 0.7);
}
