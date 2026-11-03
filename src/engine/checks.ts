import type { ApplicationVariant, DocumentRecord, Finding, FindingStatus, Observation, RuleDef, Severity } from "./types";
import { firstValue, type Profile, type ProfileValue } from "./profile";
import { compareNames, type NameComparison } from "./identity/nameMatch";
import {
  ageOn, checkAadhaarFormat, checkIfscFormat, checkPanFormat, digitsOnly, formatDate, formatINR, maskIdentifier,
  monthsBetween, parseAmount, parseDate, toDate, type ParsedDate,
} from "./validators";
import { IFSC_SNAPSHOT, bankCodeKnown, lookupIfsc } from "./reference/ifsc";
import { DOC_TYPES, FIELD_LABELS, SENSITIVE_FIELDS } from "@/knowledge/documents";
import { nameTokens } from "./text/normalize";
import { readability } from "./readability";

export interface CheckContext {
  now: Date;
  variant: ApplicationVariant;
  documents: DocumentRecord[];
  draft: Record<string, string>;
  profile: Profile;
}

type CheckFn = (rule: RuleDef, ctx: CheckContext) => Finding[];

// ---------------------------------------------------------------------------- helpers

function obs(v: ProfileValue): Observation {
  // Account numbers stay readable on the user's own device so a typo can be spotted;
  // exports (report, AI) mask them separately. Other identifiers are always masked.
  const display = SENSITIVE_FIELDS.includes(v.key) && v.key !== "account_number" ? maskIdentifier(v.key, v.value) : v.value;
  return {
    docId: v.docId,
    docLabel: v.docLabel,
    field: v.key,
    fieldLabel: FIELD_LABELS[v.key],
    value: display,
    page: v.page,
    bbox: v.bbox,
    confidence: v.confidence,
  };
}

interface Draft {
  subject?: string;
  status: FindingStatus;
  severity?: Severity;
  title?: string;
  summary: string;
  abstract: string;
  observations?: Observation[];
  signals?: string[];
  confidence?: number;
  recommendation?: string;
  affectedDocIds?: string[];
}

function finding(rule: RuleDef, d: Draft): Finding {
  const observations = d.observations ?? [];
  return {
    key: rule.id + (d.subject ? `:${d.subject}` : ""),
    ruleId: rule.id,
    ruleVersion: rule.version,
    title: d.title ?? rule.title,
    category: rule.category,
    status: d.status,
    severity: d.status === "passed" ? "info" : (d.severity ?? rule.severity),
    summary: d.summary,
    whyItMatters: rule.whyItMatters,
    recommendation: d.recommendation ?? rule.recommendation,
    observations,
    signals: d.signals ?? [],
    confidence: d.confidence ?? 1,
    sourceIds: rule.sourceIds,
    basis: rule.basis,
    abstract: d.abstract,
    affectedDocIds: d.affectedDocIds ?? Array.from(new Set(observations.map((o) => o.docId).filter(Boolean) as string[])),
  };
}

// Tesseract routinely reports 65–75% on correctly read phone photos; below this we ask the user to confirm.
const LOW_CONFIDENCE = 0.65;

function serviceMonths(ctx: CheckContext): { months: number; doj: ParsedDate; end: Date; endLabel: string; dojV: ProfileValue } | null {
  const dojV = firstValue(ctx.profile, "doj", ["epf_passbook"]);
  const doj = parseDate(dojV?.value);
  if (!dojV || !doj || doj.precision !== "day") return null;
  const doeV = firstValue(ctx.profile, "doe", ["epf_passbook"]);
  const doe = parseDate(doeV?.value);
  const end = doe && doe.precision === "day" ? toDate(doe) : ctx.now;
  return { months: monthsBetween(toDate(doj), end), doj, end, endLabel: doe ? "date of exit" : "today", dojV };
}

function fmtMonths(m: number): string {
  const y = Math.floor(m / 12);
  const r = m % 12;
  const parts = [];
  if (y) parts.push(`${y} year${y > 1 ? "s" : ""}`);
  if (r || !y) parts.push(`${r} month${r !== 1 ? "s" : ""}`);
  return parts.join(" ");
}

function addMonths(d: Date, m: number): Date {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + m);
  return x;
}

function fmtJsDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function balance(ctx: CheckContext): { amount: number; v: ProfileValue } | null {
  const v = firstValue(ctx.profile, "balance", ["epf_passbook"]);
  const amount = parseAmount(v?.value);
  return v && amount !== null ? { amount, v } : null;
}

/** Used when a check cannot run because an input is missing — never silently skipped. */
function insufficient(rule: RuleDef, missing: string): Finding {
  return {
    ...finding(rule, {
      status: "review",
      severity: "medium",
      title: `Could not check — ${rule.title}`,
      summary: `This check needs your ${missing}, which was not found in your documents or application details. The result is unknown — not passed.`,
      abstract: `Check not possible: ${missing} missing.`,
      confidence: 0,
      recommendation: `Add a document that shows your ${missing}, or enter it in your application details, then run the check again.`,
    }),
    missingInput: missing,
  };
}

const OUTCOME_RANK = { consistent: 0, insufficient: 1, minor_variation: 2, mismatch: 3 } as const;

// ---------------------------------------------------------------------------- name comparisons

