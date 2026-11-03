// Onboarding: who the user is, where they live and what they want to do.
// These answers are NOT personal identifiers — they tailor the flow and may be
// shared with the AI assistant as context.

export type RoleId = "employee" | "former_employee" | "student" | "self_employed" | "helper";
export type WorkId = "private_pf" | "government" | "contract" | "unsure";

export interface UserProfile {
  role: RoleId;
  work?: WorkId;
  state: string;
  goal: string;
}

export const ROLES: { id: RoleId; label: string; hint: string; icon: string }[] = [
  { id: "employee", label: "I'm working", hint: "Salaried job, currently employed", icon: "briefcase" },
  { id: "former_employee", label: "I left my job", hint: "Retired, resigned or between jobs", icon: "door" },
  { id: "student", label: "I'm a student", hint: "School, college or university", icon: "graduation" },
  { id: "self_employed", label: "Self-employed or farmer", hint: "Own work, business or farming", icon: "sprout" },
  { id: "helper", label: "I'm helping someone", hint: "Family member, CSC or volunteer", icon: "hands" },
];

export const WORK_TYPES: { id: WorkId; label: string; hint: string }[] = [
  { id: "private_pf", label: "Private company with PF", hint: "PF is deducted from salary (UAN)" },
  { id: "government", label: "Government job", hint: "Central or state government" },
  { id: "contract", label: "Contract or gig work", hint: "Through an agency or platform" },
  { id: "unsure", label: "Not sure", hint: "We'll keep it general" },
];

export const WORK_NOTES: Partial<Record<WorkId, string>> = {
  government:
    "Most government employees save through GPF or NPS, not EPF. If PF was deducted under EPFO (you have a UAN), these checks still apply.",
  contract: "If your agency deducted PF and you have a UAN, EPF rules apply to you the same way.",
};

export interface Goal {
  id: string;
  label: string;
  hint: string;
  appId?: string;
  variantId?: string;
  roles: RoleId[];
  comingSoon?: boolean;
}

export const GOALS: Goal[] = [
  {
    id: "epf-final",
    label: "Withdraw my full PF",
    hint: "Final settlement after leaving a job or retiring",
    appId: "epfo-withdrawal",
    variantId: "final-settlement",
    roles: ["former_employee", "helper"],
  },
  {
    id: "epf-partial",
    label: "Take part of my PF now",
    hint: "An advance for illness, education, marriage or a house",
    appId: "epfo-withdrawal",
    variantId: "partial-withdrawal",
    roles: ["employee", "former_employee", "helper"],
  },
  {
    id: "epf-pension",
    label: "Withdraw my pension amount",
    hint: "The EPS part, if you worked less than 10 years",
    appId: "epfo-withdrawal",
    variantId: "pension-withdrawal",
    roles: ["former_employee", "helper"],
  },
  {
    id: "nsp-csss",
    label: "Apply for a central scholarship",
    hint: "For college students who did well in Class XII",
    appId: "nsp-csss",
    variantId: "fresh",
    roles: ["student", "helper"],
  },
  {
    id: "pm-kisan",
    label: "Register for PM-KISAN",
    hint: "₹6,000 a year for landholding farmer families",
    appId: "pm-kisan",
    variantId: "registration",
    roles: ["self_employed", "helper"],
  },
  {
    id: "itr-1",
    label: "File my income tax return (ITR-1)",
    hint: "Salaried or pensioner, income up to ₹50 lakh",
    appId: "income-tax-return",
    variantId: "itr1",
    roles: ["employee", "former_employee", "self_employed", "helper"],
  },
  {
    id: "income-cert",
    label: "Get an income certificate",
    hint: "Issued by your state",
    roles: ["employee", "former_employee", "student", "self_employed", "helper"],
    comingSoon: true,
  },
];

export function goalsFor(role: RoleId): Goal[] {
  return GOALS.filter((g) => g.roles.includes(role));
}

export function getGoal(id: string | undefined) {
  return GOALS.find((g) => g.id === id);
}

export function goalForVariant(appId: string, variantId: string) {
  return GOALS.find((g) => g.appId === appId && g.variantId === variantId);
}

// ---------------------------------------------------------------------------- states

