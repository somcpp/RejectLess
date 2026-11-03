import type { DocTypeId } from "@/engine/types";
import { PERSONAS, ddmmyyyy, inr, monthsAgo, spellingVariant, swapDigits, type Persona } from "./personas";

export interface Degrade {
  blur?: number;
  dark?: number;
  crop?: number;
  /** 0..1 — size of a white reflection painted over the page. */
  glare?: number;
  rotate?: number;
}

export interface DocSpec {
  type: DocTypeId;
  format: "pdf" | "photo";
  fileName: string;
  data: Record<string, string>;
  degrade?: Degrade;
}

export interface Fix {
  id: string;
  label: string;
  description: string;
  replaces?: DocTypeId;
  doc?: DocSpec;
  draftPatch?: Record<string, string>;
}

export interface Scenario {
  id: string;
  number: string;
  title: string;
  appId: string;
  variantId: string;
  personaId: string;
  story: string;
  expected: string;
  tags: string[];
  docs: DocSpec[];
  draft: Record<string, string>;
  fixes: Fix[];
}

// ---------------------------------------------------------------------------- document builders

const slug = (p: Persona) => p.id;

export function aadhaarDoc(p: Persona, o: Partial<Record<string, string>> = {}, format: DocSpec["format"] = "pdf"): DocSpec {
  return {
    type: "aadhaar",
    format,
    fileName: `${slug(p)}-e-aadhaar-masked.${format === "pdf" ? "pdf" : "jpg"}`,
    data: { name: p.name, nameLocal: p.nameLocal, dob: p.dob, gender: p.gender, genderLocal: p.genderLocal, last4: p.aadhaarLast4, ...o } as Record<string, string>,
  };
}

export function panDoc(p: Persona, o: Partial<Record<string, string>> = {}): DocSpec {
  return {
    type: "pan",
    format: "pdf",
    fileName: `${slug(p)}-e-pan.pdf`,
    data: { name: p.name.toUpperCase(), father: p.father.toUpperCase(), dob: p.dob, pan: p.pan ?? "", ...o } as Record<string, string>,
  };
}

export function passbookDoc(p: Persona, o: Partial<Record<string, string>> = {}, format: DocSpec["format"] = "pdf", degrade?: Degrade): DocSpec {
  return {
    type: "bank_passbook",
    format,
    fileName: `${slug(p)}-passbook-first-page.${format === "pdf" ? "pdf" : "jpg"}`,
    data: { holder: p.bank.holder, account: p.bank.account, ifsc: p.bank.ifsc, bank: p.bank.bank, branch: p.bank.branch, city: p.bank.city, ...o } as Record<string, string>,
    degrade,
  };
}

export function chequeDoc(p: Persona, o: Partial<Record<string, string>> = {}, format: DocSpec["format"] = "photo"): DocSpec {
  return {
    type: "cancelled_cheque",
    format,
    fileName: `${slug(p)}-cancelled-cheque.${format === "pdf" ? "pdf" : "jpg"}`,
    data: { holder: p.bank.holder.toUpperCase(), account: p.bank.account, ifsc: p.bank.ifsc, bank: p.bank.bank, branch: p.bank.branch, city: p.bank.city, ...o } as Record<string, string>,
  };
}

export function epfDoc(p: Persona, o: Partial<Record<string, string>> = {}): DocSpec {
  const e = p.epf!;
  return {
    type: "epf_passbook",
    format: "pdf",
    fileName: `${slug(p)}-epf-member-passbook.pdf`,
    data: {
      name: p.name.toUpperCase(),
      father: p.father.toUpperCase(),
      dob: p.dob,
      uan: e.uan,
      memberId: e.memberId,
      establishment: e.establishment,
      doj: ddmmyyyy(monthsAgo(e.dojMonthsAgo, 3)),
      doe: e.doeMonthsAgo !== undefined ? ddmmyyyy(monthsAgo(e.doeMonthsAgo, 20)) : "Not available",
      balance: inr(e.balance),
      ...o,
    } as Record<string, string>,
  };
}

