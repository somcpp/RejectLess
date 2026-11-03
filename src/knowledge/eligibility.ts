// Scheme finder: deterministic eligibility screens for schemes RejectLess knows the rules of.
// Each screen says what the official condition is and which answer it depends on. If an
// answer is missing the result is "need more info", never a pass. Schemes without a researched
// screen are not offered as "eligible" — they only appear as "browse the catalogue".

export interface FinderAnswers {
  age?: number;
  education?: "below10" | "class10" | "class12" | "ug" | "pg";
  /** Annual family income in ₹. */
  income?: number;
  employment?: "student" | "salaried_pf" | "salaried_no_pf" | "self_employed" | "farmer" | "unorganised" | "unemployed" | "retired";
  landholder?: "yes" | "no";
  taxpayer?: "yes" | "no";
  gender?: "female" | "male" | "other";
  state?: string;
}

export type Verdict = "fits" | "maybe" | "no";

export interface ScreenResult {
  schemeId: string;
  verdict: Verdict;
  /** Each condition with how the user's answer fared. */
  conditions: { text: string; status: "met" | "unmet" | "unknown"; basis: "official" | "secondary" }[];
  /** Answers or documents still needed before anyone can say more. */
  missing: string[];
  sourceIds: string[];
}

type Cond = { text: string; basis: "official" | "secondary"; test: (a: FinderAnswers) => boolean | undefined; need?: string };

