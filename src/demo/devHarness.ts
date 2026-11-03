"use client";

// Development-only harness: runs every seeded scenario through the real pipeline
// (render → PDF/JPEG → pdf.js/Tesseract → extraction → checks) and reports results.
// Exposed as window.__rl in development builds only.

import { SCENARIOS, buildScenario, type BuilderOptions, type Scenario } from "./scenarios";
import { specToFile } from "./package";
import { processFile } from "@/lib/ingest/pipeline";
import { runValidation } from "@/engine/run";
import { getVariant } from "@/knowledge/applications";
import type { DocumentRecord } from "@/engine/types";

async function evaluate(s: Scenario, fixed = false) {
  const variant = getVariant(s.appId, s.variantId)!;
  let specs = s.docs;
  let draft = { ...s.draft };
  if (fixed) {
    for (const f of s.fixes) {
      if (f.draftPatch) draft = { ...draft, ...f.draftPatch };
      if (f.doc) specs = f.replaces ? specs.map((d) => (d.type === f.replaces ? f.doc! : d)) : [...specs, f.doc];
    }
  }
  const docs: DocumentRecord[] = [];
  for (const spec of specs) {
    const file = await specToFile(spec);
    const r = await processFile(file, undefined, () => {});
    docs.push({ ...r.record, id: spec.type, fileName: file.name, size: file.size, addedAt: "", version: 1, synthetic: true });
  }
  const run = runValidation({ variant, documents: docs, draft });
  return {
    id: s.id,
    fixed,
    docs: docs.map((d) => `${d.typeId}:${d.status}:${d.fields.length}f${d.quality?.issues.length ? `:q[${d.quality.issues.map((i) => i.code)}]` : ""}`),
    open: run.findings.filter((f) => f.status === "action" || f.status === "review").map((f) => `${f.status}:${f.ruleId}:${f.title}`),
    fields: docs.map((d) => `${d.typeId}: ${d.fields.map((f) => `${f.key}=${f.value}(${Math.round(f.confidence * 100)})`).join(" | ")} missing=[${d.missingFields}]`),
    external: run.findings.filter((f) => f.status === "external").length,
    passed: run.findings.filter((f) => f.status === "passed").length,
  };
}

export function installHarness() {
  if (process.env.NODE_ENV === "production") return;
  (window as unknown as { __rl: unknown }).__rl = {
    scenarios: SCENARIOS.map((s) => s.id),
    evaluate: (id: string, fixed = false) => evaluate(SCENARIOS.find((s) => s.id === id)!, fixed),
    ocrLines: async (personaId: string) => {
      const { aadhaarDoc } = await import("./scenarios");
      const { PERSONAS } = await import("./personas");
      const f = await specToFile(aadhaarDoc(PERSONAS[personaId], {}, "photo"));
      return (await processFile(f, undefined, () => {})).lines.map((l) => `${Math.round(l.confidence * 100)} ${l.text}`);
    },
    evaluateCustom: (o: BuilderOptions) => evaluate(buildScenario(o)),
    /** Renders any document type as a phone photo and reports OCR confidence, quality and fields. */
    photoOf: async (type: string, personaId: string, degrade?: { blur?: number; dark?: number; crop?: number }) => {
      const s = await import("./scenarios");
      const { PERSONAS } = await import("./personas");
      const p = PERSONAS[personaId];
      const builders: Record<string, () => ReturnType<typeof s.aadhaarDoc>> = {
        aadhaar: () => s.aadhaarDoc(p, {}, "photo"),
        pan: () => ({ ...s.panDoc(p), format: "photo", fileName: "pan.jpg" }),
        bank_passbook: () => s.passbookDoc(p, {}, "photo", degrade),
        cancelled_cheque: () => s.chequeDoc(p),
        epf_passbook: () => ({ ...s.epfDoc(p), format: "photo", fileName: "epf.jpg" }),
        marksheet_12: () => ({ ...s.marksheetDoc(p), format: "photo", fileName: "marks.jpg" }),
        income_certificate: () => ({ ...s.incomeDoc(p), format: "photo", fileName: "income.jpg" }),
        bonafide_certificate: () => ({ ...s.bonafideDoc(p), format: "photo", fileName: "bonafide.jpg" }),
      };
      const spec = { ...builders[type](), degrade: degrade ?? builders[type]().degrade };
      const r = await processFile(await specToFile(spec), undefined, () => {});
      return {
        type: r.record.typeId,
        ocrConfidence: r.record.ocrConfidence,
        quality: r.record.quality,
        fields: r.record.fields.map((f) => `${f.key}=${f.value}(${Math.round(f.confidence * 100)})`),
        missing: r.record.missingFields,
        lines: r.lines.map((l) => `${Math.round(l.confidence * 100)} ${l.text}`),
      };
    },
  };
}
