import { describe, expect, it } from "vitest";
import type { DocTypeId, DocumentRecord, ExtractedField, FieldKey } from "./types";
import { runCheck, type CheckContext } from "./checks";
import { buildProfile } from "./profile";
import { getRule } from "@/knowledge/rules";
import { getVariant } from "@/knowledge/applications";

// Boundary-condition tests for the eligibility rules of the four working applications.
// Each test states the official condition it exercises (see docs/RULE_AUDIT.md).

const NOW = new Date("2026-11-02T00:00:00+05:30");

function doc(typeId: DocTypeId, values: Partial<Record<FieldKey, string>>): DocumentRecord {
  const fields: ExtractedField[] = Object.entries(values).map(([key, value]) => ({ key: key as FieldKey, value: value!, raw: value!, confidence: 0.95, page: 1, method: "text-layer", status: "extracted" }));
  return { id: typeId, fileName: `${typeId}.pdf`, mimeType: "application/pdf", size: 1, typeId, typeConfidence: 1, typeSource: "auto", status: "analysed", pageCount: 1, pageSizes: [], fields, missingFields: [], addedAt: "", version: 1, synthetic: true };
}

function ctx(appId: string, variantId: string, documents: DocumentRecord[], draft: Record<string, string> = {}, now = NOW): CheckContext {
  const variant = getVariant(appId, variantId)!;
  return { now, variant, documents, draft, profile: buildProfile(documents, draft, variant) };
}

const run = (ruleId: string, c: CheckContext) => runCheck(getRule(ruleId)!, c);
const dmy = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
const monthsAgo = (n: number, from = NOW) => {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  d.setUTCMonth(d.getUTCMonth() - n);
  return d;
};

describe("EPF final settlement — 12-month wait after exit (EPF-FINAL-WAIT)", () => {
  const epf = (doe: Date) => ctx("epfo-withdrawal", "final-settlement", [doc("epf_passbook", { doe: dmy(doe), doj: dmy(monthsAgo(80)), dob: "05/08/1990" })]);
  it("passes at exactly 12 months", () => expect(run("EPF-FINAL-WAIT", epf(monthsAgo(12)))[0].status).toBe("passed"));
  it("fails at 11 months", () => expect(run("EPF-FINAL-WAIT", epf(monthsAgo(11)))[0].status).toBe("action"));
  it("is not applicable at 58+", () => {
    const c = ctx("epfo-withdrawal", "final-settlement", [doc("epf_passbook", { doe: dmy(monthsAgo(1)), dob: "01/01/1960" })]);
    expect(run("EPF-FINAL-WAIT", c)[0].status).toBe("passed");
  });
  it("reports 'could not check' without a date of exit", () => {
    const c = ctx("epfo-withdrawal", "final-settlement", [doc("epf_passbook", { doj: "01/01/2015" })]);
    expect(run("EPF-FINAL-WAIT", c)[0].missingInput).toBe("date of exit");
  });
});

describe("EPF TDS — service under 5 years AND amount ≥ ₹50,000 (EPF-TDS-PAN)", () => {
  const tds = (serviceMonths: number, balance: string, draft: Record<string, string> = {}) => {
    const doe = monthsAgo(13);
    return ctx("epfo-withdrawal", "final-settlement", [doc("epf_passbook", { doj: dmy(monthsAgo(13 + serviceMonths)), doe: dmy(doe), balance })], draft);
  };
  it("TDS likely at 59 months and ₹50,000", () => expect(run("EPF-TDS-PAN", tds(59, "50,000"))[0].status).not.toBe("passed"));
  it("no TDS at 60 months", () => expect(run("EPF-TDS-PAN", tds(60, "3,00,000"))[0].status).toBe("passed"));
  it("no TDS below ₹50,000", () => expect(run("EPF-TDS-PAN", tds(24, "49,999"))[0].status).toBe("passed"));
});

describe("EPF partial withdrawal (Form 31)", () => {
  const partial = (membershipMonths: number, balance: string, amount?: string) =>
    ctx("epfo-withdrawal", "partial-withdrawal", [doc("epf_passbook", { doj: dmy(monthsAgo(membershipMonths)), balance })], amount ? { amount, purpose: "essential" } : {});
  it("12 months of membership passes; 11 fails (EPF-31-MEMBERSHIP)", () => {
    expect(run("EPF-31-MEMBERSHIP", partial(12, "1,00,000"))[0].status).toBe("passed");
    expect(run("EPF-31-MEMBERSHIP", partial(11, "1,00,000"))[0].status).toBe("action");
  });
  it("75% of balance is allowed; one rupee more is not (EPF-31-AMOUNT)", () => {
    expect(run("EPF-31-AMOUNT", partial(24, "1,00,000", "75000"))[0].status).toBe("passed");
    expect(run("EPF-31-AMOUNT", partial(24, "1,00,000", "75001"))[0].status).toBe("action");
  });
  it("below the ₹1,000 minimum fails", () => expect(run("EPF-31-AMOUNT", partial(24, "1,00,000", "999"))[0].status).toBe("action"));
});

