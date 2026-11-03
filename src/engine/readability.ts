import type { DocumentRecord, ExtractedField, FieldKey, QualityIssue } from "./types";
import { DOC_TYPES } from "@/knowledge/documents";

// One place that answers "could we actually read this document?". Pixel metrics and the
// OCR average are only proxies; what matters to the user is whether the key details came
// out. Below UNREADABLE a value is shown as "hard to read" and must be checked by the user.
export const UNREADABLE = 0.65;

// Issues that describe the picture, not the result. Dropped once the key details were read.
const PROXY_ISSUES = new Set<QualityIssue["code"]>(["blur", "dark", "overexposed", "low_contrast", "low_resolution", "low_ocr_confidence", "cropped", "glare"]);

export interface Readability {
  /** Document type is known and every key detail was read clearly (or confirmed/edited by the user). */
  readWell: boolean;
  /** Key details with no value at all. */
  notFound: FieldKey[];
  /** Extracted values below the readability threshold (any field). */
  unreadable: ExtractedField[];
  /** Quality issues still worth telling the user about. */
  issues: QualityIssue[];
  /** Picture problems that did not stop reading — shown softly ("a clearer photo is safer"). */
  advisories: QualityIssue[];
}

export function readability(doc: Pick<DocumentRecord, "typeId" | "fields" | "quality">): Readability {
  const def = DOC_TYPES[doc.typeId];
  const clear = (f: ExtractedField) => !!f.value && (f.status !== "extracted" || f.confidence >= UNREADABLE);
  const hasYob = doc.fields.some((f) => f.key === "yob" && f.value);
  const notFound = def.keyFields.filter((k) => !doc.fields.some((f) => f.key === k && f.value) && !(k === "dob" && hasYob));
  const keyUnclear = def.keyFields.some((k) => doc.fields.some((f) => f.key === k) && !doc.fields.some((f) => f.key === k && clear(f)));
  const unreadable = doc.fields.filter((f) => f.status === "extracted" && f.confidence < UNREADABLE);
  const readWell = doc.typeId !== "unknown" && notFound.length === 0 && !keyUnclear;
  const all = doc.quality?.issues ?? [];
  const issues = readWell ? all.filter((i) => !PROXY_ISSUES.has(i.code)) : all;
  return { readWell, notFound, unreadable, issues, advisories: all.filter((i) => !issues.includes(i)) };
}