export function marksheetDoc(p: Persona, o: Partial<Record<string, string>> = {}): DocSpec {
  const s = p.student!;
  return {
    type: "marksheet_12",
    format: "pdf",
    fileName: `${slug(p)}-class-xii-marksheet.pdf`,
    data: { name: p.name.toUpperCase(), father: p.father.toUpperCase(), dob: p.dob, roll: s.roll, board: s.board, year: s.year, percentage: s.percentage, stream: s.stream, ...o } as Record<string, string>,
  };
}

export function incomeDoc(p: Persona, o: Partial<Record<string, string>> = {}): DocSpec {
  const s = p.student!;
  return {
    type: "income_certificate",
    format: "pdf",
    fileName: `${slug(p)}-income-certificate.pdf`,
    data: {
      name: p.nameLocal,
      father: p.fatherLocal,
      income: inr(s.income),
      issued: ddmmyyyy(monthsAgo(s.incomeIssuedMonthsAgo, 12)),
      tehsil: s.tehsil,
      certNo: `ICDEMO/${new Date().getUTCFullYear()}/${p.aadhaarLast4}`,
      ...o,
    } as Record<string, string>,
  };
}

export function bonafideDoc(p: Persona, o: Partial<Record<string, string>> = {}): DocSpec {
  const s = p.student!;
  return {
    type: "bonafide_certificate",
    format: "pdf",
    fileName: `${slug(p)}-bonafide-certificate.pdf`,
    data: { name: p.name, institution: s.institution, course: s.course, courseYear: s.courseYear, mode: s.mode, academicYear: s.academicYear, ...o } as Record<string, string>,
  };
}

function epfDraft(p: Persona, o: Record<string, string> = {}): Record<string, string> {
  const e = p.epf!;
  const iso = (dmy: string) => dmy.split("/").reverse().join("-");
  return {
    name: p.name,
    dob: iso(p.dob),
    father_name: p.father,
    ...(e.doeMonthsAgo !== undefined ? { doe: iso(ddmmyyyy(monthsAgo(e.doeMonthsAgo, 20))) } : {}),
    account_number: p.bank.account,
    ifsc: p.bank.ifsc,
    pan_linked: p.pan ? "yes" : "no",
    ...o,
  };
}

function nspDraft(p: Persona, o: Record<string, string> = {}): Record<string, string> {
  return {
    name: p.name,
    dob: p.dob.split("/").reverse().join("-"),
    father_name: p.father,
    annual_income: String(p.student!.income),
    account_number: p.bank.account,
    ifsc: p.bank.ifsc,
    other_scholarship: "no",
    ...o,
  };
}

// ---------------------------------------------------------------------------- seeded scenarios

const { anjali: A, saurabh: S, imran: I, kavita: K, priya: P, rahul: R } = PERSONAS;

