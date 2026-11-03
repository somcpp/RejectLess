"use client";

import type { DocTypeId, DocumentRecord, QualityReport, TextLine } from "@/engine/types";
import { classify, extractFields } from "@/engine/extract";
import { assess, measure } from "@/engine/quality";
import { readability } from "@/engine/readability";
import { applyDemoOverrides } from "@/lib/demoOverrides";
import { fileToCanvas, previewBlob, toGray } from "./raster";
import { ocrCanvas } from "./ocr";
import { readPdf } from "./pdf";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];

export type ProgressFn = (stage: string) => void;

export interface ProcessResult {
  record: Omit<DocumentRecord, "id" | "addedAt" | "version" | "synthetic" | "fileName" | "size">;
  previews: Blob[];
  lines: TextLine[];
}

/** Checks magic bytes so a renamed or malformed file cannot slip through. */
export async function validateFile(file: File): Promise<"pdf" | "image"> {
  if (file.size === 0) throw new Error("The file is empty.");
  if (file.size > MAX_FILE_BYTES) throw new Error(`The file is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB. Please upload a smaller scan.`);
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  if (isPdf) return "pdf";
  if (isJpeg || isPng) return "image";
  throw new Error("Unsupported file. Please upload a PDF, JPG or PNG.");
}

export async function processFile(file: File, forcedType: DocTypeId | undefined, progress: ProgressFn, hintType?: DocTypeId): Promise<ProcessResult> {
  const kind = await validateFile(file);
  const pages: { canvas: HTMLCanvasElement; lines: TextLine[] }[] = [];
  let method: "text-layer" | "ocr" = "text-layer";
  let ocrConfidence: number | undefined;

  if (kind === "pdf") {
    progress("Reading PDF");
    const pdf = await readPdf(await file.arrayBuffer());
    const textChars = pdf.pages.reduce((s, p) => s + p.lines.reduce((t, l) => t + l.text.length, 0), 0);
    if (textChars >= 40) {
      pdf.pages.forEach((p) => pages.push({ canvas: p.canvas, lines: p.lines }));
    } else {
      // Scanned PDF without a text layer — recognise the rendered pages.
      method = "ocr";
      for (let i = 0; i < pdf.pages.length; i++) {
        progress(`Recognising text on page ${i + 1}`);
        const r = await ocrCanvas(pdf.pages[i].canvas, i + 1);
        pages.push({ canvas: pdf.pages[i].canvas, lines: r.lines });
        ocrConfidence = r.confidence;
      }
    }
  } else {
    method = "ocr";
    progress("Loading image");
    const canvas = await fileToCanvas(file);
    progress("Recognising text (in your browser)");
    const r = await ocrCanvas(canvas, 1);
    pages.push({ canvas, lines: r.lines });
    ocrConfidence = r.confidence;
  }

  progress("Checking image quality");
  const quality: QualityReport = { checked: true, kind: method === "text-layer" ? "digital" : "image", metrics: {}, issues: [] };
  if (method === "ocr") {
    pages.forEach((p, i) => {
      const m = measure(toGray(p.canvas));
      if (i === 0) quality.metrics = { ...m };
      quality.issues.push(...assess(m, i + 1));
    });
    // The OCR average is kept as a metric only; whether text was readable is judged per field
    // (engine/readability.ts), so users never see a bare "confidence is low" message.
    if (ocrConfidence !== undefined) quality.metrics.ocrConfidence = Math.round(ocrConfidence * 100);
  }
  const allLines = pages.flatMap((p) => p.lines);
  if (!allLines.length) {
    quality.issues.push({ code: "no_text", page: 1, message: "No readable text was found on this document.", measured: "0 lines" });
  }

  progress("Identifying document");
  const cls = classify(allLines);
  // A hint (the checklist slot) is used only when detection can't tell what the document is.
  const typeId = forcedType ?? (cls.typeId !== "unknown" ? cls.typeId : (hintType ?? "unknown"));

  progress("Extracting details");
  const extracted = extractFields(typeId, allLines, method);
  const fields = applyDemoOverrides(typeId, extracted.fields);
  const missingFields = extracted.missingFields.filter((k) => !fields.some((f) => f.key === k));

  progress("Preparing preview");
  const previews = await Promise.all(pages.map((p) => previewBlob(p.canvas)));

  // "Needs attention" only when something the user must act on remains after reading.
  const r = readability({ typeId, fields, quality });
  const needsAttention = r.issues.length > 0 || !r.readWell;
  return {
    record: {
      mimeType: file.type || (kind === "pdf" ? "application/pdf" : "image/jpeg"),
      typeId,
      typeConfidence: forcedType ? 1 : cls.confidence,
      typeSource: forcedType ? "user" : "auto",
      status: needsAttention ? "needs_attention" : "analysed",
      pageCount: pages.length,
      pageSizes: pages.map((p) => ({ width: p.canvas.width, height: p.canvas.height })),
      textMethod: method,
      ocrConfidence,
      quality,
      fields,
      missingFields,
    },
    previews,
    lines: allLines,
  };
}

/** Re-runs extraction for a user-selected document type without re-reading the file. */
export function reExtract(lines: TextLine[], typeId: DocTypeId, method: "text-layer" | "ocr") {
  return extractFields(typeId, lines, method);
}
