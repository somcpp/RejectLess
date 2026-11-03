import type { BBox, DocTypeId, ExtractedField, ExtractionMethod, FieldKey, TextLine } from "../types";
import { DOC_TYPES } from "@/knowledge/documents";
import { checkAadhaarFormat, maskIdentifier, parseDate, toISO } from "../validators";
import { hasDevanagari } from "../text/transliterate";

// ---------------------------------------------------------------------------- classification

export function classify(lines: TextLine[]): { typeId: DocTypeId; confidence: number; scores: Record<string, number> } {
  const text = lines.map((l) => l.text).join("\n").toLowerCase();
  const scores: Record<string, number> = {};
  for (const def of Object.values(DOC_TYPES)) {
    scores[def.id] = def.keywords.reduce((s, k) => s + (text.includes(k.term) ? k.weight : 0), 0);
  }
  // Structural signals: identifier patterns are stronger evidence than headings.
  if (/\b(\d{4}\s\d{4}\s\d{4}|[a-z*×]{4}\s?[a-z*×]{4}\s?\d{4})\b/.test(text) && /\b(dob|year of birth)\b|जन्म/.test(text)) scores.aadhaar += 3;
  if (/\b(male|female)\b|पुरुष|महिला/.test(text)) scores.aadhaar += 1;
  if (/\b[a-z]{3}p[a-z]\d{4}[a-z]\b/.test(text)) scores.pan += 2;
  if (/\b[a-z]{4}0[a-z0-9]{6}\b/.test(text)) {
    scores.bank_passbook += 1;
    scores.cancelled_cheque += 1;
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [best, second] = ranked;
  if (!best || best[1] < 3) return { typeId: "unknown", confidence: 0, scores };
  const confidence = Math.min(0.99, best[1] / (best[1] + (second?.[1] ?? 0) + 1));
  return { typeId: best[0] as DocTypeId, confidence, scores };
}

// ---------------------------------------------------------------------------- helpers

interface Hit {
  value: string;
  raw: string;
  line: TextLine;
  bbox: BBox;
  certainty: number;
}

const SEP = /^[\s:：\-–|/]+/;

function subBox(line: TextLine, start: number, end: number): BBox {
  const len = Math.max(1, line.text.length);
  return {
    x: line.bbox.x + (line.bbox.w * start) / len,
    y: line.bbox.y,
    w: Math.max(0.01, (line.bbox.w * (end - start)) / len),
    h: line.bbox.h,
  };
}

/** Finds `label` and returns the text after it on the same line, or the next line. */
function labelValue(lines: TextLine[], labels: RegExp[], opts: { nextLine?: boolean; stopAt?: RegExp } = {}): Hit | undefined {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const re of labels) {
      const m = line.text.match(re);
      if (!m || m.index === undefined) continue;
      const after = line.text.slice(m.index + m[0].length);
      let value = after.replace(SEP, "");
      if (opts.stopAt) value = value.split(opts.stopAt)[0];
      value = value.trim();
      if (value) {
        const start = line.text.length - after.length + (after.length - after.replace(SEP, "").length);
        return { value, raw: value, line, bbox: subBox(line, start, start + value.length), certainty: 0.95 };
      }
      if (opts.nextLine !== false && lines[i + 1] && lines[i + 1].page === line.page) {
        const next = lines[i + 1];
        return { value: next.text.trim(), raw: next.text, line: next, bbox: next.bbox, certainty: 0.88 };
      }
    }
  }
  return undefined;
}

function regexHit(lines: TextLine[], re: RegExp, group = 0): Hit | undefined {
  for (const line of lines) {
    const m = line.text.match(re);
    if (m && m.index !== undefined) {
      const value = m[group] ?? m[0];
      const start = m.index + (group ? m[0].indexOf(value) : 0);
      return { value, raw: m[0], line, bbox: subBox(line, start, start + value.length), certainty: 0.92 };
    }
  }
  return undefined;
}

const DATE_RE = /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}|\d{1,2}[\s\-][A-Za-z]{3,9}[\s\-,]+\d{4}|\d{4}-\d{2}-\d{2})/;
const PAN_RE = /\b([A-Z]{5}[0-9]{4}[A-Z])\b/;
const IFSC_RE = /\b([A-Z]{4}[0O][A-Z0-9]{6})\b/;
const AADHAAR_RE = /\b(\d{4}\s?\d{4}\s?\d{4}|[Xx*]{4}\s?[Xx*]{4}\s?\d{4})\b/;
const ACCOUNT_RE = /\b(\d{9,18})\b/;
const AMOUNT_RE = /(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d{1,2})?)/i;