export const SCENARIOS: Scenario[] = [
  {
    id: "perfect",
    number: "01",
    title: "Everything in order",
    appId: "epfo-withdrawal",
    variantId: "final-settlement",
    personaId: "anjali",
    story: "Anjali left her job 14 months ago after 6 years of service and wants her full PF balance.",
    expected: "All checks pass. Only the external items EPFO must confirm remain.",
    tags: ["Baseline"],
    docs: [aadhaarDoc(A), epfDoc(A), passbookDoc(A), panDoc(A)],
    draft: epfDraft(A),
    fixes: [],
  },
  {
    id: "name-spelling",
    number: "02",
    title: "Name spelt differently by the bank",
    appId: "epfo-withdrawal",
    variantId: "final-settlement",
    personaId: "saurabh",
    story: "Saurabh's bank passbook prints his name as \"Sourabh\". Everything else looks fine.",
    expected: "Review recommended: a transliteration variant (au/ou) — not proof of a different person.",
    tags: ["Identity", "Indic matching"],
    docs: [aadhaarDoc(S), epfDoc(S), passbookDoc(S, { holder: spellingVariant(S.name) }), panDoc(S)],
    draft: epfDraft(S),
    fixes: [
      {
        id: "bank-name-corrected",
        label: "Upload corrected passbook",
        description: "Saurabh visited his branch with his Aadhaar and got the name corrected. The reprinted first page shows \"Saurabh Kumar\".",
        replaces: "bank_passbook",
        doc: passbookDoc(S),
      },
    ],
  },
  {
    id: "hindi-english",
    number: "03",
    title: "Hindi passbook, English Aadhaar",
    appId: "epfo-withdrawal",
    variantId: "final-settlement",
    personaId: "saurabh",
    story: "Saurabh's rural branch prints the account holder name in Hindi (सौरभ कुमार) while other records use English.",
    expected: "Passes: RejectLess transliterates Devanagari and recognises the same name across scripts.",
    tags: ["Indic matching", "Devanagari"],
    docs: [aadhaarDoc(S), epfDoc(S), passbookDoc(S, { holder: S.nameLocal }), panDoc(S)],
    draft: epfDraft(S),
    fixes: [],
  },
  {
    id: "dob-mismatch",
    number: "04",
    title: "Date of birth differs on PAN",
    appId: "epfo-withdrawal",
    variantId: "final-settlement",
    personaId: "saurabh",
    story: "Saurabh's PAN records his date of birth with the day and month swapped.",
    expected: "Action required: significant mismatch; the evidence shows day/month appear swapped.",
    tags: ["Identity", "Dates"],
    docs: [aadhaarDoc(S), epfDoc(S), passbookDoc(S), panDoc(S, { dob: "08/05/1998" })],
    draft: epfDraft(S),
    fixes: [
      {
        id: "pan-corrected",
        label: "Upload corrected e-PAN",
        description: "After a PAN data correction request, Saurabh downloaded a fresh e-PAN with the right date of birth.",
        replaces: "pan",
        doc: panDoc(S),
      },
    ],
  },
  {
    id: "missing-docs",
    number: "05",
    title: "Missing documents",
    appId: "epfo-withdrawal",
    variantId: "final-settlement",
    personaId: "saurabh",
    story: "Saurabh only has his Aadhaar and EPF passbook to hand. With under 5 years of service, TDS may apply.",
    expected: "Action required: bank passbook missing, PAN needed because TDS may apply.",
    tags: ["Completeness", "TDS"],
    docs: [aadhaarDoc(S), epfDoc(S)],
    draft: epfDraft(S, { pan_linked: "unsure" }),
    fixes: [
      { id: "add-passbook", label: "Add bank passbook", description: "Add the first page of the bank passbook.", doc: passbookDoc(S) },
      { id: "add-pan", label: "Add e-PAN", description: "Add the e-PAN so its format and name can be checked.", doc: panDoc(S), draftPatch: { pan_linked: "yes" } },
    ],
  },
  {
    id: "poor-scan",
    number: "06",
    title: "Blurry passbook photo",
    appId: "epfo-withdrawal",
    variantId: "final-settlement",
    personaId: "anjali",
    story: "Anjali photographed her passbook in a dim room and the phone did not focus.",
    expected: "Action required: image quality. Fields read with low confidence are flagged for confirmation.",
    tags: ["Quality", "OCR"],
    docs: [aadhaarDoc(A), epfDoc(A), passbookDoc(A, {}, "photo", { blur: 2.6, dark: 0.55 }), panDoc(A)],
    draft: epfDraft(A),
    fixes: [
      { id: "clear-statement", label: "Upload bank e-statement", description: "Anjali downloads the first page of her bank statement as a PDF instead.", replaces: "bank_passbook", doc: passbookDoc(A) },
    ],
  },
  {
    id: "ifsc-merged",
    number: "07",
    title: "Old IFSC after a bank merger",
    appId: "epfo-withdrawal",
    variantId: "final-settlement",
    personaId: "saurabh",
    story: "Saurabh's old co-operative bank merged into Bharat Demo Bank. His cheque book and his notes still have the old IFSC.",
    expected: "Action required: IFSC mismatch across documents, and the old code is marked as merged in the reference snapshot.",
    tags: ["Banking", "Reference data"],
    docs: [
      aadhaarDoc(S),
      epfDoc(S),
      passbookDoc(S),
      chequeDoc(S, { ifsc: "UDCB0000318", bank: "Udaya Demo Co-operative Bank", branch: "Ashok Rajpath" }),
      panDoc(S),
    ],
    draft: epfDraft(S, { ifsc: "UDCB0000318" }),
    fixes: [
      { id: "update-ifsc", label: "Use the new IFSC", description: "Update the IFSC in the application details to the current code from the passbook.", draftPatch: { ifsc: "BDBK0001234" } },
      { id: "new-cheque", label: "Upload new cheque", description: "Saurabh gets a new cheque book printed with the merged bank's IFSC.", replaces: "cancelled_cheque", doc: chequeDoc(S) },
    ],
  },
  {
    id: "multiple",
    number: "08",
    title: "Several problems at once",
    appId: "epfo-withdrawal",
    variantId: "final-settlement",
    personaId: "saurabh",
    story: "Saurabh left his job 7 months ago. His passbook spells his name differently, he swapped two digits typing his account number, and he has not linked his PAN.",
    expected: "Several action items: waiting period not met, account number mismatch, PAN missing for TDS, plus a name review.",
    tags: ["Combined"],
    docs: [aadhaarDoc(S), epfDoc(S, { doe: ddmmyyyy(monthsAgo(7, 20)) }), passbookDoc(S, { holder: spellingVariant(S.name) })],
    draft: epfDraft(S, { account_number: swapDigits(S.bank.account, 5), doe: monthsAgo(7, 20).toISOString().slice(0, 10), pan_linked: "no" }),
    fixes: [
      { id: "fix-account", label: "Correct account number", description: "Re-type the account number from the passbook.", draftPatch: { account_number: S.bank.account } },
      { id: "fix-passbook", label: "Upload corrected passbook", description: "Name corrected at the branch.", replaces: "bank_passbook", doc: passbookDoc(S) },
      { id: "fix-pan", label: "Add e-PAN", description: "Add PAN and link it to the UAN.", doc: panDoc(S), draftPatch: { pan_linked: "yes" } },
    ],
  },
  {
    id: "insufficient",
    number: "09",
    title: "Not enough information",
    appId: "epfo-withdrawal",
    variantId: "final-settlement",
    personaId: "anjali",
    story: "Anjali's old Aadhaar shows only her year of birth, and her former employer has not recorded a date of exit.",
    expected: "Uncertain results: date of exit missing, eligibility cannot be computed, only the birth year can be compared.",
    tags: ["Uncertainty"],
    docs: [aadhaarDoc(A, { dob: "", yob: "1994" }), epfDoc(A, { doe: "Not available" }), passbookDoc(A), panDoc(A)],
    draft: epfDraft(A, { doe: "" }),
    fixes: [
      {
        id: "doe-updated",
        label: "Employer updated exit date",
        description: "The former employer marks the date of exit; Anjali downloads a fresh passbook.",
        replaces: "epf_passbook",
        doc: epfDoc(A),
        draftPatch: { doe: monthsAgo(14, 20).toISOString().slice(0, 10) },
      },
    ],
  },
  {
    id: "guided-fix",
    number: "10",
    title: "Fix it and check again",
    appId: "epfo-withdrawal",
    variantId: "final-settlement",
    personaId: "saurabh",
    story: "A guided walkthrough: start with a name variant and an account-number typo, apply each fix, and watch findings resolve on the re-check.",
    expected: "After applying the fixes and re-checking, the findings move to Resolved with an audit trail.",
    tags: ["Remediation"],
    docs: [aadhaarDoc(S), epfDoc(S), passbookDoc(S, { holder: spellingVariant(S.name) }), panDoc(S)],
    draft: epfDraft(S, { account_number: swapDigits(S.bank.account, 5) }),
    fixes: [
      { id: "fix-account", label: "Correct account number", description: "Re-type the account number from the passbook.", draftPatch: { account_number: S.bank.account } },
      { id: "fix-passbook", label: "Upload corrected passbook", description: "Name corrected at the branch.", replaces: "bank_passbook", doc: passbookDoc(S) },
    ],
  },
  {
    id: "pension-ineligible",
    number: "11",
    title: "Pension withdrawal after 11 years",
    appId: "epfo-withdrawal",
    variantId: "pension-withdrawal",
    personaId: "imran",
    story: "Imran worked for 11 years and left 8 months ago. He wants to withdraw his pension contribution with Form 10C.",
    expected: "Action required: 10+ years of service means a scheme certificate or pension, not a withdrawal; waiting period also not met.",
    tags: ["Eligibility", "Form 10C"],
    docs: [aadhaarDoc(I), epfDoc(I), passbookDoc(I)],
    draft: epfDraft(I),
    fixes: [],
  },
  {
    id: "partial-early",
    number: "12",
    title: "Partial withdrawal too early",
    appId: "epfo-withdrawal",
    variantId: "partial-withdrawal",
    personaId: "kavita",
    story: "Kavita joined 8 months ago and wants ₹60,000 for a family medical emergency.",
    expected: "Action required: under 12 months of membership, and the amount exceeds 75% of the balance.",
    tags: ["Eligibility", "Form 31"],
    docs: [aadhaarDoc(K), epfDoc(K), passbookDoc(K)],
    draft: { ...epfDraft(K), purpose: "essential", amount: "60000" },
    fixes: [{ id: "lower-amount", label: "Lower the amount", description: "Request ₹45,000, within 75% of the balance.", draftPatch: { amount: "45000" } }],
  },
  {
    id: "nsp-ready",
    number: "13",
    title: "Scholarship with a Hindi certificate",
    appId: "nsp-csss",
    variantId: "fresh",
    personaId: "priya",
    story: "Priya scored 91.4% in Class XII. Her income certificate from the tehsil is entirely in Hindi.",
    expected: "Passes: names match across Hindi and English documents. Board cut-off is an external check.",
    tags: ["Scholarship", "Devanagari"],
    docs: [aadhaarDoc(P), marksheetDoc(P), incomeDoc(P), bonafideDoc(P), passbookDoc(P)],
    draft: nspDraft(P),
    fixes: [],
  },
  {
    id: "nsp-glare",
    number: "15",
    title: "Glare on the Aadhaar photo",
    appId: "nsp-csss",
    variantId: "fresh",
    personaId: "priya",
    story: "Priya photographed her Aadhaar under a tube light; a bright reflection covers part of the card.",
    expected: "Details are still read, so nothing fails — the Confirm step shows a 'photo has glare' advisory with a retake button. Replacing the photo clears it.",
    tags: ["Quality", "Photo"],
    docs: [{ ...aadhaarDoc(P, {}, "photo"), degrade: { glare: 1 } }, marksheetDoc(P), incomeDoc(P), bonafideDoc(P), passbookDoc(P)],
    draft: nspDraft(P),
    fixes: [{ id: "retake-aadhaar", label: "Retake the Aadhaar photo", description: "Priya photographs the card again in even light.", replaces: "aadhaar", doc: aadhaarDoc(P, {}, "photo") }],
  },
  {
    id: "nsp-issues",
    number: "14",
    title: "Scholarship with a parent's account",
    appId: "nsp-csss",
    variantId: "fresh",
    personaId: "rahul",
    story: "Rahul uses his father's bank account. His income certificate is 18 months old and shows ₹4.8 lakh; his marksheet adds \"Kumar\" to his father's name.",
    expected: "Action required: account not in the student's name, income above the limit; review for the old certificate and father's-name variation.",
    tags: ["Scholarship", "Eligibility"],
    docs: [
      aadhaarDoc(R),
      marksheetDoc(R, { father: "SURESH KUMAR MEENA" }),
      incomeDoc(R),
      bonafideDoc(R),
      passbookDoc(R),
    ],
    draft: nspDraft(R, { account_number: R.bank.account }),
    fixes: [
      {
        id: "own-account",
        label: "Open own account",
        description: "Rahul opens a savings account in his own name and uses its first page.",
        replaces: "bank_passbook",
        doc: passbookDoc(R, { holder: R.name, account: "61008556120" }),
        draftPatch: { account_number: "61008556120" },
      },
    ],
  },
];