function compareAgainstAnchor(
  rule: RuleDef,
  ctx: CheckContext,
  values: ProfileValue[],
  anchorOrder: string[],
  subjectLabel: string,
): Finding[] {
  if (values.length < 2) return [];
  const anchor =
    anchorOrder.map((t) => values.find((v) => v.docType === t)).find(Boolean) ?? values.find((v) => v.source === "document") ?? values[0];
  const others = values.filter((v) => v !== anchor);
  const comparisons: { other: ProfileValue; cmp: NameComparison; lowConf: boolean }[] = others.map((other) => ({
    other,
    cmp: compareNames(anchor.value, other.value),
    lowConf: Math.min(anchor.confidence, other.confidence) < LOW_CONFIDENCE,
  }));

  let worst = comparisons.reduce((w, c) => (OUTCOME_RANK[c.cmp.outcome] > OUTCOME_RANK[w] ? c.cmp.outcome : w), "consistent" as NameComparison["outcome"]);
  const signals: string[] = [];
  const abstractParts: string[] = [];
  for (const c of comparisons) {
    const label = `${anchor.docLabel} (${FIELD_LABELS[anchor.key].toLowerCase()}) ↔ ${c.other.docLabel} (${FIELD_LABELS[c.other.key].toLowerCase()})`;
    signals.push(`${label}: ${c.cmp.outcome.replace("_", " ")}.`);
    c.cmp.signals.forEach((s) => signals.push(`   • ${s}`));
    if (c.lowConf) signals.push("   • Text recognition confidence was low for one of these values — it may be a misread.");
    abstractParts.push(`${anchor.docLabel} vs ${c.other.docLabel}: ${c.cmp.abstract}`);
  }
  const anyLowConfMismatch = comparisons.some((c) => c.cmp.outcome === "mismatch" && c.lowConf);
  if (worst === "mismatch" && anyLowConfMismatch && comparisons.every((c) => c.cmp.outcome !== "mismatch" || c.lowConf)) {
    worst = "minor_variation";
    signals.push("Downgraded to 'review' because the differing value was read with low confidence. Check the original document.");
  }

  const observations = [anchor, ...others].map(obs);
  const scriptNote = comparisons.some((c) => c.cmp.scriptDiffers);
  let status: FindingStatus;
  let summary: string;
  let severity: Severity | undefined;
  let title: string | undefined;
  switch (worst) {
    case "consistent":
      status = "passed";
      summary = `The ${subjectLabel} matches across ${values.length} records${scriptNote ? ", including across Devanagari and Latin script" : ""}.`;
      break;
    case "minor_variation":
      status = "review";
      severity = "medium";
      title = `Possible ${subjectLabel} variation`;
      summary = `The ${subjectLabel} is spelt differently in some records. This is often a transliteration variant, but it does not prove the records belong to the same person.`;
      break;
    case "insufficient":
      status = "review";
      severity = "low";
      summary = `The ${subjectLabel} could not be compared in every record.`;
      break;
    default:
      status = "action";
      title = `${subjectLabel[0].toUpperCase()}${subjectLabel.slice(1)} mismatch`;
      summary = `The ${subjectLabel} differs significantly between records. This needs to be corrected or explained before you apply.`;
  }
  return [
    finding(rule, {
      status,
      severity,
      title,
      summary,
      observations,
      signals,
      confidence: worst === "consistent" ? 0.95 : worst === "mismatch" ? 0.85 : 0.7,
      abstract: abstractParts.join(" | "),
    }),
  ];
}

// ---------------------------------------------------------------------------- checks

