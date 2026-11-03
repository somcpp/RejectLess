// External verifications: official portals where the applicant can confirm a detail
// themselves BEFORE applying, with what to enter and what they should see. These are
// the same for everyone applying to a scheme (plus a generic set for every scheme), so
// they live in knowledge, not in the engine. Nothing here is checked by RejectLess.

import type { DocTypeId } from "@/engine/types";
import { statePortal } from "./ministries";

export interface Verification {
  id: string;
  title: string;
  titleHi?: string;
  portal: { label: string; url: string };
  /** What to type on that portal. Plain words; never pre-filled with the user's values. */
  enter: string;
  /** What a good result looks like. */
  expect: string;
  why: string;
  basis: "official" | "secondary";
}

const V = (v: Omit<Verification, "basis"> & { basis?: Verification["basis"] }): Verification => ({ basis: "official", ...v });

/** Applies to every application. */
const GENERIC: Verification[] = [
  V({
    id: "aadhaar-verify",
    title: "Verify your Aadhaar number is active",
    titleHi: "आधार सत्यापन",
    portal: { label: "myAadhaar — Verify Aadhaar", url: "https://myaadhaar.uidai.gov.in/verifyAadhaar" },
    enter: "Your 12-digit Aadhaar number and the captcha.",
    expect: "“Aadhaar number exists”, with your age band, gender, state and the last 3 digits of the linked mobile. If the mobile is wrong, update it at an Aadhaar centre first — every portal sends OTPs there.",
    why: "Almost every scheme authenticates you with an Aadhaar OTP.",
  }),
  V({
    id: "bank-seeding",
    title: "Check which bank account is Aadhaar-seeded (for DBT)",
    titleHi: "बैंक आधार सीडिंग स्थिति",
    portal: { label: "myAadhaar — Bank Seeding Status", url: "https://myaadhaar.uidai.gov.in/bank-seeding-status" },
    enter: "Log in with Aadhaar + OTP, then open “Bank Seeding Status”.",
    expect: "The bank name you expect, with status “Active”. Government money goes only to this account, whatever you type on the form.",
    why: "DBT payments fail silently when the seeded account is an old or closed one.",
  }),
  V({
    id: "digilocker",
    title: "Fetch verified copies of your documents",
    titleHi: "डिजिलॉकर",
    portal: { label: "DigiLocker — Issued documents", url: "https://www.digilocker.gov.in/" },
    enter: "Sign in with Aadhaar, open “Issued documents” and search the issuer (UIDAI, your board, Income Tax Department…).",
    expect: "Documents that portals accept without further verification. Use these instead of photos where available.",
    why: "Issuer-pushed copies cannot be rejected as unclear or tampered.",
  }),
];

