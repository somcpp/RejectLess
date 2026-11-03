"use client";

import type { GrayImage } from "@/engine/quality";

export function createCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Downscales to at most `maxSide` and converts to luminance for quality analysis. */
export function toGray(src: HTMLCanvasElement, maxSide = 1000): GrayImage {
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height));
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0, w, h);
  const rgba = ctx.getImageData(0, 0, w, h).data;
  const data = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    data[j] = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
  }
  return { width: w, height: h, data, sourceWidth: src.width, sourceHeight: src.height };
}

export async function fileToCanvas(file: Blob, maxSide = 2200): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file).catch(() => {
    throw new Error("This image could not be opened. It may be corrupted or in an unsupported format.");
  });
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = createCanvas(bmp.width * scale, bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c;
}

/**
 * Prepares a page image for Tesseract: upscales small images towards ~300 dpi, converts to
 * grayscale, stretches contrast between the 2nd and 98th percentiles and applies a light
 * unsharp mask. Aspect ratio is unchanged, so normalised boxes still map onto the original.
 */
export function prepareForOcr(src: HTMLCanvasElement, targetLongSide = 2000, maxLongSide = 2800): HTMLCanvasElement {
  const long = Math.max(src.width, src.height);
  const scale = long < targetLongSide ? Math.min(maxLongSide / long, Math.max(1, Math.ceil(targetLongSide / long))) : 1;
  const w = Math.round(src.width * scale), h = Math.round(src.height * scale);
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const n = w * h;
  const gray = new Uint8ClampedArray(n);
  const hist = new Uint32Array(256);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const v = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0;
    gray[j] = v;
    hist[v]++;
  }
  // Percentile stretch: ignores a few specks of pure black/white (glare, shadows).
  let lo = 0, hi = 255, acc = 0;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * 0.02) { lo = v; break; } }
  acc = 0;
  for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= n * 0.02) { hi = v; break; } }
  const span = Math.max(40, hi - lo);
  const stretched = new Uint8ClampedArray(n);
  for (let j = 0; j < n; j++) stretched[j] = ((gray[j] - lo) * 255) / span;
  // Unsharp mask (3×3 box blur, amount 0.6) — crisper strokes without halos.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const j = y * w + x;
      let sum = 0, cnt = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          sum += stretched[yy * w + xx];
          cnt++;
        }
      }
      const blur = sum / cnt;
      const v = Math.max(0, Math.min(255, stretched[j] + 0.6 * (stretched[j] - blur)));
      d[j * 4] = d[j * 4 + 1] = d[j * 4 + 2] = v;
      d[j * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function canvasToBlob(c: HTMLCanvasElement, type = "image/jpeg", quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), type, quality));
}

/** Small preview kept for evidence highlighting; the original file is not retained. */
export async function previewBlob(c: HTMLCanvasElement, maxSide = 1400): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(c.width, c.height));
  if (scale === 1) return canvasToBlob(c);
  const p = createCanvas(c.width * scale, c.height * scale);
  p.getContext("2d")!.drawImage(c, 0, 0, p.width, p.height);
  return canvasToBlob(p);
}
