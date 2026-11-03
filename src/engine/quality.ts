import type { QualityIssue } from "./types";
import { glareShare } from "./scan/geometry";

// Image quality measurements on a grayscale buffer. Thresholds were calibrated on
// clean renders vs. synthetically degraded renders and are deliberately conservative.

export interface GrayImage {
  width: number;
  height: number;
  /** 0..255 luminance, row-major */
  data: Uint8ClampedArray | Uint8Array;
  /** Original pixel dimensions before any downscaling for analysis. */
  sourceWidth: number;
  sourceHeight: number;
}

export interface QualityMetrics {
  sharpness: number; // variance of Laplacian, normalised to a contrast of 60
  brightness: number; // mean luminance
  contrast: number; // std-dev of luminance
  edgeInk: number; // share of dark pixels in the outer border band
  glare: number; // share of saturated (≥251) pixels — specular reflections on paper
  minSide: number; // shortest side in source pixels
}

export function measure(img: GrayImage): QualityMetrics {
  const { width: w, height: h, data } = img;
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    sumSq += data[i] * data[i];
  }
  const n = data.length;
  const brightness = sum / n;
  const contrast = Math.sqrt(Math.max(0, sumSq / n - brightness * brightness));

  // Variance of the 4-neighbour Laplacian.
  let lSum = 0;
  let lSq = 0;
  let count = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = data[i - w] + data[i + w] + data[i - 1] + data[i + 1] - 4 * data[i];
      lSum += lap;
      lSq += lap * lap;
      count++;
    }
  }
  const lMean = lSum / Math.max(1, count);
  const sharpness = lSq / Math.max(1, count) - lMean * lMean;

  // Ink touching the border suggests the document is cropped.
  const band = Math.max(2, Math.round(Math.min(w, h) * 0.015));
  let edgeDark = 0;
  let edgeTotal = 0;
  const dark = Math.min(110, brightness - 2 * contrast);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x >= band && x < w - band && y >= band && y < h - band) continue;
      edgeTotal++;
      if (data[y * w + x] < dark) edgeDark++;
    }
  }
  // Laplacian variance scales with contrast, so a merely dark or faded photo looked "blurred".
  // Normalise to a reference contrast of 60 so sharpness measures focus, not exposure.
  const normalised = contrast > 0 ? sharpness * (60 / contrast) ** 2 : sharpness;
  return {
    sharpness: Math.round(normalised),
    brightness: Math.round(brightness),
    contrast: Math.round(contrast),
    edgeInk: Math.round((edgeDark / Math.max(1, edgeTotal)) * 1000) / 1000,
    glare: Math.round(glareShare(data) * 1000) / 1000,
    minSide: Math.min(img.sourceWidth, img.sourceHeight),
  };
}

export function assess(m: QualityMetrics, page: number): QualityIssue[] {
  const issues: QualityIssue[] = [];
  if (m.minSide < 500) issues.push({ code: "low_resolution", page, message: "The image resolution is low; small text may be misread.", measured: `${m.minSide}px shortest side` });
  if (m.sharpness < 120) issues.push({ code: "blur", page, message: "The image looks blurred or out of focus.", measured: `sharpness ${m.sharpness}` });
  if (m.brightness < 70) issues.push({ code: "dark", page, message: "The image is too dark.", measured: `brightness ${m.brightness}/255` });
  if (m.brightness > 245 && m.contrast < 20) issues.push({ code: "overexposed", page, message: "The image is washed out.", measured: `brightness ${m.brightness}/255` });
  else if (m.contrast < 25) issues.push({ code: "low_contrast", page, message: "The text has low contrast against the background.", measured: `contrast ${m.contrast}` });
  if (m.edgeInk > 0.06) issues.push({ code: "cropped", page, message: "Content touches the edge of the image — part of the document may be cut off.", measured: `${Math.round(m.edgeInk * 100)}% of the border has ink` });
  // Scanned/printed paper rarely saturates; a bright patch of pure white is a reflection hiding text.
  if (m.glare > 0.02 && m.brightness < 240) issues.push({ code: "glare", page, message: "The photo has glare — a bright reflection is hiding part of the page.", measured: `${Math.round(m.glare * 100)}% of pixels fully white` });
  return issues;
}