const BY_APP: Record<string, Verification[]> = {
  "nsp-csss": [
    V({
      id: "board-marks",
      title: "Verify your Class X and XII marksheets",
      titleHi: "बोर्ड अंकपत्र सत्यापन",
      portal: { label: "DigiLocker — Board results", url: "https://results.digilocker.gov.in/" },
      enter: "Your board, year, roll number and date of birth (CBSE, CISCE and most state boards publish here). Otherwise use your board's own result-verification page.",
      expect: "The marksheet with the same roll number, name spelling and marks as your copy. NSP and the institute verify marks against the board record.",
      why: "The 80th-percentile condition is checked against the board's own data, not your scan.",
    }),
    V({
      id: "institute",
      title: "Confirm your college is registered on NSP",
      titleHi: "संस्थान पंजीकरण",
      portal: { label: "NSP — Search institute", url: "https://scholarships.gov.in/" },
      enter: "Use “Search Institute / School / ITI / College” with your state, district and college name (or AISHE code).",
      expect: "Your college listed with a nodal officer. If it is not, the institute must register before you can be verified — ask the office.",
      why: "The institute does the first-level verification; unregistered institutes cannot approve applications.",
    }),
    V({
      id: "income-cert",
      title: "Verify your income certificate number",
      titleHi: "आय प्रमाण पत्र सत्यापन",
      portal: { label: "", url: "" }, // filled per state below
      enter: "The certificate / application number printed on the income certificate, under “Verify certificate”.",
      expect: "The issuing officer, your father's/guardian's name and the income amount, exactly as on your copy, and an issue date within the validity your state allows.",
      why: "NSP rejects certificates that are expired or whose number does not verify.",
    }),
    V({
      id: "domicile-cert",
      title: "Verify your domicile / residence certificate",
      titleHi: "निवास प्रमाण पत्र सत्यापन",
      portal: { label: "", url: "" },
      enter: "The certificate number under “Verify certificate” on your state's portal.",
      expect: "Your name and address as issued. Some boards and states ask for it for state-quota verification.",
      why: "Needed when the state nodal officer checks domicile for state-level merit lists.",
      basis: "secondary",
    }),
    V({
      id: "nsp-status",
      title: "After applying: track the application",
      portal: { label: "NSP — Check your status", url: "https://scholarships.gov.in/" },
      enter: "Your application ID and date of birth under “Check Your Status”, or log in to the One-Time Registration (OTR) account.",
      expect: "Stages: Institute verified → District/State verified → Ministry → Payment. “Defective” means a document was rejected — fix it in the correction window.",
      why: "Most scholarships are lost at the institute-verification stage without the student noticing.",
    }),
  ],
  "epfo-withdrawal": [
    V({
      id: "uan-kyc",
      title: "Check your UAN KYC (Aadhaar, PAN, bank)",
      titleHi: "यूएएन केवाईसी",
      portal: { label: "EPFO Member e-Sewa", url: "https://unifiedportal-mem.epfindia.gov.in/memberinterface/" },
      enter: "Log in with UAN and password → Manage → KYC.",
      expect: "Aadhaar, PAN and bank all showing “Approved by employer / verified”. The bank account here must be the one you want the money in.",
      why: "Online claims are only allowed when Aadhaar is verified and the bank KYC matches.",
    }),
    V({
      id: "service-history",
      title: "Confirm your date of exit is recorded",
      titleHi: "सेवा विवरण",
      portal: { label: "EPFO Member e-Sewa — Service history", url: "https://unifiedportal-mem.epfindia.gov.in/memberinterface/" },
      enter: "View → Service History.",
      expect: "Your last employer with a date of exit. If it is blank, mark it yourself under Manage → Mark Exit (allowed 2 months after leaving) or ask the employer.",
      why: "Final settlement and the waiting period are counted from this date.",
    }),
    V({
      id: "passbook",
      title: "Check your balance and contributions",
      portal: { label: "EPFO passbook portal", url: "https://passbook.epfindia.gov.in/" },
      enter: "UAN and password (the passbook is available 6 hours after UAN activation).",
      expect: "Contributions up to your last month of work. Missing months mean the employer has not deposited — the claim will be short.",
      why: "The amount, TDS and the 25%-balance rule depend on this figure.",
    }),
    V({
      id: "pan-link-epf",
      title: "Confirm PAN is linked to Aadhaar (for TDS)",
      portal: { label: "Income Tax — Link Aadhaar Status", url: "https://eportal.incometax.gov.in/iec/foservices/#/pre-login/link-aadhaar-status" },
      enter: "Your PAN and Aadhaar number.",
      expect: "“Your PAN is already linked to Aadhaar”. An unlinked PAN is inoperative and TDS is deducted at 20%.",
      why: "Avoids the higher TDS rate when service is under 5 years.",
    }),
    V({
      id: "ifsc",
      title: "Confirm your IFSC is current",
      portal: { label: "RBI — IFSC / MICR search", url: "https://www.rbi.org.in/Scripts/IFSCMICRDetails.aspx" },
      enter: "Your bank and branch, or the IFSC from your passbook.",
      expect: "The same IFSC. After a merger (e.g. old Dena/Vijaya/Allahabad/Andhra/Corporation/Syndicate/OBC/United codes) the new bank's code must be used.",
      why: "An old IFSC is the most common reason for a claim being returned.",
    }),
    V({
      id: "claim-status",
      title: "After filing: track the claim",
      portal: { label: "EPFO — Track claim status", url: "https://passbook.epfindia.gov.in/MemClaimStatusUAN/" },
      enter: "UAN and captcha.",
      expect: "“Under process” → “Settled”. If “Rejected”, the reason is shown — usually a KYC or date-of-exit issue from the list above.",
      why: "Lets you fix and refile instead of waiting.",
    }),
  ],
  "pm-kisan": [
    V({
      id: "pmk-status",
      title: "Check your beneficiary status / e-KYC",
      titleHi: "लाभार्थी स्थिति / ई-केवाईसी",
      portal: { label: "PM-KISAN — Know Your Status", url: "https://pmkisan.gov.in/" },
      enter: "Your registration number (or search by mobile/Aadhaar under “Know Your Registration No.”) and OTP. For e-KYC use the “e-KYC” tile with Aadhaar + OTP, or biometric at a CSC.",
      expect: "e-KYC “Yes”, Aadhaar–bank seeding “Yes”, land seeding “Yes”. Any “No” blocks instalments.",
      why: "The three “Yes” flags are exactly what the portal needs to pay.",
    }),
    V({
      id: "land-record",
      title: "Check the land record in your name",
      titleHi: "भूलेख / खतौनी",
      portal: { label: "", url: "" }, // state Bhulekh, filled below
      enter: "Your district, tehsil, village and khata / khasra (survey) number, or search by holder name.",
      expect: "Your name (or your family's) as holder of cultivable land, with the same khata number you entered on the form.",
      why: "The state matches your registration against this record before approving.",
      basis: "secondary",
    }),
  ],
  "income-tax-return": [
    V({
      id: "pan-link",
      title: "Confirm PAN is linked to Aadhaar",
      titleHi: "पैन–आधार लिंक स्थिति",
      portal: { label: "Income Tax — Link Aadhaar Status", url: "https://eportal.incometax.gov.in/iec/foservices/#/pre-login/link-aadhaar-status" },
      enter: "Your PAN and Aadhaar number.",
      expect: "“Your PAN is already linked to Aadhaar”. Otherwise link it (a fee applies) before filing.",
      why: "An inoperative PAN means no refund and a defective return.",
    }),
    V({
      id: "ais-26as",
      title: "Match Form 16 with Form 26AS / AIS",
      titleHi: "फॉर्म 26AS / AIS",
      portal: { label: "e-Filing portal — AIS", url: "https://www.incometax.gov.in/iec/foportal/" },
      enter: "Log in → e-File → Income Tax Returns → View Form 26AS, and Services → Annual Information Statement.",
      expect: "The TDS amount and employer TAN exactly as on your Form 16, plus bank interest you must also report.",
      why: "Mismatches with AIS are the most common reason for a notice.",
    }),
    V({
      id: "verify-form16",
      title: "Verify Form 16 is genuine (TRACES)",
      portal: { label: "TRACES — Verify TDS certificate", url: "https://www.tdscpc.gov.in/" },
      enter: "Taxpayer login, then “Verify TDS Certificate” with the certificate number, TAN and amount from Form 16.",
      expect: "“Valid certificate”. If not, the employer has not filed the TDS return — your credit will not show.",
      why: "Protects you from claiming TDS that was never deposited.",
      basis: "secondary",
    }),
    V({
      id: "prevalidate",
      title: "Pre-validate the refund bank account",
      portal: { label: "e-Filing portal — My Bank Account", url: "https://www.incometax.gov.in/iec/foportal/" },
      enter: "Log in → My Profile → My Bank Account → Add; enter account number and IFSC.",
      expect: "Status “Validated” and “EVC enabled”. The name on the account must match your PAN name.",
      why: "Refunds are issued only to a pre-validated account.",
    }),
    V({
      id: "everify",
      title: "After filing: e-verify within 30 days",
      portal: { label: "e-Filing portal — e-Verify Return", url: "https://www.incometax.gov.in/iec/foportal/" },
      enter: "Aadhaar OTP, net banking or bank EVC, from the “e-Verify Return” link.",
      expect: "“Return successfully e-verified”. An unverified return is treated as not filed.",
      why: "The 30-day window is strict.",
    }),
  ],
};

