import type { FieldKey, Finding } from "@/engine/types";
import { buildProfile, firstValue } from "@/engine/profile";
import { formatDate, parseDate } from "@/engine/validators";
import { getVariant } from "@/knowledge/applications";
import { stateName } from "@/knowledge/onboarding";
import type { Session } from "@/lib/store/session";

// Values for the filled copy of a portal form. First choice is always what the user typed
// in "What will you type on the portal?"; a document value is used only where that answer
// is blank, and is labelled as such. Nothing is invented, and a field with an open mismatch
// is flagged so the user fixes it before using it.

export interface Prefilled {
  value: string;
  /** Where the value came from, in the user's words. */
  source: string;
  /** An open mismatch involves this detail — fix it before using. */
  flagged?: boolean;
}

export type Prefill = Record<string, Prefilled>;

// NSP wants DD/MM/YYYY.
function dmy(v: string | undefined) {
  const p = parseDate(v);
  return p ? formatDate(p).replace(/-/g, "/") : (v ?? "");
}

/** Which document to fall back to for each form field the user left blank. */
const DOC_FALLBACK: Record<string, { key: FieldKey; prefer: Parameters<typeof firstValue>[2]; fmt?: (v: string) => string }> = {
  name: { key: "name", prefer: ["aadhaar", "marksheet_12"] },
  dob: { key: "dob", prefer: ["aadhaar", "marksheet_12"], fmt: dmy },
  gender: { key: "gender", prefer: ["aadhaar"] },
  bank_name: { key: "bank_name", prefer: ["bank_passbook"] },
  ifsc: { key: "ifsc", prefer: ["bank_passbook"] },
  account_number: { key: "account_number", prefer: ["bank_passbook"] },
  aadhaar: { key: "aadhaar_number", prefer: ["aadhaar"] },
  institution: { key: "institution", prefer: ["bonafide_certificate"] },
  course: { key: "course", prefer: ["bonafide_certificate"] },
  course_year: { key: "course_year", prefer: ["bonafide_certificate"] },
  study_mode: { key: "study_mode", prefer: ["bonafide_certificate"] },
  academic_year: { key: "academic_year", prefer: ["bonafide_certificate"] },
  board: { key: "board", prefer: ["marksheet_12"] },
  roll_number: { key: "roll_number", prefer: ["marksheet_12"] },
  year_of_passing: { key: "year_of_passing", prefer: ["marksheet_12"] },
  percentage: { key: "percentage", prefer: ["marksheet_12"] },
  father_name: { key: "father_name", prefer: ["marksheet_12", "aadhaar", "income_certificate"] },
  annual_income: { key: "annual_income", prefer: ["income_certificate"] },
  income_cert_date: { key: "issue_date", prefer: ["income_certificate"], fmt: dmy },
  income_cert_authority: { key: "issuing_authority", prefer: ["income_certificate"] },
};

/** Draft keys whose values are dates (stored ISO by the date input). */
const DATE_KEYS = new Set(["dob", "admission_date"]);

export function prefillNsp(session: Session, latestRun?: { findings: Finding[] }): Prefill {
  const variant = getVariant(session.appId, session.variantId);
  const profile = buildProfile(session.documents, session.draft, variant);
  const flagged = new Set<string>();
  for (const f of latestRun?.findings ?? []) if (f.status === "action") for (const o of f.observations) flagged.add(o.field);
  const defs = new Map((variant?.draftFields ?? []).map((d) => [d.key, d]));
  const out: Prefill = {};

  // 1. What the user typed, shown with the option label where the field is a choice.
  for (const [key, raw] of Object.entries(session.draft)) {
    const v = raw?.trim();
    if (!v) continue;
    const def = defs.get(key);
    const label = def?.options?.find((o) => o.value === v)?.label;
    const value = DATE_KEYS.has(key) ? dmy(v) : key === "other_scholarship" ? (v === "yes" ? "Yes" : v === "no" ? "No" : v) : (label ?? v);
    out[key] = { value, source: "what you typed", flagged: !!def?.maps && flagged.has(def.maps) };
  }
  // 2. Document values only where the answer is blank.
  for (const [id, fb] of Object.entries(DOC_FALLBACK)) {
    if (out[id]) continue;
    const v = firstValue(profile, fb.key, fb.prefer);
    if (!v || v.source !== "document") continue;
    out[id] = { value: (fb.fmt ?? ((x: string) => x))(v.value), source: `your ${v.docLabel}`, flagged: flagged.has(fb.key) };
  }
  // 3. Onboarding answers.
  if (session.profile?.state) out.domicile_state = { value: stateName(session.profile.state), source: "your answers" };
  return out;
}
