import { REJECTION_REASONS, type RejectionReason } from "@/knowledge/rejections";
import type { TextLine } from "@/engine/types";

// Decoding a rejection notice: OCR/text in, matched reasons out. Deterministic — the AI
// assistant can explain further but never adds reasons of its own.

export interface Decoded {
  reason: RejectionReason;
  /** The lines of the notice that triggered the match (shown as evidence). */
  evidence: string[];
}

export function decodeRejection(text: string, appId?: string): Decoded[] {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const out: Decoded[] = [];
  for (const r of REJECTION_REASONS) {
    if (appId && !r.appIds.includes(appId)) continue;
    const evidence = lines.filter((l) => r.patterns.some((p) => p.test(l)));
    if (evidence.length) out.push({ reason: r, evidence: evidence.slice(0, 3) });
  }
  // Specific reasons first: more evidence lines, then app-specific before cross-app.
  return out.sort((a, b) => b.evidence.length - a.evidence.length || a.reason.appIds.length - b.reason.appIds.length);
}

/** Reads a notice (image or PDF) in the browser and returns its text. */
export async function readNotice(file: File): Promise<{ text: string; lines: TextLine[] }> {
  const { readPdf } = await import("@/lib/ingest/pdf");
  const { ocrCanvas } = await import("@/lib/ingest/ocr");
  const { fileToCanvas } = await import("@/lib/ingest/raster");
  let lines: TextLine[] = [];
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    const pdf = await readPdf(await file.arrayBuffer());
    lines = pdf.pages.flatMap((p) => p.lines);
    if (lines.map((l) => l.text).join("").length < 40) {
      lines = [];
      for (let i = 0; i < pdf.pages.length; i++) lines.push(...(await ocrCanvas(pdf.pages[i].canvas, i + 1)).lines);
    }
  } else {
    lines = (await ocrCanvas(await fileToCanvas(file), 1)).lines;
  }
  return { text: lines.map((l) => l.text).join("\n"), lines };
}
