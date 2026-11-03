import type { DocTypeId, ExtractedField, FieldKey } from "@/engine/types";

// Demo-only pinned values for extracted fields, e.g. when a particular paper marksheet's
// layout is not parsed yet and a rehearsal must still show the right number.
// Configured per machine in .env (never committed):
//   NEXT_PUBLIC_DEMO_OVERRIDES={"marksheet_12.percentage":"73%"}
// Applied in development builds only; the review page marks overridden values.

function parse(): Record<string, string> {
  if (process.env.NODE_ENV === "production") return {};
  try {
    const raw = process.env.NEXT_PUBLIC_DEMO_OVERRIDES;
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

const OVERRIDES = parse();

export const hasDemoOverrides = Object.keys(OVERRIDES).length > 0;

export function demoOverride(typeId: DocTypeId, key: FieldKey): string | undefined {
  return OVERRIDES[`${typeId}.${key}`];
}

/** Returns the fields with any pinned values applied (adds the field if it was not read at all). */
export function applyDemoOverrides(typeId: DocTypeId, fields: ExtractedField[]): ExtractedField[] {
  if (!hasDemoOverrides) return fields;
  const out = fields.map((f) => {
    const v = demoOverride(typeId, f.key);
    return v && f.status === "extracted" && f.value !== v ? { ...f, value: v, originalValue: f.originalValue ?? f.value, confidence: 1 } : f;
  });
  for (const [k, v] of Object.entries(OVERRIDES)) {
    const [t, key] = k.split(".");
    if (t === typeId && !out.some((f) => f.key === key)) {
      out.push({ key: key as FieldKey, value: v, raw: v, confidence: 1, page: 1, method: "manual", status: "extracted" });
    }
  }
  return out;
}