describe("EPS withdrawal benefit — under 10 years of service (EPF-10C-SERVICE)", () => {
  const pension = (serviceMonths: number) => ctx("epfo-withdrawal", "pension-withdrawal", [doc("epf_passbook", { doj: dmy(monthsAgo(40 + serviceMonths)), doe: dmy(monthsAgo(40)) })]);
  it("119 months is eligible", () => expect(run("EPF-10C-SERVICE", pension(119))[0].status).toBe("passed"));
  it("120 months is not", () => expect(run("EPF-10C-SERVICE", pension(120))[0].status).toBe("action"));
});

describe("NSP CSSS — family income below ₹4.5 lakh (NSP-INCOME)", () => {
  const nsp = (income: string) => ctx("nsp-csss", "fresh", [doc("income_certificate", { annual_income: income })]);
  it("₹4,49,999 passes", () => expect(run("NSP-INCOME", nsp("449999"))[0].status).toBe("passed"));
  it("₹4,50,000 fails (limit is 'up to' in the official text — see audit note)", () => expect(run("NSP-INCOME", nsp("450000"))[0].status).toBe("action"));
});

describe("PM-KISAN — exclusion list (PMK-EXCLUSIONS)", () => {
  const pmk = (draft: Record<string, string>) => ctx("pm-kisan", "registration", [], draft);
  it("any 'yes' is an exclusion", () => expect(run("PMK-EXCLUSIONS", pmk({ excl_income_tax: "yes", excl_govt: "no" }))[0].status).toBe("action"));
  it("all 'no' passes", () => {
    const all = Object.fromEntries(["excl_income_tax", "excl_govt", "excl_pension", "excl_professional", "excl_constitutional", "excl_institutional"].map((k) => [k, "no"]));
    expect(run("PMK-EXCLUSIONS", pmk(all))[0].status).toBe("passed");
  });
  it("unanswered is 'review', never a pass", () => expect(run("PMK-EXCLUSIONS", pmk({}))[0].status).toBe("review"));
  it("land record missing is an action (PMK-LAND)", () => expect(run("PMK-LAND", pmk({}))[0].status).toBe("action"));
});

describe("ITR-1 — form fit (ITR-FORM)", () => {
  const itr = (draft: Record<string, string>) => ctx("income-tax-return", "itr1", [], { resident: "yes", income_sources: "salary", ...draft });
  it("₹50,00,000 fits", () => expect(run("ITR-FORM", itr({ total_income: "5000000" }))[0].status).toBe("passed"));
  it("₹50,00,001 does not", () => expect(run("ITR-FORM", itr({ total_income: "5000001" }))[0].status).toBe("action"));
  it("agricultural income ₹5,000 fits; ₹5,001 does not", () => {
    expect(run("ITR-FORM", itr({ total_income: "800000", agri_income: "5000" }))[0].status).toBe("passed");
    expect(run("ITR-FORM", itr({ total_income: "800000", agri_income: "5001" }))[0].status).toBe("action");
  });
  it("listed-equity LTCG ₹1,25,000 fits; ₹1,25,001 does not", () => {
    expect(run("ITR-FORM", itr({ total_income: "800000", ltcg_112a: "125000" }))[0].status).toBe("passed");
    expect(run("ITR-FORM", itr({ total_income: "800000", ltcg_112a: "125001" }))[0].status).toBe("action");
  });
  it("business income or non-resident rules out ITR-1", () => {
    expect(run("ITR-FORM", itr({ total_income: "800000", income_sources: "business" }))[0].status).toBe("action");
    expect(run("ITR-FORM", itr({ total_income: "800000", resident: "no" }))[0].status).toBe("action");
  });
});

describe("ITR-1 — PAN–Aadhaar link and deadline", () => {
  const itr = (draft: Record<string, string>, now = NOW) => ctx("income-tax-return", "itr1", [], draft, now);
  it("'no' is an action, 'unsure' a review, 'yes' a pass (ITR-PAN-LINK)", () => {
    expect(run("ITR-PAN-LINK", itr({ pan_aadhaar_linked: "no" }))[0].status).toBe("action");
    expect(run("ITR-PAN-LINK", itr({ pan_aadhaar_linked: "unsure" }))[0].status).toBe("review");
    expect(run("ITR-PAN-LINK", itr({ pan_aadhaar_linked: "yes" }))[0].status).toBe("passed");
  });
  it("deadline: open on the due date, belated after it, closed after 31 Dec (ITR-DUE)", () => {
    expect(run("ITR-DUE", itr({}, new Date("2026-07-31T12:00:00+05:30")))[0].status).toBe("passed");
    expect(run("ITR-DUE", itr({}, new Date("2026-08-01T00:00:01+05:30")))[0].status).toBe("review");
    expect(run("ITR-DUE", itr({}, new Date("2027-01-01T00:00:01+05:30")))[0].status).toBe("action");
  });
  it("Form 16 PAN must equal the PAN card (ITR-FORM16-PAN)", () => {
    const same = ctx("income-tax-return", "itr1", [doc("pan", { pan_number: "ABCPK1234L" }), doc("form16", { pan_number: "ABCPK1234L" })]);
    const diff = ctx("income-tax-return", "itr1", [doc("pan", { pan_number: "ABCPK1234L" }), doc("form16", { pan_number: "ABCPK1234M" })]);
    expect(run("ITR-FORM16-PAN", same)[0].status).toBe("passed");
    expect(run("ITR-FORM16-PAN", diff)[0].status).toBe("action");
  });
});
