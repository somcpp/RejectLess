// Pure geometry for the document scanner: find the paper in a frame, fit a homography and
// warp it flat. No DOM here — callers pass pixel buffers — so it is unit-testable.

export interface Pt {
  x: number;
  y: number;
}
/** Corners in normalised 0..1 frame coordinates: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Pt, Pt, Pt, Pt];

export interface Gray {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

/** Otsu's threshold on a luminance histogram — separates paper from table without tuning. */
export function otsu(data: Uint8ClampedArray | Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < data.length; i++) hist[data[i]]++;
  const total = data.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0, best = 0, thr = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      thr = t;
    }
  }
  return thr;
}

/**
 * Finds the largest bright region (the sheet) and returns its corner quad plus how much of the
 * frame it covers. Returns null when nothing sheet-like is visible.
 */
export function detectQuad(img: Gray): { quad: Quad; coverage: number } | null {
  const { width: w, height: h, data } = img;
  const thr = otsu(data);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < data.length; i++) mask[i] = data[i] > thr ? 1 : 0;
  // Largest connected bright component (4-neighbour flood fill with an explicit stack).
  const seen = new Uint8Array(w * h);
  let best: number[] = [];
  const stack: number[] = [];
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || seen[s]) continue;
    const comp: number[] = [];
    stack.push(s);
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      comp.push(i);
      const x = i % w, y = (i - x) / w;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const n of nb) if (n >= 0 && mask[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
    }
    if (comp.length > best.length) best = comp;
  }
  const coverage = best.length / (w * h);
  if (coverage < 0.08) return null;
  // Extreme points of the component give the four corners of a convex sheet.
  let tl = best[0], tr = best[0], br = best[0], bl = best[0];
  let vTl = Infinity, vTr = -Infinity, vBr = -Infinity, vBl = Infinity;
  for (const i of best) {
    const x = i % w, y = (i - x) / w;
    if (x + y < vTl) { vTl = x + y; tl = i; }
    if (x - y > vTr) { vTr = x - y; tr = i; }
    if (x + y > vBr) { vBr = x + y; br = i; }
    if (x - y < vBl) { vBl = x - y; bl = i; }
  }
  const pt = (i: number): Pt => ({ x: (i % w) / w, y: Math.floor(i / w) / h });
  const quad: Quad = [pt(tl), pt(tr), pt(br), pt(bl)];
  // Reject degenerate shapes (a thin strip or a near-line).
  const wTop = dist(quad[0], quad[1]), wBot = dist(quad[3], quad[2]), hL = dist(quad[0], quad[3]), hR = dist(quad[1], quad[2]);
  if (Math.min(wTop, wBot) < 0.15 || Math.min(hL, hR) < 0.15) return null;
  return { quad, coverage };
}

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** How much two quads differ (max corner movement, in frame units). */
export function quadDelta(a: Quad, b: Quad): number {
  return Math.max(...a.map((p, i) => dist(p, b[i])));
}

/** Solves H (3x3, row-major, h33 = 1) such that H · src_i ≈ dst_i for four point pairs. */
export function solveHomography(src: Pt[], dst: Pt[]): number[] {
  // 8 equations in 8 unknowns (Gaussian elimination with partial pivoting).
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const n = 8;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    const d = A[c][c] || 1e-12;
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / d;
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const hv = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * hv[k];
    hv[r] = s / (A[r][r] || 1e-12);
  }
  return [...hv, 1];
}

export function applyH(H: number[], p: Pt): Pt {
  const d = H[6] * p.x + H[7] * p.y + H[8];
  return { x: (H[0] * p.x + H[1] * p.y + H[2]) / d, y: (H[3] * p.x + H[4] * p.y + H[5]) / d };
}

/** Output size (px) for a flattened sheet, from the quad's side lengths in a frame of srcW×srcH. */
export function outputSize(quad: Quad, srcW: number, srcH: number, maxSide = 1600): { w: number; h: number } {
  const px = (p: Pt) => ({ x: p.x * srcW, y: p.y * srcH });
  const q = quad.map(px);
  const w = Math.max(dist(q[0], q[1]), dist(q[3], q[2]));
  const h = Math.max(dist(q[0], q[3]), dist(q[1], q[2]));
  const s = Math.min(1, maxSide / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

/**
 * Perspective-warps RGBA pixels so `quad` becomes the full output rectangle (bilinear sampling).
 * `src` is the frame's RGBA buffer; returns the output RGBA buffer.
 */
export function warpRgba(src: Uint8ClampedArray, srcW: number, srcH: number, quad: Quad, outW: number, outH: number): Uint8ClampedArray {
  const srcPx = quad.map((p) => ({ x: p.x * srcW, y: p.y * srcH }));
  const H = solveHomography([{ x: 0, y: 0 }, { x: outW, y: 0 }, { x: outW, y: outH }, { x: 0, y: outH }], srcPx);
  const out = new Uint8ClampedArray(outW * outH * 4);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const s = applyH(H, { x: x + 0.5, y: y + 0.5 });
      const sx = Math.min(srcW - 1.001, Math.max(0, s.x - 0.5)), sy = Math.min(srcH - 1.001, Math.max(0, s.y - 0.5));
      const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
      const i00 = (y0 * srcW + x0) * 4, i10 = i00 + 4, i01 = i00 + srcW * 4, i11 = i01 + 4;
      const o = (y * outW + x) * 4;
      for (let c = 0; c < 3; c++) {
        out[o + c] = src[i00 + c] * (1 - fx) * (1 - fy) + src[i10 + c] * fx * (1 - fy) + src[i01 + c] * (1 - fx) * fy + src[i11 + c] * fx * fy;
      }
      out[o + 3] = 255;
    }
  }
  return out;
}

/**
 * "Document" enhancement: divides each pixel by the local background (box-blurred luminance),
 * which evens out lighting and lifts ink contrast. Works on RGBA in place.
 */
export function enhanceDocument(rgba: Uint8ClampedArray, w: number, h: number, radius = Math.max(8, Math.round(Math.max(w, h) / 40))): void {
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  // Summed-area table for an O(1) box blur.
  const sat = new Float64Array((w + 1) * (h + 1));
  for (let y = 1; y <= h; y++) {
    let row = 0;
    for (let x = 1; x <= w; x++) {
      row += lum[(y - 1) * w + (x - 1)];
      sat[y * (w + 1) + x] = sat[(y - 1) * (w + 1) + x] + row;
    }
  }
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius), y1 = Math.min(h, y + radius + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius), x1 = Math.min(w, x + radius + 1);
      const bg = (sat[y1 * (w + 1) + x1] - sat[y0 * (w + 1) + x1] - sat[y1 * (w + 1) + x0] + sat[y0 * (w + 1) + x0]) / ((y1 - y0) * (x1 - x0));
      const i = y * w + x;
      // Paper → white, ink stays dark; mild gamma keeps light pencil readable.
      const ratio = Math.min(1, lum[i] / Math.max(1, bg * 0.96));
      const v = Math.round(255 * Math.pow(ratio, 1.6));
      rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = v;
    }
  }
}

/** Share of near-white pixels — specular glare on a photo of paper. */
export function glareShare(data: Uint8ClampedArray | Uint8Array): number {
  let n = 0;
  for (let i = 0; i < data.length; i++) if (data[i] >= 251) n++;
  return n / Math.max(1, data.length);
}