export const STATES: { code: string; name: string; ut?: boolean }[] = [
  { code: "AN", name: "Andaman and Nicobar Islands", ut: true },
  { code: "AP", name: "Andhra Pradesh" },
  { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BR", name: "Bihar" },
  { code: "CH", name: "Chandigarh", ut: true },
  { code: "CG", name: "Chhattisgarh" },
  { code: "DN", name: "Dadra and Nagar Haveli and Daman and Diu", ut: true },
  { code: "DL", name: "Delhi", ut: true },
  { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" },
  { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JK", name: "Jammu and Kashmir", ut: true },
  { code: "JH", name: "Jharkhand" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "LA", name: "Ladakh", ut: true },
  { code: "LD", name: "Lakshadweep", ut: true },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "MH", name: "Maharashtra" },
  { code: "MN", name: "Manipur" },
  { code: "ML", name: "Meghalaya" },
  { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" },
  { code: "OD", name: "Odisha" },
  { code: "PY", name: "Puducherry", ut: true },
  { code: "PB", name: "Punjab" },
  { code: "RJ", name: "Rajasthan" },
  { code: "SK", name: "Sikkim" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TS", name: "Telangana" },
  { code: "TR", name: "Tripura" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "UK", name: "Uttarakhand" },
  { code: "WB", name: "West Bengal" },
];

export function stateName(code: string | undefined) {
  return STATES.find((s) => s.code === code)?.name ?? "";
}

/**
 * What the state changes for a goal. No state-specific rules have been researched yet,
 * so state notes say so honestly instead of guessing portals or validity periods.
 */
export function stateNote(goalId: string | undefined, code: string | undefined): string {
  const name = stateName(code) || "your state";
  if (goalId?.startsWith("epf")) {
    return `EPF is a central scheme, so the rules are the same in ${name} as everywhere in India.`;
  }
  if (goalId === "nsp-csss") {
    return `The scholarship itself is central, but your income certificate is issued by ${name}. Who issues it and how long it stays valid can differ by state — RejectLess hasn't verified ${name}'s rules yet, so we'll flag what to check.`;
  }
  return `Rules for ${name} haven't been researched yet.`;
}

// ---------------------------------------------------------------------------- "help me choose"

export interface PfAnswers {
  leftJob: "yes" | "no";
  monthsSinceLeft?: "lt1" | "1to12" | "12to36" | "gt36";
  years?: "lt1" | "1to5" | "5to10" | "gt10";
  age58?: "yes" | "no";
}

export interface Recommendation {
  goalId: string;
  why: string;
  later?: string;
}

/** Deterministic recommendation from the EPF Scheme, 2026 rules (marked "Verify" in the app). */
export function recommendPf(a: PfAnswers): Recommendation {
  if (a.age58 === "yes") {
    return { goalId: "epf-final", why: "At 58 or older you can usually withdraw your full PF without a waiting period." };
  }
  if (a.leftJob === "no") {
    if (a.years === "lt1") {
      return {
        goalId: "epf-partial",
        why: "While you're working, a partial withdrawal is the only option — but it's reported to need 12 months of membership, which you may not have yet. We'll check your dates.",
      };
    }
    return { goalId: "epf-partial", why: "While you're still working, you can take part of your PF for illness, education, marriage, a house or special circumstances." };
  }
  if (a.monthsSinceLeft === "lt1" || a.monthsSinceLeft === "1to12") {
    return {
      goalId: "epf-partial",
      why: "Full settlement is reported to need 12 months without a PF-covered job. Until then you can take up to 75% of your balance as a partial withdrawal.",
      later: "Full settlement opens once 12 months have passed since you left.",
    };
  }
  const pension = a.years !== "gt10" && a.monthsSinceLeft === "gt36";
  return {
    goalId: "epf-final",
    why: "It has been more than 12 months since you left, so you can usually apply for full settlement.",
    later: pension
      ? "With under 10 years of service and over 36 months since leaving, you may also be able to withdraw your pension amount (Form 10C)."
      : a.years !== "gt10"
        ? "Your pension amount (Form 10C) is reported to become withdrawable 36 months after you left."
        : undefined,
  };
}
