import { describe, expect, it } from "vitest";
import { applyH, detectQuad, enhanceDocument, glareShare, outputSize, solveHomography, warpRgba, type Quad } from "./geometry";

function frame(w: number, h: number, paint: (x: number, y: number) => number) {
  const data = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[y * w + x] = paint(x, y);
  return { width: w, height: h, data };
}

describe("document detection", () => {
  it("finds a bright sheet on a dark table", () => {
    const img = frame(120, 90, (x, y) => (x >= 20 && x < 100 && y >= 15 && y < 75 ? 220 : 60));
    const r = detectQuad(img)!;
    expect(r).not.toBeNull();
    expect(r.quad[0].x).toBeCloseTo(20 / 120, 1);
    expect(r.quad[2].y).toBeCloseTo(74 / 90, 1);
    expect(r.coverage).toBeCloseTo((80 * 60) / (120 * 90), 1);
  });
  it("returns null when there is no sheet", () => {
    expect(detectQuad(frame(60, 40, () => 80))).toBeNull();
  });
});

describe("homography", () => {
  it("maps the four source corners onto the destination corners", () => {
    const src = [{ x: 10, y: 12 }, { x: 95, y: 8 }, { x: 100, y: 90 }, { x: 5, y: 85 }];
    const dst = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 80 }, { x: 0, y: 80 }];
    const H = solveHomography(src, dst);
    src.forEach((p, i) => {
      const q = applyH(H, p);
      expect(q.x).toBeCloseTo(dst[i].x, 6);
      expect(q.y).toBeCloseTo(dst[i].y, 6);
    });
  });
  it("warps a skewed sheet into a rectangle", () => {
    const w = 40, h = 30;
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) rgba.set([200, 200, 200, 255], i * 4);
    const quad: Quad = [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.15 }, { x: 0.85, y: 0.9 }, { x: 0.15, y: 0.85 }];
    const { w: ow, h: oh } = outputSize(quad, w, h, 100);
    const out = warpRgba(rgba, w, h, quad, ow, oh);
    expect(out.length).toBe(ow * oh * 4);
    expect(out[0]).toBe(200);
  });
});

describe("enhancement and glare", () => {
  it("evens out lighting: shaded paper becomes white, ink stays dark", () => {
    const w = 64, h = 16;
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const paper = 120 + Math.round((x / w) * 100); // gradient from 120 to 220
      const v = x === 30 ? paper * 0.3 : paper; // one ink column
      rgba.set([v, v, v, 255], (y * w + x) * 4);
    }
    enhanceDocument(rgba, w, h, 6);
    expect(rgba[(8 * w + 5) * 4]).toBeGreaterThan(230);
    expect(rgba[(8 * w + 30) * 4]).toBeLessThan(90);
  });
  it("measures glare as the share of saturated pixels", () => {
    const d = new Uint8ClampedArray(100).fill(200);
    for (let i = 0; i < 7; i++) d[i] = 255;
    expect(glareShare(d)).toBeCloseTo(0.07, 5);
  });
});
