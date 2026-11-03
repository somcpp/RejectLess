// Passport-photo preparation: crop a region of a picture to the portal's size and compress it
// under the byte limit. Everything happens on a canvas in the browser.

import { fileToCanvas, canvasToBlob, toGray } from "@/lib/ingest/raster";
import { measure } from "@/engine/quality";

export interface CropView {
  /** Zoom factor relative to "cover" fit. */
  zoom: number;
  /** Pan offsets as a fraction of the frame size (0 = centred). */
  dx: number;
  dy: number;
}

export async function loadPhoto(file: Blob): Promise<HTMLCanvasElement> {
  return fileToCanvas(file, 1600);
}

/** Draws the chosen view of `src` into a width×height canvas (cover fit, then zoom and pan). */
export function renderCrop(src: HTMLCanvasElement, width: number, height: number, view: CropView): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d")!;
  const cover = Math.max(width / src.width, height / src.height) * view.zoom;
  const dw = src.width * cover, dh = src.height * cover;
  const x = (width - dw) / 2 + view.dx * width, y = (height - dh) / 2 + view.dy * height;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, x, y, dw, dh);
  return out;
}

/** JPEG under `maxKb`, lowering quality step by step; returns the blob and the quality used. */
export async function compressUnder(canvas: HTMLCanvasElement, maxKb: number): Promise<{ blob: Blob; quality: number }> {
  let quality = 0.92;
  let blob = await canvasToBlob(canvas, "image/jpeg", quality);
  while (blob.size > maxKb * 1024 && quality > 0.3) {
    quality = Math.round((quality - 0.08) * 100) / 100;
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }
  return { blob, quality };
}

export interface PhotoAssessment {
  /** Plain-language problems; empty when the photo looks fine. */
  issues: string[];
  glare: number;
  brightness: number;
  sharpness: number;
}

/**
 * Checks a cropped passport photo for glare, exposure and focus. Glare is measured on the
 * central face area only, because a light background is normal for a passport photo.
 */
export function assessPhoto(canvas: HTMLCanvasElement): PhotoAssessment {
  const gray = toGray(canvas, 400);
  const m = measure(gray);
  const { width: w, height: h, data } = gray;
  let white = 0, total = 0;
  for (let y = Math.round(h * 0.15); y < h * 0.85; y++) {
    for (let x = Math.round(w * 0.2); x < w * 0.8; x++) {
      total++;
      if (data[y * w + x] >= 250) white++;
    }
  }
  const glare = total ? white / total : 0;
  const issues: string[] = [];
  if (glare > 0.012) issues.push("The image has glare — a bright reflection on the face or glasses. Retake it facing the light, not under it.");
  if (m.brightness < 70) issues.push("The photo is too dark. Take it in daylight or facing a window.");
  if (m.brightness > 235 && m.contrast < 25) issues.push("The photo is washed out. Move away from direct light.");
  if (m.sharpness < 80) issues.push("The photo looks blurred. Hold the phone still and let it focus on the face.");
  return { issues, glare: Math.round(glare * 1000) / 1000, brightness: m.brightness, sharpness: m.sharpness };
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
