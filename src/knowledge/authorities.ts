// Who runs each application, and where a user gets each document. Shown so a
// first-time applicant knows which office is behind the form and where to turn
// for help. Every entry cites sources; nothing here is a RejectLess promise.

import type { DocTypeId } from "@/engine/types";

export interface Authority {
  appId: string;
  /** Ministry at the top, in English and Hindi. */
  ministry: string;
  ministryHi: string;
  /** The department or organisation that actually handles the form. */
  department: string;
  departmentHi: string;
  portal: { label: string; url: string };
  helplines: { label: string; value: string; note?: string }[];
  grievance?: { label: string; url: string };
  /** What the authority does with the form, in plain words. */
  whatHappens: string;
  /** Timeline the authority itself publishes, if any. */
  timeline?: string;
  fee: string;
  sourceIds: string[];
}

export const AUTHORITIES: Authority[] = [
  {
    appId: "epfo-withdrawal",
    ministry: "Ministry of Labour & Employment",
    ministryHi: "श्रम और रोज़गार मंत्रालय",
    department: "Employees' Provident Fund Organisation (EPFO)",
    departmentHi: "कर्मचारी भविष्य निधि संगठन",
    portal: { label: "EPFO Member e-Sewa portal", url: "https://unifiedportal-mem.epfindia.gov.in/memberinterface/" },
    helplines: [
      { label: "Toll-free call centre", value: "1800 118 005", note: "As listed in the EPFO Citizen Charter." },
      { label: "Short code", value: "14470", note: "Reported by secondary sources; confirm on epfindia.gov.in." },
    ],
    grievance: { label: "EPFiGMS grievance portal", url: "https://epfigms.gov.in/" },
    whatHappens: "You file the claim online with your UAN. EPFO matches it against your KYC (Aadhaar, bank, PAN) and your employer's records, then pays into your bank account.",
    timeline: "EPFO's Citizen Charter commits to settling claims within 20 days of receipt. Check the charter for the current figure.",
    fee: "Free. Never pay anyone to file this claim.",
    sourceIds: ["epfo-portal", "epfo-member-portal", "epfo-citizen-charter", "epfigms"],
  },
  {
    appId: "nsp-csss",
    ministry: "Ministry of Education",
    ministryHi: "शिक्षा मंत्रालय",
    department: "Department of Higher Education, via the National Scholarship Portal (NSP)",
    departmentHi: "उच्च शिक्षा विभाग — राष्ट्रीय छात्रवृत्ति पोर्टल",
    portal: { label: "National Scholarship Portal", url: "https://scholarships.gov.in/" },
    helplines: [{ label: "NSP helpdesk", value: "0120-6619540", note: "8 AM to 8 PM, all days except holidays. Email: helpdesk@nsp.gov.in" }],
    whatHappens: "You apply on NSP. Your institute verifies you first, then the state or board nodal officer, and the money is paid to your Aadhaar-linked bank account by direct transfer.",
    fee: "Free. There is no application fee on NSP.",
    sourceIds: ["nsp-portal", "nsp-contact", "education-ministry"],
  },
  {
    appId: "pm-kisan",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    ministryHi: "कृषि एवं किसान कल्याण मंत्रालय",
    department: "Department of Agriculture & Farmers Welfare (PM-KISAN)",
    departmentHi: "कृषि एवं किसान कल्याण विभाग",
    portal: { label: "PM-KISAN portal", url: "https://pmkisan.gov.in/" },
    helplines: [{ label: "PM-KISAN helpline", value: "155261 / 011-24300606", note: "As listed on pmkisan.gov.in." }],
    grievance: { label: "PM-KISAN grievance", url: "https://pmkisan.gov.in/Grievance.aspx" },
    whatHappens: "Registration is verified by your state against land records; e-KYC is mandatory. Instalments are paid to your Aadhaar-linked bank account.",
    fee: "Free.",
    sourceIds: ["pmkisan-portal"],
  },
  {
    appId: "income-tax-return",
    ministry: "Ministry of Finance",
    ministryHi: "वित्त मंत्रालय",
    department: "Income Tax Department (Central Board of Direct Taxes)",
    departmentHi: "आयकर विभाग (केंद्रीय प्रत्यक्ष कर बोर्ड)",
    portal: { label: "Income Tax e-Filing portal", url: "https://www.incometax.gov.in/iec/foportal/" },
    helplines: [{ label: "e-Filing helpdesk", value: "1800 103 0025 / 1800 419 0025", note: "As listed on the e-Filing portal; confirm current numbers there." }],
    grievance: { label: "e-Nivaran (grievances on the e-Filing portal)", url: "https://www.incometax.gov.in/iec/foportal/" },
    whatHappens: "You file the return online with your PAN, e-verify it (Aadhaar OTP is simplest) within 30 days, and the Centralised Processing Centre processes it. Refunds go only to a pre-validated bank account.",
    timeline: "Processing time varies; intimation under section 143(1) usually arrives within a few weeks to months of e-verification.",
    fee: "Free to file on the government portal. A late fee under section 234F applies to belated returns.",
    sourceIds: ["itr-portal", "incometax-portal"],
  },
  {
    appId: "income-certificate",
    ministry: "State Government (Revenue Department)",
    ministryHi: "राज्य सरकार (राजस्व विभाग)",
    department: "Tehsildar / SDM office, through your state's e-District portal",
    departmentHi: "तहसीलदार / उप-ज़िलाधिकारी कार्यालय",
    portal: { label: "Your state's e-District portal", url: "https://edistrict.gov.in/" },
    helplines: [],
    whatHappens: "A local revenue officer verifies your income declaration and issues the certificate. Which officer and how long it stays valid differ by state.",
    fee: "A small state fee may apply.",
    sourceIds: [],
  },
];