export function getScenario(id: string) {
  return SCENARIOS.find((s) => s.id === id);
}

// ---------------------------------------------------------------------------- scenario builder

export interface BuilderOptions {
  variantId: "final-settlement" | "pension-withdrawal" | "partial-withdrawal" | "nsp";
  defects: string[];
  photoDocs: boolean;
}

export const BUILDER_DEFECTS: { id: string; label: string; group: string; applies: BuilderOptions["variantId"][] }[] = [
  { id: "name_spelling", label: "Bank spells the name differently", group: "Identity", applies: ["final-settlement", "pension-withdrawal", "partial-withdrawal", "nsp"] },
  { id: "name_hindi", label: "Bank prints the name in Hindi", group: "Identity", applies: ["final-settlement", "pension-withdrawal", "partial-withdrawal", "nsp"] },
  { id: "name_different", label: "A different person's name on the bank record", group: "Identity", applies: ["final-settlement", "pension-withdrawal", "partial-withdrawal", "nsp"] },
  { id: "dob_swap", label: "Date of birth differs on one document", group: "Identity", applies: ["final-settlement", "pension-withdrawal", "partial-withdrawal", "nsp"] },
  { id: "account_typo", label: "Typo in the account number you enter", group: "Banking", applies: ["final-settlement", "pension-withdrawal", "partial-withdrawal", "nsp"] },
  { id: "ifsc_letter_o", label: "Letter O instead of zero in the IFSC you enter", group: "Banking", applies: ["final-settlement", "pension-withdrawal", "partial-withdrawal", "nsp"] },
  { id: "ifsc_merged", label: "Old IFSC from a merged bank", group: "Banking", applies: ["final-settlement", "pension-withdrawal", "partial-withdrawal", "nsp"] },
  { id: "blur", label: "Blurry passbook photo", group: "Quality", applies: ["final-settlement", "pension-withdrawal", "partial-withdrawal", "nsp"] },
  { id: "cropped", label: "Cropped passbook photo", group: "Quality", applies: ["final-settlement", "pension-withdrawal", "partial-withdrawal", "nsp"] },
  { id: "glare", label: "Glare on the Aadhaar photo", group: "Quality", applies: ["final-settlement", "pension-withdrawal", "partial-withdrawal", "nsp"] },
  { id: "missing_bank", label: "Leave out the bank passbook", group: "Completeness", applies: ["final-settlement", "pension-withdrawal", "partial-withdrawal", "nsp"] },
  { id: "recent_exit", label: "Left the job only 5 months ago", group: "Eligibility", applies: ["final-settlement", "pension-withdrawal"] },
  { id: "no_pan", label: "No PAN available", group: "Eligibility", applies: ["final-settlement"] },
  { id: "over_amount", label: "Ask for more than 75% of the balance", group: "Eligibility", applies: ["partial-withdrawal"] },
  { id: "parent_account", label: "Parent's bank account", group: "Eligibility", applies: ["nsp"] },
  { id: "high_income", label: "Family income above ₹4.5 lakh", group: "Eligibility", applies: ["nsp"] },
  { id: "distance", label: "Distance-mode course", group: "Eligibility", applies: ["nsp"] },
  { id: "old_certificate", label: "Income certificate older than a year", group: "Eligibility", applies: ["nsp"] },
];

