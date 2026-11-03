"use client";

import type { TextLine } from "@/engine/types";

// Tesseract runs entirely in the browser (WebAssembly). The engine and the
// English + Hindi language models are downloaded once from the jsDelivr CDN;
// document images are never uploaded anywhere.

type TWorker = Awaited<ReturnType<typeof import("tesseract.js")["createWorker"]>>;
let workerPromise: Promise<TWorker> | null = null;
let progressListener: ((p: { status: string; progress: number }) => void) | null = null;

export function onOcrProgress(fn: typeof progressListener) {
  progressListener = fn;
}

async function getWorker(): Promise<TWorker> {
  if (!workerPromise) {
    workerPromise = import("tesseract.js").then(async ({ createWorker }) => {
      const w = await createWorker(["eng", "hin"], 1, {
        logger: (m: { status: string; progress: number }) => progressListener?.(m),
      });
      // Sparse-text segmentation (PSM 11) suits ID cards and forms: in the default
      // auto mode Tesseract drops large isolated text such as a masked Aadhaar number.
      await w.setParameters({ tessedit_pageseg_mode: "11" as never });
      return w;
    });
    workerPromise.catch(() => {
      workerPromise = null;
    });
  }
  return workerPromise;
}

export async function ocrCanvas(canvas: HTMLCanvasElement, page: number): Promise<{ lines: TextLine[]; confidence: number }> {
  const worker = await getWorker();
  const { data } = await worker.recognize(canvas, {}, { blocks: true, text: true });
  const W = canvas.width;
  const H = canvas.height;
  const lines: TextLine[] = [];
  for (const block of data.blocks ?? []) {
    for (const para of block.paragraphs) {
      for (const line of para.lines) {
        const text = line.text.replace(/\s+/g, " ").trim();
        if (!text) continue;
        lines.push({
          text,
          page,
          confidence: Math.max(0, Math.min(1, line.confidence / 100)),
          bbox: { x: line.bbox.x0 / W, y: line.bbox.y0 / H, w: (line.bbox.x1 - line.bbox.x0) / W, h: (line.bbox.y1 - line.bbox.y0) / H },
        });
      }
    }
  }
  // Weighted by text length: stray one-character "lines" (logos, rules, noise) would otherwise drag the average down.
  const weight = lines.reduce((s, l) => s + l.text.length, 0);
  const confidence = weight ? lines.reduce((s, l) => s + l.confidence * l.text.length, 0) / weight : 0;
  return { lines, confidence };
}

/** Frees the OCR engine's memory (called on session deletion). */
export async function terminateOcr() {
  if (!workerPromise) return;
  const w = await workerPromise.catch(() => null);
  workerPromise = null;
  await w?.terminate();
}
