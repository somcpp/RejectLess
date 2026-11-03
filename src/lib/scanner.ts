// Browser side of the document scanner: frames from a <video>, warp + enhance on canvas,
// and packaging pages as JPEG files or one PDF. Geometry lives in engine/scan (pure).

import { PDFDocument } from "pdf-lib";
import { detectQuad, enhanceDocument, outputSize, warpRgba, type Quad } from "@/engine/scan/geometry";
import { measure } from "@/engine/quality";
import { canvasToBlob, toGray } from "@/lib/ingest/raster";

export interface FrameReport {
  quad: Quad | null;
  coverage: number;
  sharpness: number;
  brightness: number;
  glare: number;
}

/** Analyses one video frame at low resolution (fast enough to run several times a second). */
export function analyseFrame(video: HTMLVideoElement, work: HTMLCanvasElement): FrameReport | null {
  if (!video.videoWidth) return null;
  const scale = 240 / Math.max(video.videoWidth, video.videoHeight);
  work.width = Math.round(video.videoWidth * scale);
  work.height = Math.round(video.videoHeight * scale);
  const ctx = work.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(video, 0, 0, work.width, work.height);
  const gray = toGray(work, 240);
  const m = measure(gray);
  const det = detectQuad({ width: gray.width, height: gray.height, data: gray.data });
  return { quad: det?.quad ?? null, coverage: det?.coverage ?? 0, sharpness: m.sharpness, brightness: m.brightness, glare: m.glare };
}

/** Plain-language guidance for the live view. */
export function guidance(r: FrameReport | null): { text: string; ok: boolean } {
  if (!r) return { text: "Starting camera…", ok: false };
  if (r.brightness < 60) return { text: "Too dark — move to a brighter place", ok: false };
  if (!r.quad) return { text: "Point at the document on a dark, plain surface", ok: false };
  if (r.coverage < 0.22) return { text: "Move closer so the page fills the frame", ok: false };
  if (r.coverage > 0.9) return { text: "Move back — keep all four edges inside", ok: false };
  if (r.glare > 0.02) return { text: "Glare — tilt away from the light", ok: false };
  if (r.sharpness < 60) return { text: "Hold still until it focuses", ok: false };
  return { text: "Good — hold still", ok: true };
}

/**
 * Grabs a still — via the ImageCapture API where the browser has it (a true full-resolution
 * photo with autofocus), otherwise the current video frame — then flattens the quad and
 * (optionally) enhances it.
 */
export async function capturePage(video: HTMLVideoElement, quad: Quad | null, enhance: boolean): Promise<HTMLCanvasElement> {
  const full = document.createElement("canvas");
  const ctx = full.getContext("2d", { willReadFrequently: true })!;
  const track = (video.srcObject as MediaStream | null)?.getVideoTracks()[0];
  const IC = (window as unknown as { ImageCapture?: new (t: MediaStreamTrack) => { takePhoto(): Promise<Blob> } }).ImageCapture;
  let drew = false;
  if (track && IC) {
    try {
      const blob = await new IC(track).takePhoto();
      const bmp = await createImageBitmap(blob);
      full.width = bmp.width;
      full.height = bmp.height;
      ctx.drawImage(bmp, 0, 0);
      bmp.close();
      drew = true;
    } catch {
      /* fall back to the video frame below */
    }
  }
  if (!drew) {
    full.width = video.videoWidth;
    full.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
  }
  let out = full;
  if (quad) {
    // Aim for ~2400 px on the long side so text is ~300 dpi for OCR; upscaling a small quad is still
    // better than feeding OCR a 600 px strip.
    const base = outputSize(quad, full.width, full.height, 2400);
    const up = Math.max(1, Math.min(2.5, 1600 / Math.max(base.w, base.h)));
    const w = Math.round(base.w * up), h = Math.round(base.h * up);
    const src = ctx.getImageData(0, 0, full.width, full.height).data;
    const warped = warpRgba(src, full.width, full.height, quad, w, h);
    out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const octx = out.getContext("2d")!;
    const img = octx.createImageData(w, h);
    img.data.set(warped);
    octx.putImageData(img, 0, 0);
  }
  if (enhance) {
    const c = out.getContext("2d", { willReadFrequently: true })!;
    const img = c.getImageData(0, 0, out.width, out.height);
    enhanceDocument(img.data, out.width, out.height);
    c.putImageData(img, 0, 0);
  }
  return out;
}

/** One JPEG per page, or a single PDF when there are several pages. */
export async function packagePages(pages: HTMLCanvasElement[], baseName: string): Promise<File[]> {
  const blobs = await Promise.all(pages.map((p) => canvasToBlob(p, "image/jpeg", 0.9)));
  if (pages.length === 1) return [new File([blobs[0]], `${baseName}-scan.jpg`, { type: "image/jpeg" })];
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pages.length; i++) {
    const img = await pdf.embedJpg(await blobs[i].arrayBuffer());
    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  const bytes = await pdf.save();
  return [new File([bytes as BlobPart], `${baseName}-scan.pdf`, { type: "application/pdf" })];
}