export function buildScenario(opts: BuilderOptions): Scenario {
  const d = new Set(opts.defects);
  const nsp = opts.variantId === "nsp";
  const base: Persona = nsp ? P : opts.variantId === "partial-withdrawal" ? K : opts.variantId === "pension-withdrawal" ? { ...I, epf: { ...I.epf!, dojMonthsAgo: 70 } } : S;
  const p: Persona = structuredClone(base);
  if (d.has("recent_exit") && p.epf) p.epf.doeMonthsAgo = 5;
  if (nsp && p.student) {
    if (d.has("high_income")) p.student.income = 520000;
    if (d.has("distance")) p.student.mode = "Distance (Correspondence)";
    if (d.has("old_certificate")) p.student.incomeIssuedMonthsAgo = 16;
  }

  let holder = p.bank.holder;
  if (d.has("name_spelling")) holder = spellingVariant(p.name);
  if (d.has("name_hindi")) holder = p.nameLocal;
  if (d.has("name_different")) holder = nsp ? "Neha Sharma" : "Gaurav Kumar";
  if (d.has("parent_account")) holder = p.father;
  const bankIfsc = d.has("ifsc_merged") ? "UDCB0000318" : p.bank.ifsc;
  // Day/month swap when that gives a valid date (05/08 → 08/05), otherwise a year typo.
  const swapDob = (dmy: string) => {
    const [dd, mm, yy] = dmy.split("/");
    return +dd <= 12 ? `${mm}/${dd}/${yy}` : `${dd}/${mm}/${+yy + 1}`;
  };

  const photo = d.has("blur") || d.has("cropped") || opts.photoDocs;
  const degrade: Degrade | undefined = d.has("blur") ? { blur: 2.6, dark: 0.6 } : d.has("cropped") ? { crop: 0.18 } : undefined;
  const docs: DocSpec[] = [d.has("glare") ? { ...aadhaarDoc(p, {}, "photo"), degrade: { glare: 1 } } : aadhaarDoc(p, {}, opts.photoDocs ? "photo" : "pdf")];
  if (nsp) {
    docs.push(marksheetDoc(p, d.has("dob_swap") ? { dob: swapDob(p.dob) } : {}), incomeDoc(p), bonafideDoc(p));
  } else {
    docs.push(epfDoc(p));
    if (!d.has("no_pan") && opts.variantId === "final-settlement") docs.push(panDoc(p, d.has("dob_swap") ? { dob: swapDob(p.dob) } : {}));
    if (d.has("dob_swap") && opts.variantId !== "final-settlement") docs[1] = epfDoc(p, { dob: swapDob(p.dob) });
  }
  if (!d.has("missing_bank")) {
    docs.push(passbookDoc(p, { holder, ifsc: bankIfsc, ...(d.has("ifsc_merged") ? { bank: "Udaya Demo Co-operative Bank", branch: "Ashok Rajpath" } : {}) }, photo ? "photo" : "pdf", degrade));
  }

  let draft = nsp ? nspDraft(p) : epfDraft(p);
  if (d.has("account_typo")) draft.account_number = swapDigits(p.bank.account, 5);
  if (d.has("ifsc_letter_o")) draft.ifsc = p.bank.ifsc.slice(0, 4) + "O" + p.bank.ifsc.slice(5);
  else if (d.has("ifsc_merged")) draft.ifsc = "UDCB0000318";
  if (d.has("no_pan")) draft.pan_linked = "no";
  if (opts.variantId === "partial-withdrawal") draft = { ...draft, purpose: "essential", amount: d.has("over_amount") ? "60000" : "30000" };

  const fixes: Fix[] = [];
  if (!d.has("missing_bank") && (holder !== p.bank.holder || bankIfsc !== p.bank.ifsc || degrade)) {
    fixes.push({ id: "fix-bank", label: "Upload a clean, corrected passbook", description: "A clear PDF with the correct details.", replaces: "bank_passbook", doc: passbookDoc(p, nsp ? { holder: p.name } : {}) });
  }
  if (d.has("missing_bank")) fixes.push({ id: "add-bank", label: "Add bank passbook", description: "Add the missing passbook.", doc: passbookDoc(p, nsp ? { holder: p.name } : {}) });
  if (d.has("account_typo") || d.has("ifsc_letter_o") || d.has("ifsc_merged")) {
    fixes.push({ id: "fix-draft", label: "Correct bank details", description: "Re-type the account number and IFSC from the passbook.", draftPatch: { account_number: p.bank.account, ifsc: p.bank.ifsc } });
  }
  if (d.has("no_pan")) fixes.push({ id: "add-pan", label: "Add e-PAN", description: "Add PAN and link it to the UAN.", doc: panDoc(p), draftPatch: { pan_linked: "yes" } });

  return {
    id: "custom",
    number: "★",
    title: "Your custom scenario",
    appId: nsp ? "nsp-csss" : "epfo-withdrawal",
    variantId: nsp ? "fresh" : opts.variantId,
    personaId: p.id,
    story: `Generated from ${opts.defects.length} selected problem${opts.defects.length === 1 ? "" : "s"}. Documents are freshly rendered and analysed by the real pipeline.`,
    expected: "Whatever the engine finds — nothing is pre-scripted.",
    tags: ["Custom"],
    docs,
    draft,
    fixes,
  };
}