const CHECKS: Record<string, CheckFn> = {
  doc_requirements(rule, ctx) {
    const present = new Set(ctx.documents.filter((d) => d.status !== "failed").map((d) => d.typeId));
    const out: Finding[] = [];
    for (const req of ctx.variant.documents) {
      if (present.has(req.docType)) continue;
      const def = DOC_TYPES[req.docType];
      if (req.need === "required") {
        out.push(
          finding(rule, {
            subject: req.docType,
            status: "action",
            title: `${def.short} not added`,
            summary: `${def.label} is needed for this application. ${req.why}`,
            abstract: `Required document missing: ${def.short}.`,
            recommendation: `Add your ${def.short}. ${def.uploadTip}`,
          }),
        );
      } else if (req.need === "conditional" && req.condition === "tds") {
        const sm = serviceMonths(ctx);
        const bal = balance(ctx);
        const panLinked = ctx.draft.pan_linked;
        const mayApply = !sm || !bal || (sm.months < 60 && bal.amount >= 50000);
        if (mayApply && panLinked !== "yes") {
          out.push(
            finding(rule, {
              subject: req.docType,
              status: sm && bal ? "action" : "review",
              severity: "medium",
              title: `${def.short} may be needed`,
              summary: sm && bal
                ? `Your service is ${fmtMonths(sm.months)} and your balance is about ${formatINR(bal.amount)}, so TDS may apply. ${req.why}`
                : `RejectLess could not work out whether TDS applies. ${req.why}`,
              abstract: "Conditional PAN document missing; TDS may apply.",
              recommendation: "Add your PAN so its format and name can be checked, and make sure it is linked to your UAN.",
            }),
          );
        }
      }
    }
    if (!out.length) {
      out.push(finding(rule, { status: "passed", summary: "All required documents for this application have been added.", abstract: "All required documents present." }));
    }
    return out;
  },

  doc_quality(rule, ctx) {
    const out: Finding[] = [];
    for (const doc of ctx.documents) {
      // Pixel metrics are a proxy; the real question is whether the key details could be read.
      const { readWell, issues, notFound, unreadable } = readability(doc);
      if (!issues.length) continue;
      const severe = issues.some((i) => i.code === "no_text") || (!readWell && issues.some((i) => ["blur", "cropped", "low_resolution", "low_ocr_confidence"].includes(i.code)));
      const lost = Array.from(new Set([...notFound, ...unreadable.map((f) => f.key)])).map((k) => FIELD_LABELS[k]);
      out.push(
        finding(rule, {
          subject: doc.id,
          status: severe ? "action" : "review",
          title: `${DOC_TYPES[doc.typeId].short}: hard to read`,
          summary: `${issues.map((i) => i.message).join(" ")}${lost.length ? ` Could not read clearly: ${lost.join(", ")}.` : ""}`,
          signals: issues.map((i) => `Page ${i.page}: ${i.message} (measured: ${i.measured})`),
          abstract: `Image quality issues on ${DOC_TYPES[doc.typeId].short}: ${issues.map((i) => i.code).join(", ")}.`,
          affectedDocIds: [doc.id],
          observations: [{ docId: doc.id, docLabel: DOC_TYPES[doc.typeId].short, field: "quality", fieldLabel: "Scan quality", value: issues.map((i) => i.code.replace("_", " ")).join(", "), page: issues[0].page }],
        }),
      );
    }
    if (!out.length && ctx.documents.length) {
      const digital = ctx.documents.filter((d) => d.quality?.kind === "digital").length;
      out.push(
        finding(rule, {
          status: "passed",
          summary: `All ${ctx.documents.length} documents are readable${digital ? ` (${digital} digital PDF${digital > 1 ? "s" : ""} with a text layer)` : ""}.`,
          abstract: "No quality issues detected.",
        }),
      );
    }
    return out;
  },

  key_fields(rule, ctx) {
    const out: Finding[] = [];
    for (const doc of ctx.documents) {
      if (doc.status === "failed" || doc.typeId === "unknown") continue;
      const def = DOC_TYPES[doc.typeId];
      const { notFound: filtered, unreadable: low } = readability(doc);
      if (!filtered.length && !low.length) continue;
      const parts: string[] = [];
      if (filtered.length) parts.push(`Could not find: ${filtered.map((k) => FIELD_LABELS[k]).join(", ")}.`);
      if (low.length) parts.push(`Hard to read, please check: ${low.map((f) => FIELD_LABELS[f.key]).join(", ")}.`);
      out.push(
        finding(rule, {
          subject: doc.id,
          status: "review",
          severity: filtered.length ? "medium" : "low",
          title: `${def.short}: details need confirming`,
          summary: parts.join(" "),
          abstract: `${def.short}: ${filtered.length} key field(s) not found, ${low.length} low-confidence field(s).`,
          affectedDocIds: [doc.id],
          observations: low.map((f) => ({
            docId: doc.id, docLabel: def.short, field: f.key, fieldLabel: FIELD_LABELS[f.key],
            value: SENSITIVE_FIELDS.includes(f.key) ? maskIdentifier(f.key, f.value) : f.value,
            page: f.page, bbox: f.bbox, confidence: f.confidence,
          })),
          recommendation: "Open the document review and confirm or correct these details against the original document.",
        }),
      );
    }
    if (!out.length && ctx.documents.length) {
      out.push(finding(rule, { status: "passed", summary: "The key details were found on every document.", abstract: "All key fields extracted." }));
    }
    return out;
  },

  aadhaar_format(rule, ctx) {
    return (ctx.profile.aadhaar_number ?? []).map((v, i) => {
      const doc = ctx.documents.find((d) => d.id === v.docId);
      const field = doc?.fields.find((f) => f.key === "aadhaar_number");
      const res = field?.minimised ?? checkAadhaarFormat(v.value);
      const o = [obs(v)];
      if (!res.evaluable) {
        return finding(rule, {
          subject: String(i), status: "passed", observations: o,
          summary: "This is a masked Aadhaar — only the last 4 digits are visible, which is all RejectLess needs.",
          signals: res.reasons, abstract: "Masked Aadhaar; checksum not applicable.",
        });
      }
      return res.valid
        ? finding(rule, {
            subject: String(i), status: "passed", observations: o,
            summary: "The Aadhaar number has a valid 12-digit structure and checksum. This does not confirm it is genuine or yours.",
            signals: ["12 digits, does not start with 0 or 1.", "Verhoeff checksum digit matches.", "Only the last 4 digits were kept after this check."],
            abstract: "Aadhaar format and checksum valid.",
          })
        : finding(rule, {
            subject: String(i), status: "action", title: "Aadhaar number looks wrong", observations: o, summary: res.reasons.join(" "), signals: res.reasons,
            abstract: `Aadhaar number format invalid: ${res.reasons.length} issue(s), likely a misread digit or typo.`,
          });
    });
  },

  pan_format(rule, ctx) {
    return (ctx.profile.pan_number ?? []).map((v, i) => {
      const res = checkPanFormat(v.value);
      return finding(rule, {
        subject: String(i),
        status: res.valid ? "passed" : "action",
        title: res.valid ? undefined : "PAN is not in the expected format",
        observations: [obs(v)],
        summary: res.valid ? "The PAN has a valid structure for an individual. This does not confirm it is active or linked." : res.reasons.join(" "),
        signals: res.valid ? ["5 letters, 4 digits, 1 letter.", "4th character 'P' = individual."] : res.reasons,
        abstract: res.valid ? "PAN structure valid (individual)." : `PAN structure issue: ${res.reasons.join(" ")}`,
      });
    });
  },

  pan_surname_initial(rule, ctx) {
    const pan = firstValue(ctx.profile, "pan_number", ["pan"]);
    const name = firstValue(ctx.profile, "name", ["pan", "aadhaar"]);
    if (!pan || !name || !checkPanFormat(pan.value).valid) return [];
    const tokens = nameTokens(name.value);
    if (!tokens.length) return [];
    const fifth = pan.value.replace(/\s/g, "").toUpperCase()[4];
    const surname = tokens[tokens.length - 1].latin.toUpperCase();
    const anyInitial = tokens.some((t) => t.latin.toUpperCase().startsWith(fifth));
    const ok = surname.startsWith(fifth);
    return [
      finding(rule, {
        status: ok ? "passed" : "review",
        observations: [obs(pan), obs(name)],
        summary: ok
          ? "The PAN's 5th character matches the first letter of your surname."
          : anyInitial
            ? "The PAN's 5th character matches a different part of your name, not the last one. Your PAN may record your name in a different order."
            : "The PAN's 5th character does not match any part of your name. Your PAN may record a different surname.",
        signals: [`5th character of PAN: ${fifth}.`, `Surname used for comparison: ${tokens[tokens.length - 1].original}.`],
        abstract: ok ? "PAN surname initial consistent." : "PAN 5th character does not match the surname's first letter.",
        confidence: 0.7,
      }),
    ];
  },

  ifsc_format(rule, ctx) {
    const seen = new Map<string, ProfileValue[]>();
    for (const v of ctx.profile.ifsc ?? []) {
      const k = v.value.replace(/\s/g, "").toUpperCase();
      seen.set(k, [...(seen.get(k) ?? []), v]);
    }
    return Array.from(seen.entries()).map(([code, vals]) => {
      const res = checkIfscFormat(code);
      return finding(rule, {
        subject: code,
        status: res.valid ? "passed" : "action",
        title: res.valid ? undefined : "IFSC is not valid",
        observations: vals.map(obs),
        summary: res.valid ? `IFSC ${code} has a valid structure.` : `IFSC "${code}" is not valid: ${res.reasons.join(" ")}`,
        signals: res.valid ? ["11 characters.", "Bank code is 4 letters.", "5th character is zero."] : res.reasons,
        abstract: res.valid ? "IFSC structure valid." : `IFSC structure invalid: ${res.reasons.join(" ")}`,
      });
    });
  },

  ifsc_reference(rule, ctx) {
    const codes = Array.from(new Set((ctx.profile.ifsc ?? []).map((v) => v.value.replace(/\s/g, "").toUpperCase()))).filter(
      (c) => checkIfscFormat(c).valid,
    );
    return codes.map((code) => {
      const vals = (ctx.profile.ifsc ?? []).filter((v) => v.value.replace(/\s/g, "").toUpperCase() === code);
      const entry = lookupIfsc(code);
      const snapshot = `${IFSC_SNAPSHOT.label}, dated ${IFSC_SNAPSHOT.asOf}`;
      if (entry?.status === "active") {
        const bankV = firstValue(ctx.profile, "branch");
        const branchNote = bankV && !bankV.value.toLowerCase().includes(entry.branch.toLowerCase())
          ? ` Note: the branch printed on your document ("${bankV.value}") differs from the reference ("${entry.branch}").`
          : "";
        return finding(rule, {
          subject: code,
          status: branchNote ? "review" : "passed",
          severity: "low",
          observations: vals.map(obs),
          summary: `${code} is listed in the reference snapshot as ${entry.bank}, ${entry.branch} (${entry.city}).${branchNote}`,
          signals: [`Looked up in: ${snapshot}.`, `Status in snapshot: active.`, "This does not confirm that your account is active."],
          abstract: branchNote ? "IFSC found in reference but branch name differs from document." : "IFSC found in reference snapshot as active.",
        });
      }
      if (entry?.status === "merged") {
        return finding(rule, {
          subject: code,
          status: "action",
          title: "IFSC is no longer current",
          observations: vals.map(obs),
          summary: `${code} (${entry.bank}, ${entry.branch}) is marked as merged in the reference snapshot. Its replacement code is ${entry.mergedInto}. Payments to retired codes can fail.`,
          signals: [`Looked up in: ${snapshot}.`, `Status: merged into ${entry.mergedInto}.`, entry.note ?? ""].filter(Boolean),
          abstract: "IFSC appears in the reference as retired after a bank merger; a replacement code exists.",
          recommendation: `Confirm the current IFSC with your bank (likely ${entry.mergedInto}), then update it in your UAN KYC / NSP profile and your application details.`,
        });
      }
      const bank = bankCodeKnown(code);
      return finding(rule, {
        subject: code,
        status: "external",
        title: "IFSC could not be checked against a reference",
        observations: vals.map(obs),
        summary: bank
          ? `The bank code belongs to ${bank}, but this branch code is not in RejectLess's reference snapshot.`
          : `This IFSC is not in RejectLess's reference snapshot (${IFSC_SNAPSHOT.fictional ? "the demo snapshot only covers fictional banks" : "it may be new or retired"}). Its format is valid.`,
        signals: [`Looked up in: ${snapshot}.`, "Not found — this does NOT mean the IFSC is wrong."],
        abstract: "IFSC not present in the bundled reference snapshot; needs confirmation with the bank or RBI list.",
        recommendation: "Confirm the IFSC on RBI's IFSC list or with your bank branch.",
      });
    });
  },

  field_consistency(rule, ctx) {
    const field = rule.params?.field as keyof Profile;
    const mode = rule.params?.mode as "digits" | "upper" | "amount";
    const vals = (ctx.profile[field] ?? []) as ProfileValue[];
    if (vals.length < 2) return [];
    const norm = (s: string) => (mode === "digits" ? digitsOnly(s) : mode === "amount" ? String(parseAmount(s) ?? s) : s.replace(/\s/g, "").toUpperCase());
    const groups = new Map<string, ProfileValue[]>();
    vals.forEach((v) => groups.set(norm(v.value), [...(groups.get(norm(v.value)) ?? []), v]));
    const rawLabel = FIELD_LABELS[field as keyof typeof FIELD_LABELS];
    const label = /^[A-Z]{2,}/.test(rawLabel) ? rawLabel : rawLabel.toLowerCase();
    if (groups.size === 1) {
      return [
        finding(rule, {
          status: "passed",
          observations: vals.map(obs),
          summary: `The ${label} is the same in all ${vals.length} records.`,
          abstract: `${label} consistent across ${vals.length} sources.`,
        }),
      ];
    }
    const keys = Array.from(groups.keys());
    const signals: string[] = [];
    for (const [k, g] of groups) {
      const shown = SENSITIVE_FIELDS.includes(field as never) && field !== "account_number" ? maskIdentifier(field as string, k) : k;
      signals.push(`${g.map((v) => v.docLabel).join(", ")}: ${shown}`);
    }
    let hint = "";
    if (mode === "digits" && keys.length === 2 && keys[0].length === keys[1].length) {
      const diffs = [...keys[0]].map((c, i) => (c !== keys[1][i] ? i : -1)).filter((i) => i >= 0);
      if (diffs.length === 2 && keys[0][diffs[0]] === keys[1][diffs[1]] && keys[0][diffs[1]] === keys[1][diffs[0]]) {
        hint = "Two neighbouring digits appear to be swapped — a common typing mistake.";
      } else hint = `The numbers differ in ${diffs.length} digit position(s).`;
    } else if (mode === "digits" && keys.length === 2) {
      hint = `The numbers have different lengths (${keys[0].length} vs ${keys[1].length} digits).`;
    }
    if (hint) signals.push(hint);
    const draftDiffers = vals.some((v) => v.source === "draft") && groups.get(norm(vals.find((v) => v.source === "draft")!.value))!.length === 1;
    return [
      finding(rule, {
        status: "action",
        title: `${FIELD_LABELS[field as keyof typeof FIELD_LABELS]} does not match`,
        observations: vals.map(obs),
        summary: `The ${label} is different across your records${draftDiffers ? " — the value in your application details differs from your documents" : ""}. ${hint}`.trim(),
        signals,
        abstract: `${label} differs across ${groups.size} distinct values. ${hint}${draftDiffers ? " The user's application draft is the odd one out." : ""}`,
      }),
    ];
  },

  dob_consistency(rule, ctx) {
    const vals: (ProfileValue & { parsed: ParsedDate | null })[] = [
      ...(ctx.profile.dob ?? []),
      ...(ctx.profile.yob ?? []),
    ].map((v) => ({ ...v, parsed: parseDate(v.value) }));
    if (vals.length < 2) return [];
    const full = vals.filter((v) => v.parsed?.precision === "day");
    const unreadable = vals.filter((v) => !v.parsed);
    const signals: string[] = [];
    let status: FindingStatus = "passed";
    let summary = "";
    let abstract = "";
    const fullSet = new Set(full.map((v) => formatDate(v.parsed)));
    if (fullSet.size > 1) {
      status = "action";
      const [a, b] = full;
      const swapped = full.some((x) => full.some((y) => x.parsed!.d === y.parsed!.m && x.parsed!.m === y.parsed!.d && x.parsed!.d !== x.parsed!.m && x.parsed!.y === y.parsed!.y));
      summary = `Your date of birth is not the same in all records.`;
      for (const v of full) signals.push(`${v.docLabel}: ${formatDate(v.parsed)}`);
      if (swapped) signals.push("The day and month appear to be swapped between records (DD-MM vs MM-DD).");
      else if (a && b && a.parsed!.y !== b.parsed!.y) signals.push("The year of birth differs.");
      abstract = `Date of birth differs across ${fullSet.size} distinct values${swapped ? "; day and month appear swapped" : ""}.`;
    } else {
      const years = new Set(vals.filter((v) => v.parsed).map((v) => v.parsed!.y));
      if (years.size > 1) {
        status = "action";
        summary = "The year of birth differs between records.";
        abstract = "Year of birth differs across sources.";
        vals.forEach((v) => signals.push(`${v.docLabel}: ${formatDate(v.parsed)}`));
      } else {
        summary = `Date of birth is consistent across ${vals.length - unreadable.length} records.`;
        abstract = "Date of birth consistent.";
        if (vals.some((v) => v.parsed?.precision === "year")) signals.push("One record shows only the year of birth, so only the year could be compared there.");
      }
    }
    if (unreadable.length) {
      signals.push(`Could not read a date from: ${unreadable.map((v) => v.docLabel).join(", ")}.`);
      if (status === "passed") status = "review";
    }
    return [finding(rule, { status, title: status === "action" ? "Date of birth does not match" : undefined, summary, abstract, signals, observations: vals.map(obs) })];
  },

  name_consistency(rule, ctx) {
    const fields = (rule.params?.fields as string[]) ?? ["name"];
    const anchor = (rule.params?.anchor as string[]) ?? [];
    const vals = fields.flatMap((f) => (ctx.profile[f as keyof Profile] ?? []) as ProfileValue[]);
    const out = compareAgainstAnchor(rule, ctx, vals, anchor, "name");
    // Also compare the local-script name on the same document (e.g. Hindi + English on Aadhaar).
    const local = ctx.profile.name_local ?? [];
    for (const l of local) {
      const sameDoc = (ctx.profile.name ?? []).find((n) => n.docId === l.docId);
      if (!sameDoc) continue;
      const cmp = compareNames(sameDoc.value, l.value);
      out.push(
        finding(rule, {
          subject: `local:${l.docId}`,
          title: `${l.docLabel}: names in both scripts`,
          status: cmp.outcome === "consistent" ? "passed" : cmp.outcome === "mismatch" ? "action" : "review",
          severity: "medium",
          summary:
            cmp.outcome === "consistent"
              ? `The Devanagari and English names on your ${l.docLabel} correspond to each other.`
              : `The Devanagari and English names on your ${l.docLabel} may not correspond exactly.`,
          signals: cmp.signals,
          observations: [obs(sameDoc), obs(l)],
          abstract: `Same-document script comparison: ${cmp.abstract}`,
          confidence: 0.8,
        }),
      );
    }
    return out;
  },

  relative_name_consistency(rule, ctx) {
    const field = rule.params?.field as keyof Profile;
    const vals = (ctx.profile[field] ?? []) as ProfileValue[];
    const out = compareAgainstAnchor(rule, ctx, vals, ["marksheet_12", "epf_passbook", "pan"], "father's / guardian's name");
    return out;
  },

  own_account(rule, ctx) {
    const who = (rule.params?.who as string) ?? "student";
    const holder = firstValue(ctx.profile, "account_holder", ["bank_passbook", "cancelled_cheque"]);
    const student = firstValue(ctx.profile, "name", ["aadhaar", "marksheet_12", "land_record", "pan"]);
    if (!holder || !student) return [];
    const cmp = compareNames(student.value, holder.value);
    const status: FindingStatus = cmp.outcome === "consistent" ? "passed" : cmp.outcome === "mismatch" ? "action" : "review";
    const father = firstValue(ctx.profile, "father_name");
    const isParent = father && compareNames(father.value, holder.value).outcome !== "mismatch";
    return [
      finding(rule, {
        status,
        title: status === "action" ? `Bank account not in the ${who}'s name` : undefined,
        observations: [obs(student), obs(holder)],
        summary:
          status === "passed"
            ? `The bank account is in the ${who}'s name.`
            : status === "action"
              ? `The account holder name does not match the ${who}'s name${isParent ? " — it appears to be a parent's account" : ""}.`
              : `The account holder name is spelt differently from the ${who}'s name.`,
        signals: [...cmp.signals, ...(isParent ? ["The account holder name matches the father's / guardian's name."] : [])],
        abstract: `Account holder vs student: ${cmp.abstract}${isParent ? " Account holder matches the parent's name." : ""}`,
      }),
    ];
  },

  field_present(rule, ctx) {
    const field = rule.params?.field as keyof Profile;
    const v = firstValue(ctx.profile, field as never);
    return [
      v
        ? finding(rule, { status: "passed", observations: [obs(v)], summary: `${rule.params?.label} found (${v.docLabel}).`, abstract: `${rule.params?.label} present.` })
        : finding(rule, { status: "action", title: `No ${String(rule.params?.label).toLowerCase()} found`, summary: `No ${String(rule.params?.label).toLowerCase()} was found in your documents or application details.`, abstract: `${rule.params?.label} missing.` }),
    ];
  },

  draft_present(rule, ctx) {
    const key = rule.params?.key as string;
    const v = ctx.draft[key];
    return [
      v
        ? finding(rule, { status: "passed", summary: `${rule.params?.label} selected.`, abstract: `${rule.params?.label} provided.` })
        : finding(rule, { status: "action", summary: `${rule.params?.label} has not been selected in your application details.`, abstract: `${rule.params?.label} not provided.` }),
    ];
  },

  date_order(rule, ctx) {
    const dojV = firstValue(ctx.profile, "doj", ["epf_passbook"]);
    const doeV = firstValue(ctx.profile, "doe", ["epf_passbook"]);
    const doj = parseDate(dojV?.value);
    const doe = parseDate(doeV?.value);
    if (!dojV || !doeV || !doj || !doe) return [];
    const problems: string[] = [];
    if (toDate(doj) >= toDate(doe)) problems.push("The date of joining is on or after the date of exit.");
    if (toDate(doe) > ctx.now) problems.push("The date of exit is in the future.");
    return [
      finding(rule, {
        status: problems.length ? "action" : "passed",
        observations: [obs(dojV), obs(doeV)],
        summary: problems.length ? problems.join(" ") : `Joined ${formatDate(doj)}, exited ${formatDate(doe)}.`,
        abstract: problems.length ? `Employment date order problem: ${problems.join(" ")}` : "Employment dates in valid order.",
      }),
    ];
  },

  months_since_exit(rule, ctx) {
    const required = rule.params?.months as number;
    const retirementAge = rule.params?.retirementAge as number;
    const doeV = firstValue(ctx.profile, "doe", ["epf_passbook"]);
    const doe = parseDate(doeV?.value);
    if (!doeV || !doe || doe.precision !== "day") return [insufficient(rule, "date of exit")];
    const months = monthsBetween(toDate(doe), ctx.now);
    const dobV = firstValue(ctx.profile, "dob", ["aadhaar", "epf_passbook"]);
    const dob = parseDate(dobV?.value);
    const age = dob ? ageOn(dob, ctx.now) : null;
    const o = [obs(doeV), ...(dobV ? [obs(dobV)] : [])];
    if (age !== null && age >= retirementAge) {
      return [finding(rule, { status: "passed", observations: o, summary: `You are ${age}, so the waiting period for those leaving a job before retirement should not apply.`, abstract: "Member at or above retirement age; waiting period not applicable." })];
    }
    if (months >= required) {
      return [
        finding(rule, {
          status: "passed",
          observations: o,
          summary: `It has been ${fmtMonths(months)} since your date of exit, which meets the ${required}-month waiting period.`,
          signals: [`Date of exit: ${formatDate(doe)}.`, `Today: ${fmtJsDate(ctx.now)}.`, "Assumes you have not joined another EPF-covered employer since — only EPFO can confirm this."],
          abstract: `Waiting period of ${required} months satisfied (${months} months elapsed).`,
        }),
      ];
    }
    const earliest = addMonths(toDate(doe), required);
    return [
      finding(rule, {
        status: "action",
        title: `${required}-month waiting period not yet complete`,
        observations: o,
        summary: `It has been ${fmtMonths(months)} since your date of exit. The reported waiting period is ${required} months, so the earliest date is about ${fmtJsDate(earliest)}.`,
        signals: [`Date of exit: ${formatDate(doe)}.`, `Months elapsed: ${months}.`, `Months still needed: ${required - months}.`],
        abstract: `Waiting period not satisfied: ${months} of ${required} months elapsed since exit.`,
        recommendation: `${rule.recommendation} Alternative now: ${rule.params?.alt}.`,
      }),
    ];
  },

  tds_pan(rule, ctx) {
    const sm = serviceMonths(ctx);
    const bal = balance(ctx);
    if (!sm || !bal) return [insufficient(rule, !sm ? "date of joining" : "PF balance")];
    const years = rule.params?.serviceYears as number;
    const threshold = rule.params?.threshold as number;
    const o = [obs(sm.dojV), obs(bal.v)];
    if (sm.months >= years * 12) {
      return [finding(rule, { status: "passed", observations: o, summary: `Your service is ${fmtMonths(sm.months)} (5 years or more), so TDS on withdrawal should not apply.`, abstract: "Service ≥ 5 years; TDS not expected." })];
    }
    if (bal.amount < threshold) {
      return [finding(rule, { status: "passed", observations: o, summary: `Your balance (${formatINR(bal.amount)}) is below ₹50,000, so TDS should not apply.`, abstract: "Amount below TDS threshold." })];
    }
    const hasPan = (ctx.profile.pan_number?.length ?? 0) > 0 || ctx.draft.pan_linked === "yes";
    return [
      finding(rule, {
        status: hasPan ? "review" : "action",
        severity: hasPan ? "low" : "high",
        title: hasPan ? "TDS is likely on this withdrawal" : "TDS without PAN would be higher",
        observations: o,
        summary: hasPan
          ? `Service of ${fmtMonths(sm.months)} is under 5 years and the amount is about ${formatINR(bal.amount)}, so TDS of about 10% is likely. If your total income is below the taxable limit, you may be able to submit a tax declaration (Form 15G/15H; Form 121 from 1 April 2026).`
          : `Service of ${fmtMonths(sm.months)} is under 5 years and the amount is about ${formatINR(bal.amount)}. Without PAN, TDS is reported to be 20% instead of 10%.`,
        signals: [`Service counted up to ${sm.endLabel}.`, `Balance from ${bal.v.docLabel}.`, hasPan ? "PAN available." : "No PAN found and PAN-UAN link not confirmed."],
        abstract: `Service under 5 years and amount above ₹50,000; TDS applies. PAN ${hasPan ? "available" : "not available"}.`,
      }),
    ];
  },

  service_max(rule, ctx) {
    const sm = serviceMonths(ctx);
    if (!sm) return [insufficient(rule, "date of joining")];
    const limit = (rule.params?.years as number) * 12;
    const ok = sm.months < limit;
    return [
      finding(rule, {
        status: ok ? "passed" : "action",
        title: ok ? undefined : "Service is 10 years or more",
        observations: [obs(sm.dojV)],
        summary: ok
          ? `Your service in these records is ${fmtMonths(sm.months)}, under 10 years.`
          : `Your service in these records is ${fmtMonths(sm.months)}. With 10 or more years, the pension amount cannot be withdrawn.`,
        signals: [`Counted from date of joining to ${sm.endLabel}.`, "Service with earlier employers, if transferred, also counts — check your full service history."],
        abstract: ok ? "Service under 10 years." : "Service 10 years or more; withdrawal benefit not available.",
      }),
    ];
  },

  service_min_months(rule, ctx) {
    const sm = serviceMonths(ctx);
    if (!sm) return [];
    const min = rule.params?.months as number;
    const ok = sm.months >= min;
    return [
      finding(rule, {
        status: ok ? "passed" : "review",
        observations: [obs(sm.dojV)],
        summary: ok ? `Service of ${fmtMonths(sm.months)} is at least ${min} months.` : `Service of ${fmtMonths(sm.months)} is under ${min} months. Check current eligibility.`,
        abstract: ok ? "Minimum service met." : "Service under 6 months; eligibility uncertain.",
      }),
    ];
  },

  membership_min(rule, ctx) {
    const dojV = firstValue(ctx.profile, "doj", ["epf_passbook"]);
    const doj = parseDate(dojV?.value);
    if (!dojV || !doj || doj.precision !== "day") return [insufficient(rule, "date of joining")];
    const months = monthsBetween(toDate(doj), ctx.now);
    const min = rule.params?.months as number;
    const ok = months >= min;
    return [
      finding(rule, {
        status: ok ? "passed" : "action",
        title: ok ? undefined : "Membership period too short",
        observations: [obs(dojV)],
        summary: ok
          ? `You have about ${fmtMonths(months)} of membership, which meets the ${min}-month minimum.`
          : `You have about ${fmtMonths(months)} of membership. The reported minimum is ${min} months — earliest date about ${fmtJsDate(addMonths(toDate(doj), min))}.`,
        abstract: ok ? "Membership minimum met." : `Membership ${months} months, below ${min}-month minimum.`,
      }),
    ];
  },

  partial_amount(rule, ctx) {
    const bal = balance(ctx);
    if (!bal) return [];
    const amount = parseAmount(ctx.draft.amount);
    const share = 1 - (rule.params?.minBalanceShare as number);
    const max = Math.floor(bal.amount * share);
    const min = rule.params?.minAmount as number;
    if (amount === null) {
      return [
        finding(rule, {
          status: "review",
          severity: "low",
          observations: [obs(bal.v)],
          summary: `You have not entered an amount yet. Based on a balance of ${formatINR(bal.amount)}, the reported maximum is about ${formatINR(max)} (75%).`,
          abstract: "Requested amount not provided.",
        }),
      ];
    }
    const problems: string[] = [];
    if (amount > max) problems.push(`${formatINR(amount)} is more than 75% of your balance (about ${formatINR(max)}).`);
    if (amount < min) problems.push(`${formatINR(amount)} is below the reported minimum of ${formatINR(min)}.`);
    return [
      finding(rule, {
        status: problems.length ? "action" : "passed",
        title: problems.length ? "Requested amount outside the limit" : undefined,
        observations: [obs(bal.v), { docLabel: "Your application details", field: "amount", fieldLabel: "Requested amount", value: formatINR(amount) }],
        summary: problems.length ? problems.join(" ") : `${formatINR(amount)} is within the reported limit of about ${formatINR(max)}.`,
        abstract: problems.length ? "Requested amount outside reported limits." : "Requested amount within limits.",
      }),
    ];
  },

  income_limit(rule, ctx) {
    const v = firstValue(ctx.profile, "annual_income", ["income_certificate"]);
    const income = parseAmount(v?.value);
    if (!v || income === null) return [insufficient(rule, "family income")];
    const max = rule.params?.max as number;
    const ok = income < max;
    return [
      finding(rule, {
        status: ok ? "passed" : "action",
        title: ok ? undefined : "Family income above the limit",
        observations: [obs(v)],
        summary: ok ? `Family income of ${formatINR(income)} is below the ${formatINR(max)} limit.` : `Family income of ${formatINR(income)} is not below the ${formatINR(max)} limit.`,
        abstract: ok ? "Income below scheme limit." : "Income at or above scheme limit.",
      }),
    ];
  },

  doc_recency(rule, ctx) {
    const v = (ctx.profile[rule.params?.field as keyof Profile] ?? [] as ProfileValue[]).find((x) => x.docType === rule.params?.docType);
    const d = parseDate(v?.value);
    if (!v || !d || d.precision !== "day") return [];
    const months = monthsBetween(toDate(d), ctx.now);
    const limit = rule.params?.months as number;
    const ok = months <= limit;
    return [
      finding(rule, {
        status: ok ? "passed" : "review",
        title: ok ? undefined : "Income certificate is more than a year old",
        observations: [obs(v)],
        summary: ok ? `Issued ${fmtMonths(months)} ago.` : `Issued ${fmtMonths(months)} ago — older than ${limit} months.`,
        abstract: ok ? "Certificate recent." : "Certificate older than 12 months.",
      }),
    ];
  },

  study_mode(rule, ctx) {
    const v = firstValue(ctx.profile, "study_mode", ["bonafide_certificate"]);
    if (!v) return [];
    const s = v.value.toLowerCase();
    const bad = /distance|correspondence|open|online/.test(s);
    const good = /regular|full[- ]?time/.test(s);
    return [
      finding(rule, {
        status: bad ? "action" : good ? "passed" : "review",
        title: bad ? "Course is not a regular course" : undefined,
        observations: [obs(v)],
        summary: bad ? `Your certificate says the mode of study is "${v.value}".` : good ? "Your certificate shows a regular course." : `The mode of study "${v.value}" is unclear.`,
        abstract: bad ? "Study mode is distance/correspondence." : good ? "Study mode regular." : "Study mode unclear.",
      }),
    ];
  },

  marks_percentile(rule, ctx) {
    const v = firstValue(ctx.profile, "percentage", ["marksheet_12"]);
    if (!v) return [];
    const board = firstValue(ctx.profile, "board");
    const stream = firstValue(ctx.profile, "stream");
    return [
      finding(rule, {
        status: "external",
        title: "Board percentile cut-off must be checked",
        observations: [obs(v), ...(board ? [obs(board)] : []), ...(stream ? [obs(stream)] : [])],
        summary: `Your Class XII result is ${v.value}. Whether this is above the 80th percentile depends on your board, stream and year.`,
        abstract: "Marks read; 80th-percentile eligibility depends on the board cut-off, which RejectLess cannot access.",
      }),
    ];
  },

  declaration(rule, ctx) {
    const key = rule.params?.key as string;
    const v = ctx.draft[key];
    const p = rule.params as { disallowed?: string; unsure?: string; badText?: string; goodText?: string; unsureText?: string; badTitle?: string } | undefined;
    if (!v) {
      return [finding(rule, { status: "review", severity: "low", summary: "You have not answered this in your application details yet.", abstract: "Self-declaration not answered." })];
    }
    if (p?.unsure && v === p.unsure) {
      return [finding(rule, { status: "review", summary: p.unsureText ?? "You are not sure about this — check it on the official portal before applying.", abstract: "Self-declaration answered 'not sure'." })];
    }
    const bad = v === p?.disallowed;
    return [
      finding(rule, {
        status: bad ? "action" : "passed",
        title: bad ? p?.badTitle : undefined,
        summary: bad ? (p?.badText ?? "You said you receive another scholarship, which is reported to make you ineligible.") : (p?.goodText ?? "You declared you are not receiving another scholarship."),
        abstract: bad ? "User's declaration fails the condition." : "User's declaration meets the condition.",
      }),
    ];
  },

  /** Several yes/no exclusion questions; any "yes" fails. Used for PM-KISAN's exclusion list. */
  declaration_any(rule, ctx) {
    const items = (rule.params?.items as { key: string; label: string }[]) ?? [];
    const disallowed = (rule.params?.disallowed as string) ?? "yes";
    const answered = items.filter((i) => ctx.draft[i.key]);
    if (!answered.length) {
      return [finding(rule, { status: "review", severity: "low", summary: "You have not answered the exclusion questions in your application details yet.", abstract: "Exclusion declarations not answered." })];
    }
    const hits = answered.filter((i) => ctx.draft[i.key] === disallowed);
    if (hits.length) {
      return [
        finding(rule, {
          status: "action",
          title: "You may fall under an exclusion",
          summary: `You answered “yes” to: ${hits.map((h) => h.label).join("; ")}. Under the scheme's exclusion list, such families are not eligible.`,
          signals: hits.map((h) => `Declared: ${h.label}`),
          abstract: `${hits.length} exclusion criteria self-declared.`,
        }),
      ];
    }
    const left = items.length - answered.length;
    return [
      finding(rule, {
        status: left ? "review" : "passed",
        severity: "low",
        summary: left ? `${answered.length} of ${items.length} exclusion questions answered “no”; ${left} still unanswered.` : "You declared that none of the exclusion criteria apply to your family.",
        abstract: left ? "Exclusion declarations partly answered." : "No exclusion declared.",
      }),
    ];
  },

  /** Is a filing deadline still open? Dates come from the rule, never computed. */
  deadline(rule, ctx) {
    const p = rule.params as { due: string; belated?: string; label: string; lateNote?: string };
    const due = new Date(p.due + "T23:59:59+05:30");
    const belated = p.belated ? new Date(p.belated + "T23:59:59+05:30") : undefined;
    const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
    if (ctx.now <= due) {
      const days = Math.ceil((due.getTime() - ctx.now.getTime()) / 86_400_000);
      return [finding(rule, { status: "passed", summary: `${p.label} is ${fmt(due)} — ${days} day${days === 1 ? "" : "s"} left.`, abstract: "Deadline still open." })];
    }
    if (belated && ctx.now <= belated) {
      return [
        finding(rule, {
          status: "review",
          title: `${p.label} has passed`,
          summary: `${p.label} was ${fmt(due)}. You can still file a belated return until ${fmt(belated)}. ${p.lateNote ?? ""}`.trim(),
          abstract: "Original deadline passed; belated window open.",
        }),
      ];
    }
    return [
      finding(rule, {
        status: "action",
        title: `${p.label} has passed`,
        summary: `${p.label} was ${fmt(due)}${belated ? ` and the belated window closed on ${fmt(belated)}` : ""}. Check the portal for an updated return or the next year's cycle.`,
        abstract: "Deadline and belated window both passed.",
      }),
    ];
  },

  /** Does ITR-1 (Sahaj) fit the user's declared income profile? Conditions from the rule params. */
  itr_form(rule, ctx) {
    const p = rule.params as { maxIncome: number; maxAgri: number; maxLtcg: number };
    const d = ctx.draft;
    const income = parseAmount(d.total_income);
    if (!d.resident && income === null && !d.income_sources) {
      return [finding(rule, { status: "review", severity: "low", summary: "Answer the income questions in your application details to see whether ITR-1 is the right form.", abstract: "ITR form questions unanswered." })];
    }
    const reasons: string[] = [];
    if (d.resident === "no") reasons.push("you were not a resident of India for the year (ITR-1 is only for resident individuals)");
    if (income !== null && income > p.maxIncome) reasons.push(`your total income of ${formatINR(income)} is above ${formatINR(p.maxIncome)}`);
    if (d.income_sources === "business") reasons.push("you have business or professional income (use ITR-3 or ITR-4)");
    if (d.income_sources === "capital_gains") reasons.push("you have capital gains other than small listed-equity gains (use ITR-2)");
    if (d.income_sources === "foreign") reasons.push("you have foreign income or assets (use ITR-2)");
    if (d.income_sources === "many_houses") reasons.push("you have income from more than two house properties (use ITR-2)");
    const agri = parseAmount(d.agri_income);
    if (agri !== null && agri > p.maxAgri) reasons.push(`your agricultural income of ${formatINR(agri)} is above ${formatINR(p.maxAgri)}`);
    const ltcg = parseAmount(d.ltcg_112a);
    if (ltcg !== null && ltcg > p.maxLtcg) reasons.push(`your long-term gains on listed shares/equity funds of ${formatINR(ltcg)} are above ${formatINR(p.maxLtcg)}`);
    if (reasons.length) {
      return [
        finding(rule, {
          status: "action",
          title: "ITR-1 is not the right form for you",
          summary: `Based on your answers, ${reasons.join("; ")}. Filing the wrong form makes the return defective.`,
          signals: reasons,
          abstract: `ITR-1 conditions failed: ${reasons.length}.`,
        }),
      ];
    }
    const unanswered = ["resident", "total_income", "income_sources"].filter((k) => !d[k]);
    return [
      finding(rule, {
        status: unanswered.length ? "review" : "passed",
        summary: unanswered.length ? `Nothing so far rules out ITR-1, but ${unanswered.length} question${unanswered.length > 1 ? "s are" : " is"} unanswered.` : "Your answers fit ITR-1 (Sahaj): resident, income up to the limit, salary / house property / other sources only.",
        abstract: unanswered.length ? "ITR-1 fit partially checked." : "ITR-1 fit confirmed from declarations.",
      }),
    ];
  },

  external(rule) {
    const items = (rule.params?.items as string[]) ?? [];
    return [
      finding(rule, {
        status: "external",
        summary: `${items.length} conditions can only be confirmed with the official system.`,
        signals: items,
        abstract: `External verification items: ${items.join(" ")}`,
        confidence: 1,
      }),
    ];
  },

  info_note() {
    return [];
  },
};

export function runCheck(rule: RuleDef, ctx: CheckContext): Finding[] {
  const fn = CHECKS[rule.check];
  if (!fn) throw new Error(`Unknown check: ${rule.check}`);
  return fn(rule, ctx);
}