export function getAuthority(appId: string | undefined) {
  return AUTHORITIES.find((a) => a.appId === appId);
}

// ---------------------------------------------------------------------------- where to get each document

export interface DocSource {
  /** One line a first-time applicant understands. */
  where: string;
  /** Official place to download or request it, if there is one. */
  link?: { label: string; url: string };
  steps: string[];
  /** Whether the issuer publishes this document to DigiLocker (as far as RejectLess has confirmed). */
  digilocker: "yes" | "depends" | "no";
  digilockerNote?: string;
  sourceIds: string[];
}

export const DOC_SOURCES: Partial<Record<DocTypeId, DocSource>> = {
  aadhaar: {
    where: "Download the masked e-Aadhaar PDF from UIDAI — it needs the mobile number linked to your Aadhaar.",
    link: { label: "myAadhaar (UIDAI)", url: "https://myaadhaar.uidai.gov.in/" },
    steps: ["Open myAadhaar and choose “Download Aadhaar”.", "Enter your Aadhaar number and the OTP sent to your linked mobile.", "Tick “Masked Aadhaar” so only the last 4 digits show.", "The PDF password is the first 4 letters of your name in capitals + your birth year."],
    digilocker: "yes",
    sourceIds: ["myaadhaar", "uidai", "digilocker"],
  },
  pan: {
    where: "Download the e-PAN from the Income Tax portal, or use the physical card.",
    link: { label: "Income Tax e-Filing portal", url: "https://www.incometax.gov.in/" },
    steps: ["Log in to the e-Filing portal (or use “Instant e-PAN” if you applied with Aadhaar).", "Download the e-PAN PDF.", "A clear photo of the front of the card also works."],
    digilocker: "yes",
    sourceIds: ["pan-services", "digilocker"],
  },
  bank_passbook: {
    where: "The first page of your passbook, or an account statement from net banking or your bank's app.",
    steps: ["Photograph the first page of your passbook with your name, account number and IFSC visible.", "Or download a statement PDF from your bank's app or website.", "No transactions are needed — only the page with your details."],
    digilocker: "no",
    digilockerNote: "Banks do not issue passbooks through DigiLocker.",
    sourceIds: [],
  },
  cancelled_cheque: {
    where: "A cheque leaf from your cheque book with “CANCELLED” written across it.",
    steps: ["Take a leaf from your cheque book.", "Write CANCELLED across it in large letters; do not sign it.", "Photograph it flat, with the account number and IFSC readable."],
    digilocker: "no",
    sourceIds: [],
  },
  epf_passbook: {
    where: "Download the member passbook from the EPFO passbook portal using your UAN.",
    link: { label: "EPFO passbook portal", url: "https://passbook.epfindia.gov.in/" },
    steps: ["Log in with your UAN and password (activate the UAN on the member portal first if needed).", "Choose your member ID and download the passbook PDF.", "Settled or exempted-establishment accounts may not show here — ask your employer for service details instead."],
    digilocker: "no",
    digilockerNote: "RejectLess could not confirm an EPFO passbook on DigiLocker; download it from the EPFO portal.",
    sourceIds: ["epfo-passbook", "epfo-member-portal"],
  },
  marksheet_12: {
    where: "From DigiLocker if your board issues there (CBSE and many state boards do), or the original marksheet from your school.",
    link: { label: "DigiLocker — Education", url: "https://www.digilocker.gov.in/" },
    steps: ["Sign in to DigiLocker and look for your board under “Issued documents”.", "Fetch the Class XII marksheet using your roll number and year.", "Otherwise scan the original marksheet flat, with all four edges visible."],
    digilocker: "depends",
    digilockerNote: "Depends on your board. Check the Issuers list on DigiLocker.",
    sourceIds: ["digilocker"],
  },
  income_certificate: {
    where: "Issued by your Tehsildar or SDM office through your state's e-District portal or a Common Service Centre.",
    link: { label: "e-District (find your state)", url: "https://edistrict.gov.in/" },
    steps: ["Apply on your state's e-District portal or at a Common Service Centre (CSC).", "You usually need Aadhaar, a self-declaration of income and proof of address.", "Validity differs by state — RejectLess hasn't verified your state's rule, so check before you apply."],
    digilocker: "depends",
    digilockerNote: "Some states publish certificates to DigiLocker; others do not.",
    sourceIds: [],
  },
  bonafide_certificate: {
    where: "From your college or university office, on letterhead, for the current academic year.",
    steps: ["Ask the office or principal for a bonafide certificate.", "It must state your course, year and that you study in regular (not distance) mode.", "Scan the whole page including the seal and signature."],
    digilocker: "no",
    sourceIds: [],
  },
};