const SCREENS: { schemeId: string; conditions: Cond[]; sourceIds: string[] }[] = [
  {
    schemeId: "nsp-csss",
    sourceIds: ["csss-guidelines", "nsp-portal"],
    conditions: [
      { text: "Passed Class XII and now in a regular UG/PG course", basis: "official", test: (a) => (a.education ? a.education === "class12" || a.education === "ug" || a.education === "pg" : undefined), need: "your education level" },
      { text: "Family income up to ₹4.5 lakh a year", basis: "official", test: (a) => (a.income !== undefined ? a.income <= 450000 : undefined), need: "family income" },
      { text: "Above the 80th percentile of your board in Class XII", basis: "official", test: () => undefined, need: "your Class XII marksheet (the board cut-off is checked by NSP)" },
      { text: "Age 18–25 (reported)", basis: "secondary", test: (a) => (a.age !== undefined ? a.age >= 18 && a.age <= 25 : undefined), need: "your age" },
    ],
  },
  {
    schemeId: "nmmss",
    sourceIds: ["nsp-portal"],
    conditions: [
      { text: "Studying in Class IX–XII of a government or aided school", basis: "official", test: (a) => (a.education ? a.education === "below10" || a.education === "class10" : undefined), need: "your class" },
      { text: "Parental income up to ₹3.5 lakh a year", basis: "official", test: (a) => (a.income !== undefined ? a.income <= 350000 : undefined), need: "family income" },
      { text: "Cleared the state-level NMMS selection test in Class VIII", basis: "official", test: () => undefined, need: "your NMMS test result" },
    ],
  },
  {
    schemeId: "pm-kisan",
    sourceIds: ["pmkisan-guidelines"],
    conditions: [
      { text: "Family holds cultivable land in its name", basis: "official", test: (a) => (a.landholder ? a.landholder === "yes" : a.employment === "farmer" ? undefined : a.employment ? false : undefined), need: "whether your family holds farmland" },
      { text: "No family member paid income tax last year", basis: "official", test: (a) => (a.taxpayer ? a.taxpayer === "no" : undefined), need: "whether anyone in the family pays income tax" },
      { text: "Not a serving/retired government employee, pensioner over ₹10,000, or professional (doctor, engineer, lawyer, CA)", basis: "official", test: (a) => (a.employment === "retired" ? undefined : a.employment ? true : undefined), need: "the exclusion questions on the form" },
    ],
  },
  {
    schemeId: "epfo",
    sourceIds: ["epfo-member-portal", "egazette-epf-2026-scheme"],
    conditions: [
      { text: "PF was deducted from your salary (you have a UAN)", basis: "official", test: (a) => (a.employment ? a.employment === "salaried_pf" || a.employment === "retired" : undefined), need: "whether PF was deducted" },
      { text: "Final settlement: 12 months after leaving, or at 58 (reported, 2026 Scheme)", basis: "secondary", test: () => undefined, need: "your date of exit from the EPF passbook" },
    ],
  },
  {
    schemeId: "itr",
    sourceIds: ["itr-portal", "incometax-portal"],
    conditions: [
      { text: "Income above the basic exemption limit (₹2.5 lakh old regime; ₹4 lakh new regime from FY 2025-26 — reported) or TDS to claim back", basis: "secondary", test: (a) => (a.income !== undefined ? a.income > 250000 : undefined), need: "your income" },
      { text: "ITR-1 only if salaried/pension income up to ₹50 lakh, no business income", basis: "official", test: (a) => (a.employment ? a.employment !== "self_employed" && a.employment !== "farmer" : undefined), need: "your type of work" },
    ],
  },
  {
    schemeId: "apy",
    sourceIds: [],
    conditions: [
      { text: "Age 18–40", basis: "official", test: (a) => (a.age !== undefined ? a.age >= 18 && a.age <= 40 : undefined), need: "your age" },
      { text: "Not an income-tax payer (joining rule since Oct 2022)", basis: "official", test: (a) => (a.taxpayer ? a.taxpayer === "no" : undefined), need: "whether you pay income tax" },
      { text: "A savings bank or post-office account", basis: "official", test: () => undefined, need: "a bank account" },
    ],
  },
  {
    schemeId: "pm-sym",
    sourceIds: [],
    conditions: [
      { text: "Unorganised worker aged 18–40", basis: "official", test: (a) => (a.age !== undefined && a.employment ? a.employment === "unorganised" && a.age >= 18 && a.age <= 40 : undefined), need: "your age and type of work" },
      { text: "Monthly income up to ₹15,000", basis: "official", test: (a) => (a.income !== undefined ? a.income <= 180000 : undefined), need: "your income" },
      { text: "Not covered by EPFO/ESIC/NPS and not an income-tax payer", basis: "official", test: (a) => (a.employment && a.taxpayer ? a.employment !== "salaried_pf" && a.taxpayer === "no" : undefined), need: "PF/ESIC and tax status" },
    ],
  },
  {
    schemeId: "eshram",
    sourceIds: [],
    conditions: [
      { text: "Unorganised worker aged 16–59", basis: "official", test: (a) => (a.age !== undefined && a.employment ? (a.employment === "unorganised" || a.employment === "self_employed" || a.employment === "farmer") && a.age >= 16 && a.age <= 59 : undefined), need: "your age and type of work" },
      { text: "Not a member of EPFO/ESIC and not an income-tax payer", basis: "official", test: (a) => (a.employment && a.taxpayer ? a.employment !== "salaried_pf" && a.taxpayer === "no" : undefined), need: "PF/ESIC and tax status" },
    ],
  },
];

export function screenSchemes(a: FinderAnswers): ScreenResult[] {
  return SCREENS.map((s) => {
    const conditions = s.conditions.map((c) => {
      const r = c.test(a);
      return { text: c.text, basis: c.basis, status: r === undefined ? ("unknown" as const) : r ? ("met" as const) : ("unmet" as const), need: c.need };
    });
    const verdict: Verdict = conditions.some((c) => c.status === "unmet") ? "no" : conditions.every((c) => c.status === "met") ? "fits" : "maybe";
    return {
      schemeId: s.schemeId,
      verdict,
      conditions: conditions.map(({ text, basis, status }) => ({ text, basis, status })),
      missing: conditions.filter((c) => c.status === "unknown" && c.need).map((c) => c.need!),
      sourceIds: s.sourceIds,
    };
  }).sort((x, y) => ["fits", "maybe", "no"].indexOf(x.verdict) - ["fits", "maybe", "no"].indexOf(y.verdict));
}