/** Correction portals for issues on a given document type ("where to fix it"). */
export const CORRECTIONS: Partial<Record<DocTypeId, { label: string; url: string; how: string }>> = {
  aadhaar: { label: "myAadhaar — Update Aadhaar", url: "https://myaadhaar.uidai.gov.in/", how: "Name, date of birth and address can be updated online with a supporting document; mobile and biometrics only at an Aadhaar centre." },
  pan: { label: "PAN correction (Protean / UTIITSL)", url: "https://www.incometax.gov.in/iec/foportal/", how: "Apply for “Changes or correction in PAN data” with proof; the name must match Aadhaar for linking." },
  bank_passbook: { label: "Your bank branch", url: "", how: "Ask the branch to correct the account-holder name or update KYC; take Aadhaar and PAN. Get a fresh statement afterwards." },
  cancelled_cheque: { label: "Your bank branch", url: "", how: "Request a cheque book with the correct printed name." },
  epf_passbook: { label: "EPFO Member e-Sewa — Modify basic details", url: "https://unifiedportal-mem.epfindia.gov.in/memberinterface/", how: "Manage → Modify Basic Details: enter the name/DOB exactly as in Aadhaar; your employer approves the change." },
  marksheet_12: { label: "Your board's correction cell", url: "", how: "Name or date-of-birth corrections on a marksheet are done by the board; apply through your school." },
  income_certificate: { label: "", url: "", how: "Apply for a fresh certificate on your state's e-District portal if the details or date are wrong." },
  bonafide_certificate: { label: "Your college office", url: "", how: "Ask for a reissued certificate stating the course, year and “regular” mode." },
  form16: { label: "Your employer's payroll / HR", url: "", how: "Only the employer can correct a Form 16 (by revising the TDS return)." },
  land_record: { label: "", url: "", how: "Mutation / correction of a land record is done at the tehsil (Revenue office) or through your state's Bhulekh portal." },
};

