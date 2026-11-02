import type { Finding } from "@/engine/types";

// The five groups a first-time applicant sees in their results. Engine statuses stay
// as they are (code decides); this only decides where each finding is shown.
export type Bucket = "action" | "documents" | "review" | "external" | "passed";

export const BUCKETS: { id: Bucket; label: string; labelHi: string; blurb: string }[] = [
  { id: "action", label: "Fix now", labelHi: "अभी ठीक करें", blurb: "Something on your documents or details is wrong. Fix it before you apply." },
  { id: "documents", label: "Documents needed", labelHi: "दस्तावेज़ चाहिए", blurb: "Something is missing, so we could not check it. Here is where to get it." },
  { id: "review", label: "Check these", labelHi: "जाँच लें", blurb: "Probably fine, but look once — small differences can cause rejections." },
  { id: "external", label: "Confirm on portal", labelHi: "पोर्टल पर पुष्टि", blurb: "Only the official portal can confirm these. Tick each one once you have checked it." },
  { id: "passed", label: "Passed", labelHi: "सही है", blurb: "These details matched or were in the right format." },
];

export function bucketOf(f: Finding): Bucket {
  if (f.status === "passed") return "passed";
  if (f.status === "external") return "external";
  // A missing document or missing detail is not an error on the user's part — it's a to-do.
  if (f.ruleId === "GEN-DOCS" || f.missingInput) return "documents";
  return f.status === "action" ? "action" : "review";
}

export function groupFindings(findings: Finding[]): Record<Bucket, Finding[]> {
  const out: Record<Bucket, Finding[]> = { action: [], documents: [], review: [], external: [], passed: [] };
  for (const f of findings) out[bucketOf(f)].push(f);
  return out;
}

/** The document type a GEN-DOCS finding is about (its key is "GEN-DOCS:<docType>"). */
export function missingDocType(f: Finding): string | undefined {
  return f.ruleId === "GEN-DOCS" ? f.key.split(":")[1] : undefined;
}