function cleanDate(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const m = v.match(DATE_RE);
  const p = parseDate(m?.[1] ?? v.trim());
  if (p) return toISO(p);
  // Keep a date-like value that cannot be parsed (e.g. 11/23/2006): the check will
  // report it as unreadable instead of the detail silently disappearing.
  const raw = v.match(/\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}/)?.[0];
  return raw ?? undefined;
}

function cleanName(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const s = v.replace(/[^A-Za-zऀ-ॿ .'-]/g, " ").replace(/\s+/g, " ").trim();
  return s.length >= 2 ? titleCase(s) : undefined;
}

function titleCase(s: string): string {
  if (hasDevanagari(s)) return s;
  return s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

function cleanAmount(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const m = v.match(AMOUNT_RE);
  if (!m) return undefined;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? String(Math.round(n)) : undefined;
}

// ---------------------------------------------------------------------------- per-type parsers

type Out = Partial<Record<FieldKey, Hit>>;

function withValue(h: Hit | undefined, value: string | undefined): Hit | undefined {
  return h && value ? { ...h, value } : undefined;
}

const TOTAL_LABEL = /(?:grand\s*total|total(?:\s*marks)?(?:\s*obtained)?|कुल\s*योग|योग|कुल\s*प्राप्तांक|महायोग)/i;
const MAX_LABEL = /(?:maximum\s*marks|max\.?\s*marks|full\s*marks|out\s*of|पूर्णांक|अधिकतम\s*अंक)/i;

/** Percentage from a totals row: "Total 365 / 500", or a total line plus a maximum-marks line. */
function totalsPercentage(lines: TextLine[]): Hit | undefined {
  const pick = (obt: number, max: number, line: TextLine): Hit | undefined => {
    if (!(max >= 100 && obt >= 0 && obt <= max)) return undefined;
    const value = String(Math.round((obt / max) * 10000) / 100);
    return { value, raw: line.text, line, bbox: line.bbox, certainty: 0.85 };
  };
  // Same line: "कुल योग 365 / 500", "Total 365 out of 500", or OCR'd columns "Total 500 365" / "Total 365 500".
  for (const line of lines) {
    const m =
      line.text.match(new RegExp(TOTAL_LABEL.source + String.raw`\D{0,25}?(\d{2,4})\s*(?:\/|out of|में से)\s*(\d{3,4})`, "i")) ??
      line.text.match(new RegExp(TOTAL_LABEL.source + String.raw`\D{0,25}?(\d{2,4})\s+(\d{2,4})\b`, "i"));
    if (m) {
      const [a, b] = [Number(m[1]), Number(m[2])];
      // Columns may come in either order; the maximum is the larger, round figure.
      const hit = pick(Math.min(a, b), Math.max(a, b), line);
      if (hit) return hit;
    }
  }
  // Separate lines: the last "Total …" number and any "Maximum marks …" number.
  let total: { n: number; line: TextLine } | undefined;
  let max: number | undefined;
  for (const line of lines) {
    const t = line.text.match(new RegExp(TOTAL_LABEL.source + String.raw`\D{0,25}?(\d{2,4})(?!\s*[\/%])`, "i"));
    if (t && !MAX_LABEL.test(line.text)) total = { n: Number(t[1]), line };
    const x = line.text.match(new RegExp(MAX_LABEL.source + String.raw`\D{0,25}?(\d{3,4})`, "i"));
    if (x) max = Number(x[1]);
  }
  return total && max ? pick(total.n, max, total.line) : undefined;
}

const PARSERS: Partial<Record<DocTypeId, (lines: TextLine[]) => Out>> = {
  aadhaar(lines) {
    const out: Out = {};
    const dobIdx = lines.findIndex((l) => /(dob|date of birth|जन्म तिथि|year of birth|जन्म वर्ष)/i.test(l.text));
    const dobLine = lines[dobIdx];
    if (dobLine) {
      const m = dobLine.text.match(DATE_RE);
      if (m) out.dob = withValue(regexHit([dobLine], DATE_RE, 1), cleanDate(m[1]));
      else {
        const y = dobLine.text.match(/\b(19|20)\d{2}\b/);
        if (y) out.yob = withValue(regexHit([dobLine], /\b(?:19|20)\d{2}\b/), y[0]);
      }
      // Names are printed just above the DOB line: English (Latin) and local script.
      // Skip card furniture that OCR may return as separate lines (headers, photo placeholder).
      const NOT_NAME = /government|india|aadhaar|photo|specimen|unique identification/i;
      const above = lines.slice(Math.max(0, dobIdx - 4), dobIdx).reverse();
      const latin = above.find((l) => /^[A-Za-z][A-Za-z .'-]{2,}$/.test(l.text.trim()) && !NOT_NAME.test(l.text));
      const local = above.find((l) => hasDevanagari(l.text) && !/सरकार|भारत|आधार/.test(l.text));
      if (latin) out.name = { value: cleanName(latin.text)!, raw: latin.text, line: latin, bbox: latin.bbox, certainty: 0.85 };
      if (local) out.name_local = { value: local.text.trim(), raw: local.text, line: local, bbox: local.bbox, certainty: 0.85 };
    }
    const g = regexHit(lines, /\b(MALE|FEMALE|TRANSGENDER|Male|Female)\b/);
    if (g) out.gender = { ...g, value: titleCase(g.value) };
    const a = regexHit(lines, AADHAAR_RE, 1);
    if (a) out.aadhaar_number = a;
    else {
      // OCR often reads the masking "X" as K, x or ×. Accept any 8 mask-like letters + 4 digits.
      const m = regexHit(lines, /\b([A-Za-z*×]{4}\s?[A-Za-z*×]{4}\s?\d{4})\b/, 1);
      if (m) out.aadhaar_number = { ...m, value: `XXXX XXXX ${m.value.slice(-4)}`, certainty: 0.8 };
    }
    return out;
  },

  pan(lines) {
    const out: Out = {};
    out.pan_number = regexHit(lines, PAN_RE, 1);
    const name = labelValue(lines, [/^name\b|^नाम\s*\/\s*name/i, /^नाम\s*\/\s*Name/]);
    out.name = withValue(name, cleanName(name?.value));
    const father = labelValue(lines, [/father'?s name/i, /पिता का नाम/]);
    out.father_name = withValue(father, cleanName(father?.value?.replace(/^.*father'?s name/i, "")));
    const dob = labelValue(lines, [/date of birth/i, /जन्म की तारीख/]);
    out.dob = withValue(dob, cleanDate(dob?.value));
    return out;
  },

  bank_passbook(lines) {
    return bankLike(lines);
  },

  cancelled_cheque(lines) {
    const out = bankLike(lines);
    if (!out.account_holder) {
      const idx = lines.findIndex((l) => /please sign above|authori[sz]ed signatory/i.test(l.text));
      const cand = lines[idx - 1];
      if (cand && /^[A-Za-z .]+$/.test(cand.text.trim())) out.account_holder = { value: cleanName(cand.text)!, raw: cand.text, line: cand, bbox: cand.bbox, certainty: 0.8 };
    }
    return out;
  },

  epf_passbook(lines) {
    const out: Out = {};
    const name = labelValue(lines, [/member name/i]);
    out.name = withValue(name, cleanName(name?.value));
    const father = labelValue(lines, [/father\/?\s*husband'?s? name|father'?s name/i]);
    out.father_name = withValue(father, cleanName(father?.value));
    const dob = labelValue(lines, [/date of birth|\bdob\b/i]);
    out.dob = withValue(dob, cleanDate(dob?.value));
    const uan = labelValue(lines, [/\buan\b/i]);
    out.uan = withValue(uan, uan?.value.match(/[\dXx]{12}/)?.[0]);
    const mid = labelValue(lines, [/member id/i]);
    out.member_id = withValue(mid, mid?.value.split(/\s{2,}/)[0]?.trim());
    const est = labelValue(lines, [/establishment( name)?/i]);
    out.establishment = withValue(est, est?.value.replace(/^id.*$/i, "").trim() || undefined);
    const doj = labelValue(lines, [/date of joining|\bdoj\b/i]);
    out.doj = withValue(doj, cleanDate(doj?.value));
    const doe = labelValue(lines, [/date of exit|\bdoe\b/i]);
    const doeVal = doe && !/not available|n\/a|^-+$/i.test(doe.value) ? cleanDate(doe.value) : undefined;
    out.doe = withValue(doe, doeVal);
    const bal = labelValue(lines, [/total balance|closing balance|net balance/i]);
    out.balance = withValue(bal, cleanAmount(bal?.value));
    return out;
  },

  marksheet_12(lines) {
    const out: Out = {};
    // Real marksheets vary a lot (CBSE, state boards, OCR'd photos), so labels are matched loosely.
    const name =
      labelValue(lines, [/name of (the )?candidate|candidate'?s name|student'?s? name|नाम/i]) ??
      labelValue(lines, [/^\s*name\b(?!\s*of\s*(father|mother|school|institution))/i]);
    out.name = withValue(name, cleanName(name?.value));
    const father = labelValue(lines, [/father'?s? name|name of (the )?father|पिता/i]);
    out.father_name = withValue(father, cleanName(father?.value));
    const dob = labelValue(lines, [/date of birth|d\.?o\.?b\b|जन्म/i]);
    out.dob = withValue(dob, cleanDate(dob?.value));
    const roll = labelValue(lines, [/roll\s*(no\.?|number|code)?|अनुक्रमांक/i]);
    out.roll_number = withValue(roll, roll?.value.match(/[A-Z0-9]{5,}/i)?.[0]);
    const board = lines.find((l) => /board of|council of|board\b.*\b(education|examination)/i.test(l.text));
    if (board) out.board = { value: board.text.trim(), raw: board.text, line: board, bbox: board.bbox, certainty: 0.85 };
    const year = labelValue(lines, [/year of (examination|passing)|examination year|exam(ination)? (held in|year)/i]);
    out.year_of_passing = withValue(year, year?.value.match(/(19|20)\d{2}/)?.[0]);
    // 1. A printed percentage line. 2. Boards like UP / Bihar print totals instead ("कुल योग 365 / 500",
    // or "Total 365" with "Maximum marks 500"): compute it. 3. Only then any "nn.nn %" on the sheet.
    const labelled = labelValue(lines, [/percentage|aggregate|percent|प्रतिशत/i]);
    const labelledNum = labelled?.value.match(/\d{1,3}(\.\d{1,2})?/)?.[0];
    let pct = labelled && labelledNum && Number(labelledNum) <= 100 ? labelled : undefined;
    if (!pct) pct = totalsPercentage(lines);
    if (!pct) pct = regexHit(lines, /\b(\d{2,3}(?:\.\d{1,2})?)\s?%/, 1);
    // A passed Class XII candidate scores at least the 33% pass mark; anything lower is a misread
    // (attendance, a column value, a grade band) and is better reported as "not found".
    const num = pct?.value.match(/\d{1,3}(\.\d{1,2})?/)?.[0];
    out.percentage = num && Number(num) >= 33 && Number(num) <= 100 ? withValue(pct, num.concat("%")) : undefined;
    const stream = labelValue(lines, [/^stream/i]);
    out.stream = withValue(stream, stream?.value);
    return out;
  },

  form16(lines) {
    const out: Out = {};
    const PAN = /\b[A-Z]{5}\d{4}[A-Z]\b/g;
    const name = labelValue(lines, [/name and address of the employee(\s*\/\s*specified senior citizen)?/i, /name of (the )?employee/i, /employee'?s name/i]);
    out.name = withValue(name, cleanName(name?.value.split(/,|\s{2,}/)[0]));
    // Part A prints "PAN of the Deductor | TAN of the Deductor | PAN of the Employee" as one header
    // with the three values on the next line, so the employee's PAN is the last PAN on that line.
    const panHit = labelValue(lines, [/pan of (the )?employee/i]);
    const pans = panHit?.value.toUpperCase().match(PAN) ?? [];
    const employeePan = pans.length > 1 ? pans.at(-1) : pans[0];
    out.pan_number = withValue(panHit, employeePan);
    // The TAN label sits mid-header, so the value is on the same line or the one below.
    const TAN = /\b[A-Z]{4}\d{5}[A-Z]\b/;
    const tanIdx = lines.findIndex((l) => /tan of (the )?(deductor|employer)/i.test(l.text));
    const tanLine = tanIdx >= 0 ? [lines[tanIdx], lines[tanIdx + 1]].find((l) => l && TAN.test(l.text.toUpperCase())) : undefined;
    const tanVal = tanLine?.text.toUpperCase().match(TAN)?.[0];
    out.tan = tanLine && tanVal ? { value: tanVal, raw: tanVal, line: tanLine, bbox: tanLine.bbox, certainty: 0.9 } : undefined;
    const employer = labelValue(lines, [/name and address of the (employer|deductor)(\s*\/\s*specified bank)?/i, /employer'?s name/i, /name of (the )?(employer|deductor)/i]);
    out.employer = withValue(employer, employer?.value.split(/,|\s{2,}/)[0].trim());
    const ay = labelValue(lines, [/assessment year/i]);
    const ayM = ay?.value.match(/(20\d{2})\s*-\s*(\d{2,4})/);
    out.assessment_year = withValue(ay, ayM ? `${ayM[1]}-${ayM[2].slice(-2)}` : undefined);
    const gross = labelValue(lines, [/gross salary/i, /total amount of salary/i]);
    out.gross_salary = withValue(gross, cleanAmount(gross?.value));
    const tds = labelValue(lines, [/total (amount of )?tax deducted/i, /tax deducted and deposited/i, /total tds/i, /net tax payable/i]);
    out.tds_amount = withValue(tds, cleanAmount(tds?.value));
    return out;
  },

  land_record(lines) {
    const out: Out = {};
    // Khatauni / jamabandi / 7-12 / pahani: layouts differ by state and are mostly in the state language.
    const stop = /\s{2,}|\s*[|]\s*|पिता|पति|father|husband|s\/o|w\/o/i;
    const name = labelValue(lines, [/खातेदार का नाम|भूमिधर का नाम|काश्तकार का नाम|खाताधारक|भूस्वामी/, /name of (the )?(holder|owner|khatedar|pattadar|cultivator|occupant)|(owner|holder|khatedar|pattadar)'?s? name/i], { stopAt: stop });
    out.name = withValue(name, cleanName(name?.value));
    const father = labelValue(lines, [/पिता(\s*\/\s*पति)? का नाम|पिता|पति/, /father'?s? name|s\/o|son of|w\/o/i], { stopAt: /\s{2,}|\s*[|]\s*/ });
    out.father_name = withValue(father, cleanName(father?.value));
    const khata = labelValue(lines, [/खाता\s*(संख्या|सं\.?|नं\.?|क्रमांक|न\.)/, /\bkhata\s*(no\.?|number)?/i, /\baccount\s*no\.?/i, /खाता(?!दार)/], { stopAt: /\s{2,}/ });
    out.khata_number = withValue(khata, khata?.value.match(/[0-9]{1,8}[A-Za-z]?/)?.[0]);
    const survey = labelValue(lines, [/(खसरा|गाटा|सर्वे)\s*(संख्या|सं\.?|नं\.?|न\.)?/, /\b(khasra|survey|gat|plot)\s*(no\.?|number)?/i], { stopAt: /\s{2,}/ });
    out.survey_number = withValue(survey, survey?.value.match(/[0-9]+(\s*\/\s*[0-9]+)?[A-Za-z]?/)?.[0]?.replace(/\s/g, ""));
    const area = labelValue(lines, [/क्षेत्रफल|रकबा/, /\b(area|extent)\b/i], { stopAt: /\s{2,}/ });
    out.land_area = withValue(area, area?.value.trim());
    const village = labelValue(lines, [/ग्राम|गाँव|गांव|मौजा/, /\b(village|mouza|gram)\b/i], { stopAt: /\s{2,}|,|तहसील|tehsil|taluk/i });
    out.village = withValue(village, village?.value.trim());
    return out;
  },

  income_certificate(lines) {
    const out: Out = {};
    const name = labelValue(lines, [/आवेदक का नाम/, /applicant'?s? name|name of applicant/i]);
    out.name = withValue(name, cleanName(name?.value));
    const father = labelValue(lines, [/पिता\s*\/\s*अभिभावक का नाम|पिता का नाम/, /father'?s name/i]);
    out.father_name = withValue(father, cleanName(father?.value));
    const inc = labelValue(lines, [/वार्षिक (पारिवारिक )?आय/, /annual (family )?income/i]);
    out.annual_income = withValue(inc, cleanAmount(inc?.value));
    const date = labelValue(lines, [/जारी करने की तिथि|दिनांक/, /date of issue|issue date/i]);
    out.issue_date = withValue(date, cleanDate(date?.value));
    const auth = labelValue(lines, [/जारीकर्ता|issuing authority/i]);
    out.issuing_authority = withValue(auth, auth?.value);
    return out;
  },

  bonafide_certificate(lines) {
    const out: Out = {};
    const inst = lines.find((l) => /college|university|institute|vidyalaya|mahavidyalaya/i.test(l.text));
    if (inst) out.institution = { value: inst.text.trim(), raw: inst.text, line: inst, bbox: inst.bbox, certainty: 0.85 };
    const name = labelValue(lines, [/name of (the )?student|student'?s name/i]);
    out.name = withValue(name, cleanName(name?.value));
    const course = labelValue(lines, [/^course|programme/i]);
    out.course = withValue(course, course?.value);
    const yr = labelValue(lines, [/year of study|current year|^year\b/i]);
    out.course_year = withValue(yr, yr?.value);
    const mode = labelValue(lines, [/mode of study|study mode/i]);
    out.study_mode = withValue(mode, mode?.value);
    const ay = labelValue(lines, [/academic (year|session)/i]);
    out.academic_year = withValue(ay, ay?.value.match(/\d{4}\s*[-–]\s*\d{2,4}/)?.[0]);
    return out;
  },
};

function bankLike(lines: TextLine[]): Out {
  const out: Out = {};
  const holder = labelValue(lines, [/account holder( name)?|a\/c holder|customer name/i]);
  out.account_holder = withValue(holder, cleanName(holder?.value));
  const acc = labelValue(lines, [/account (no|number)\.?|a\/c\.? no\.?/i]);
  out.account_number = withValue(acc, acc?.value.replace(/\s/g, "").match(/\d{9,18}/)?.[0]) ?? regexHit(lines, ACCOUNT_RE, 1);
  const ifsc = labelValue(lines, [/ifsc( code)?/i]);
  out.ifsc = withValue(ifsc, ifsc?.value.replace(/\s/g, "").toUpperCase().match(/[A-Z]{4}[0O][A-Z0-9]{6}/)?.[0]) ?? regexHit(lines, IFSC_RE, 1);
  const branch = labelValue(lines, [/^branch( name)?/i, /branch\s*:/i]);
  out.branch = withValue(branch, branch?.value.split(/\s{2,}|ifsc/i)[0]?.trim());
  const bank = lines.find((l) => /\bbank\b/i.test(l.text) && !/ifsc|account/i.test(l.text));
  if (bank) out.bank_name = { value: bank.text.replace(/\(.*?\)/g, "").trim(), raw: bank.text, line: bank, bbox: bank.bbox, certainty: 0.8 };
  return out;
}

// ---------------------------------------------------------------------------- public

export interface ExtractionResult {
  fields: ExtractedField[];
  missingFields: FieldKey[];
}

export function extractFields(typeId: DocTypeId, lines: TextLine[], method: ExtractionMethod): ExtractionResult {
  const parser = PARSERS[typeId];
  const def = DOC_TYPES[typeId];
  if (!parser) return { fields: [], missingFields: def?.keyFields ?? [] };
  const hits = parser(lines);
  const fields: ExtractedField[] = [];
  for (const key of def.fields) {
    const h = hits[key];
    if (!h?.value) continue;
    const field: ExtractedField = {
      key,
      value: h.value.trim(),
      raw: h.raw,
      confidence: Math.round(h.line.confidence * h.certainty * 100) / 100,
      page: h.line.page,
      bbox: h.bbox,
      method,
      status: "extracted",
    };
    if (key === "aadhaar_number") {
      // Data minimisation: check the full number once, then keep only the masked value.
      const res = checkAadhaarFormat(field.value);
      field.minimised = res;
      field.value = maskIdentifier("aadhaar_number", field.value.replace(/[*]/g, "X"));
      field.raw = field.value;
    }
    fields.push(field);
  }
  const missingFields = def.keyFields.filter((k) => !fields.some((f) => f.key === k) && !(k === "dob" && fields.some((f) => f.key === "yob")));
  return { fields, missingFields };
}
