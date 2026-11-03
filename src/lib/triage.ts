import type { Finding } from "@/engine/types";

// The five sections a first-time applicant sees in their results. Engine statuses stay
// as they are (code decides); this only decides where each finding is shown.
export type Bucket = "passed" | "documents" | "review" | "verify" | "external";

export const BUCKETS: { id: Bucket; label: string; labelHi: string; blurb: string }[] = [
  { id: "passed", label: "Passed", labelHi: "सही है", blurb: "Which of your documents passed, and which details on them matched." },
  { id: "documents", label: "Documents needed", labelHi: "दस्तावेज़ चाहिए", blurb: "Documents that are missing or need a better photo — with where to get them and what to fill in." },
  { id: "review", label: "Needs review", labelHi: "समीक्षा करें", blurb: "Mismatches between your documents and details you still have to fix — with where to fix each one." },
  { id: "verify", label: "External verifications", labelHi: "बाहरी सत्यापन", blurb: "Official portals where you confirm each detail yourself before applying: the link, what to enter, what you should see." },
  { id: "external", label: "Confirm on portal", labelHi: "पोर्टल पर पुष्टि", blurb: "Only the scheme's own portal can confirm these. Tick each one once you have checked it." },
];

export function bucketOf(f: Finding): Bucket {
  if (f.status === "passed") return "passed";
  if (f.status === "external") return "external";
  // Missing documents, missing details and poor photos are to-dos, not mistakes.
  if (f.ruleId === "GEN-DOCS" || f.ruleId === "GEN-QUALITY" || f.missingInput) return "documents";
  return "review";
}

export function groupFindings(findings: Finding[]): Record<Bucket, Finding[]> {
  const out: Record<Bucket, Finding[]> = { passed: [], documents: [], review: [], verify: [], external: [] };
  for (const f of findings) out[bucketOf(f)].push(f);
  return out;
}

/** The document type a GEN-DOCS finding is about (its key is "GEN-DOCS:<docType>"). */
export function missingDocType(f: Finding): string | undefined {
  return f.ruleId === "GEN-DOCS" ? f.key.split(":")[1] : undefined;
}
