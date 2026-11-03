// Core domain model for RejectLess. Pure types — no browser or React dependencies.

export type DocTypeId =
  | "aadhaar"
  | "pan"
  | "bank_passbook"
  | "cancelled_cheque"
  | "epf_passbook"
  | "marksheet_12"
  | "income_certificate"
  | "bonafide_certificate"
  | "form16"
  | "land_record"
  | "unknown";

/** Canonical attribute keys shared across documents and the application draft. */
export type FieldKey =
  | "name"
  | "name_local"
  | "father_name"
  | "dob"
  | "yob"
  | "gender"
  | "aadhaar_number"
  | "pan_number"
  | "account_number"
  | "ifsc"
  | "bank_name"
  | "branch"
  | "account_holder"
  | "uan"
  | "member_id"
  | "establishment"
  | "doj"
  | "doe"
  | "balance"
  | "roll_number"
  | "board"
  | "year_of_passing"
  | "percentage"
  | "stream"
  | "annual_income"
  | "issue_date"
  | "issuing_authority"
  | "institution"
  | "course"
  | "course_year"
  | "study_mode"
  | "academic_year"
  // Form 16 (TDS certificate)
  | "tan"
  | "employer"
  | "assessment_year"
  | "gross_salary"
  | "tds_amount"
  // Land record (khatauni / RoR / 7-12 / pahani)
  | "khata_number"
  | "survey_number"
  | "land_area"
  | "village";

export interface BBox {
  /** Normalised 0..1 coordinates relative to the page. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ExtractionMethod = "text-layer" | "ocr" | "manual";

export interface ExtractedField {
  key: FieldKey;
  value: string;
  /** Value exactly as it appeared in the source before cleaning. */
  raw: string;
  /** 0..1 */
  confidence: number;
  page: number;
  bbox?: BBox;
  method: ExtractionMethod;
  status: "extracted" | "confirmed" | "edited";
  /** Set when the user edits — the original extraction is never discarded. */
  originalValue?: string;
  /**
   * Data minimisation: for some identifiers (Aadhaar) the full value is checked once at
   * extraction time and then only the masked value plus the check result is kept.
   */
  minimised?: { valid: boolean; evaluable: boolean; reasons: string[] };
}

export interface QualityIssue {
  code: "blur" | "dark" | "overexposed" | "low_contrast" | "low_resolution" | "cropped" | "glare" | "low_ocr_confidence" | "no_text";
  message: string;
  page: number;
  measured: string;
}

export interface QualityReport {
  checked: boolean;
  /** "digital" = native PDF text layer; "image" = pixels analysed. */
  kind: "digital" | "image";
  metrics: Record<string, number>;
  issues: QualityIssue[];
}

export type DocStatus = "uploaded" | "processing" | "analysed" | "needs_attention" | "failed";

export interface DocumentRecord {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  typeId: DocTypeId;
  typeConfidence: number;
  typeSource: "auto" | "user";
  status: DocStatus;
  pageCount: number;
  pageSizes: { width: number; height: number }[];
  textMethod?: ExtractionMethod;
  ocrConfidence?: number;
  quality?: QualityReport;
  fields: ExtractedField[];
  missingFields: FieldKey[];
  error?: string;
  addedAt: string;
  /** Increments each time the document is replaced. */
  version: number;
  synthetic: boolean;
  /** The checklist slot the user uploaded this into (detection may find another type). */
  requestedType?: DocTypeId;
}

/** Text with layout, produced by the ingest layer (pdf.js text layer or Tesseract). */
export interface TextLine {
  text: string;
  page: number;
  bbox: BBox;
  /** 0..1 */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Knowledge base

export type RuleBasis =
  /** Taken from an official notification / portal page. */
  | "official"
  /** Reported by reputable secondary sources; official text not yet confirmed. */
  | "secondary"
  /** Generic data-quality check performed by RejectLess (not an official requirement). */
  | "engine"
  /** Illustrative rule for the demo — not an official requirement. */
  | "demo";

export interface OfficialSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  kind: "official" | "secondary";
  publishedOn?: string;
  accessedOn: string;
  note?: string;
}

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type FindingStatus = "passed" | "review" | "action" | "external";
export type CheckCategory = "completeness" | "quality" | "consistency" | "identity" | "format" | "eligibility" | "external";

export interface RuleDef {
  id: string;
  version: string;
  title: string;
  description: string;
  category: CheckCategory;
  check: string;
  params?: Record<string, unknown>;
  requiredFields: FieldKey[];
  severity: Severity;
  whyItMatters: string;
  recommendation: string;
  sourceIds: string[];
  basis: RuleBasis;
  effectiveFrom?: string;
  lastVerified: string;
  active: boolean;
}

export interface DocRequirement {
  docType: DocTypeId;
  need: "required" | "conditional" | "recommended";
  why: string;
  condition?: string;
}

export interface DraftFieldDef {
  key: string;
  label: string;
  type: "text" | "date" | "number" | "select" | "boolean";
  options?: { value: string; label: string }[];
  help?: string;
  /** Maps the draft field onto a canonical attribute for cross-checking. */
  maps?: FieldKey;
  sensitive?: boolean;
  /** Heading shown above the first field of each group (mirrors the portal's tabs). */
  section?: string;
}

export interface ApplicationVariant {
  id: string;
  name: string;
  formName: string;
  summary: string;
  whoFor: string;
  conditions: string[];
  documents: DocRequirement[];
  ruleIds: string[];
  draftFields: DraftFieldDef[];
  /** A passport-style photo the portal asks for, with its upload limits. */
  photoSpec?: { label: string; width: number; height: number; maxKb: number; note: string };
}

export interface ApplicationDef {
  id: string;
  categoryId: string;
  name: string;
  shortName: string;
  authority: string;
  description: string;
  audience: string;
  status: "available" | "coming_soon";
  officialPortal?: string;
  rulePackVersion: string;
  lastReviewed: string;
  notices: string[];
  variants: ApplicationVariant[];
  sourceIds: string[];
}

// ---------------------------------------------------------------------------
// Findings

export interface Observation {
  docId?: string;
  docLabel: string;
  field: FieldKey | string;
  fieldLabel: string;
  value: string;
  page?: number;
  bbox?: BBox;
  confidence?: number;
}

export interface Finding {
  /** Stable across runs: rule + subject. Used to track resolution. */
  key: string;
  ruleId: string;
  ruleVersion: string;
  title: string;
  category: CheckCategory;
  status: FindingStatus;
  severity: Severity;
  summary: string;
  whyItMatters: string;
  recommendation: string;
  observations: Observation[];
  /** Human-readable reasoning steps (the "evidence chain"). */
  signals: string[];
  /** 0..1 — how certain the engine is about this result. */
  confidence: number;
  sourceIds: string[];
  basis: RuleBasis;
  /** Privacy-safe description used for AI assistance (no raw identifiers). */
  abstract: string;
  affectedDocIds: string[];
  /** Set when the check could not run: the plain-language name of the missing input. */
  missingInput?: string;
}

export type ResolutionState = "open" | "acknowledged" | "confirmed_correct" | "resolved";

export interface ResolutionEvent {
  at: string;
  state: ResolutionState;
  note: string;
  runId?: string;
}

export interface FindingResolution {
  state: ResolutionState;
  history: ResolutionEvent[];
}

export interface ValidationRun {
  id: string;
  at: string;
  findings: Finding[];
  stages: { id: string; label: string; ms: number; count: number }[];
  ruleVersions: string;
  /** Fingerprint of the documents and details this run checked (detects later changes). */
  inputSig?: string;
}