const BHULEKH: Record<string, { label: string; url: string }> = {
  UP: { label: "UP Bhulekh", url: "https://upbhulekh.gov.in/" },
  BR: { label: "Bihar Bhumi", url: "https://biharbhumi.bihar.gov.in/" },
  MP: { label: "MP Bhulekh", url: "https://mpbhulekh.gov.in/" },
  MH: { label: "Mahabhumi (7/12)", url: "https://bhulekh.mahabhumi.gov.in/" },
  RJ: { label: "Apna Khata Rajasthan", url: "https://apnakhata.rajasthan.gov.in/" },
  KA: { label: "Bhoomi Karnataka", url: "https://landrecords.karnataka.gov.in/" },
  TS: { label: "Dharani Telangana", url: "https://dharani.telangana.gov.in/" },
  AP: { label: "Meebhoomi AP", url: "https://meebhoomi.ap.gov.in/" },
  WB: { label: "Banglarbhumi", url: "https://banglarbhumi.gov.in/" },
  GJ: { label: "AnyRoR Gujarat", url: "https://anyror.gujarat.gov.in/" },
  OD: { label: "Bhulekh Odisha", url: "https://bhulekh.ori.nic.in/" },
  HR: { label: "Jamabandi Haryana", url: "https://jamabandi.nic.in/" },
  PB: { label: "Jamabandi Punjab", url: "https://jamabandi.punjab.gov.in/" },
  JH: { label: "JharBhoomi", url: "https://jharbhoomi.jharkhand.gov.in/" },
  CG: { label: "Bhuiyan Chhattisgarh", url: "https://bhuiyan.cg.nic.in/" },
  UK: { label: "Bhulekh Uttarakhand", url: "https://bhulekh.uk.gov.in/" },
  TN: { label: "TN e-Services (Patta / Chitta)", url: "https://eservices.tn.gov.in/" },
};

/** The verification list for an application, with state-specific portals filled in. */
export function verificationsFor(appId: string, stateCode?: string): Verification[] {
  const portal = statePortal(stateCode ?? "");
  const bhulekh = (stateCode ? BHULEKH[stateCode] : undefined) ?? { label: "Your state's Bhulekh / land-records portal", url: "https://www.india.gov.in/topics/agriculture/land-records" };
  const fill = (v: Verification): Verification => {
    if (v.id === "income-cert" || v.id === "domicile-cert") return { ...v, portal: { label: `${portal.label} — Verify certificate`, url: portal.url } };
    if (v.id === "land-record") return { ...v, portal: bhulekh };
    return v;
  };
  return [...(BY_APP[appId] ?? []).map(fill), ...GENERIC];
}
