import type { ApplicationDef, DraftFieldDef } from "@/engine/types";

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: "briefcase" | "graduation" | "wheat" | "badge" | "landmark";
}

export const CATEGORIES: Category[] = [
  { id: "employment", name: "Employment & PF", description: "Provident fund withdrawals, pension and settlements.", icon: "briefcase" },
  { id: "education", name: "Scholarships & Education", description: "Central and state scholarships for students.", icon: "graduation" },
  { id: "farmer", name: "Farmer Benefits", description: "Income support and crop-related schemes.", icon: "wheat" },
  { id: "tax", name: "Income Tax", description: "Filing your yearly return.", icon: "landmark" },
  { id: "certificates", name: "Certificates & Identity", description: "Income, caste and domicile certificates.", icon: "badge" },
  { id: "other", name: "Other services", description: "Pensions, welfare and social-security schemes.", icon: "landmark" },
];

const yesNo = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const EPF_COMMON: DraftFieldDef[] = [
  { key: "name", label: "Your name as you will enter it", type: "text", maps: "name", help: "Usually exactly as in your Aadhaar." },
  { key: "dob", label: "Date of birth", type: "date", maps: "dob" },
  { key: "father_name", label: "Father's / husband's name", type: "text", maps: "father_name" },
  { key: "doe", label: "Last working day (date of exit)", type: "date", maps: "doe", help: "As recorded by your last employer, if you know it." },
  { key: "account_number", label: "Bank account number", type: "text", maps: "account_number", sensitive: true },
  { key: "ifsc", label: "IFSC", type: "text", maps: "ifsc" },
  {
    key: "pan_linked",
    label: "Is your PAN linked to your UAN?",
    type: "select",
    options: [...yesNo, { value: "unsure", label: "Not sure" }],
  },
];

export const APPLICATIONS: ApplicationDef[] = [
  {
    id: "epfo-withdrawal",
    categoryId: "employment",
    name: "EPF withdrawal & settlement",
    shortName: "EPFO",
    authority: "Employees' Provident Fund Organisation (EPFO)",
    description:
      "Prepare an online claim to withdraw your provident fund or pension contributions. RejectLess checks your documents and the details you plan to enter before you file on the EPFO member portal.",
    audience: "Salaried employees and former employees with a UAN",
    status: "available",
    officialPortal: "https://unifiedportal-mem.epfindia.gov.in/memberinterface/",
    rulePackVersion: "2026.11.1",
    lastReviewed: "2026-11-02",
    notices: [
      "Rules updated for the Employees' Provident Funds Scheme, 2026 (G.S.R. 525(E), 29 June 2026). Some conditions are taken from reputable reporting because the official text could not be retrieved — these are marked \"Verify\".",
      "Since April 2025, EPFO does not require a cheque or passbook image for online claims. RejectLess uses them only to check your bank details.",
    ],
    sourceIds: ["epfo-portal", "egazette", "bs-epf-2026"],
    variants: [
      {
        id: "final-settlement",
        name: "Final PF settlement",
        formName: "Form 19 (composite claim)",
        summary: "Withdraw your full PF balance after leaving employment.",
        whoFor: "Members who have retired, or who have been out of EPF-covered employment for 12 continuous months.",
        conditions: [
          "12 continuous months without EPF-covered employment after your date of exit (unless retired). Previously 2 months.",
          "TDS may apply if your service is under 5 years and the amount is ₹50,000 or more. PAN reduces the rate.",
          "Your Aadhaar, UAN profile and bank account must be linked and match.",
        ],
        documents: [
          { docType: "aadhaar", need: "required", why: "To compare your name, date of birth and gender with your UAN profile and bank records." },
          { docType: "epf_passbook", need: "required", why: "Gives your dates of joining and exit and your balance, which decide eligibility and TDS." },
          { docType: "bank_passbook", need: "required", why: "To check the account number, IFSC and account holder name you will enter. Not uploaded to EPFO." },
          { docType: "pan", need: "conditional", why: "Needed to avoid higher TDS when service is under 5 years and the amount is ₹50,000 or more.", condition: "tds" },
          { docType: "cancelled_cheque", need: "recommended", why: "An extra source to cross-check the account number and IFSC." },
        ],
        ruleIds: [
          "GEN-DOCS", "GEN-QUALITY", "GEN-KEYFIELDS", "EPF-NAME", "GEN-DOB-CONSISTENCY", "EPF-FATHER", "GEN-AADHAAR-FORMAT",
          "GEN-PAN-FORMAT", "GEN-PAN-SURNAME", "GEN-ACCOUNT-CONSISTENCY", "GEN-IFSC-CONSISTENCY", "GEN-IFSC-FORMAT", "GEN-IFSC-REFERENCE",
          "EPF-DOE-PRESENT", "EPF-DATE-ORDER", "EPF-FINAL-WAIT", "EPF-TDS-PAN", "EPF-BANK-NOTE", "EPF-EXTERNAL",
        ],
        draftFields: [...EPF_COMMON],
      },
      {
        id: "pension-withdrawal",
        name: "Pension withdrawal benefit",
        formName: "Form 10C",
        summary: "Withdraw your pension (EPS) contribution when you have less than 10 years of service.",
        whoFor: "Members with under 10 years of eligible service who have left covered employment.",
        conditions: [
          "Eligible service must be less than 10 years. With 10 years or more, you get a pension or scheme certificate instead.",
          "Reported waiting period after exit: 36 months (previously 2 months), unless you have reached 58.",
          "Sources disagree on whether a 6-month minimum service still applies.",
        ],
        documents: [
          { docType: "aadhaar", need: "required", why: "To compare your name and date of birth with your UAN profile." },
          { docType: "epf_passbook", need: "required", why: "Gives your service dates, which decide whether you can withdraw the pension amount." },
          { docType: "bank_passbook", need: "required", why: "To check the bank details you will enter." },
          { docType: "cancelled_cheque", need: "recommended", why: "An extra source to cross-check the account number and IFSC." },
        ],
        ruleIds: [
          "GEN-DOCS", "GEN-QUALITY", "GEN-KEYFIELDS", "EPF-NAME", "GEN-DOB-CONSISTENCY", "GEN-AADHAAR-FORMAT", "GEN-ACCOUNT-CONSISTENCY",
          "GEN-IFSC-CONSISTENCY", "GEN-IFSC-FORMAT", "GEN-IFSC-REFERENCE", "EPF-DOE-PRESENT", "EPF-DATE-ORDER", "EPF-10C-SERVICE",
          "EPF-10C-MIN", "EPF-10C-WAIT", "EPF-BANK-NOTE", "EPF-EXTERNAL",
        ],
        draftFields: EPF_COMMON.filter((f) => f.key !== "pan_linked"),
      },
      {
        id: "partial-withdrawal",
        name: "Partial withdrawal (advance)",
        formName: "Form 31",
        summary: "Withdraw part of your PF for illness, education, marriage, housing or special circumstances.",
        whoFor: "Members (including current employees) with at least 12 months of membership.",
        conditions: [
          "Reported minimum membership: 12 months for all purposes (previously 5–7 years for some).",
          "At least 25% of your balance must stay in the account.",
          "Minimum withdrawal reported as ₹1,000. Limits on how often you can withdraw for each purpose.",
        ],
        documents: [
          { docType: "aadhaar", need: "required", why: "To compare your name and date of birth with your UAN profile." },
          { docType: "epf_passbook", need: "required", why: "Gives your membership period and balance, which decide eligibility and the maximum amount." },
          { docType: "bank_passbook", need: "required", why: "To check the bank details you will enter." },
          { docType: "cancelled_cheque", need: "recommended", why: "An extra source to cross-check the account number and IFSC." },
        ],
        ruleIds: [
          "GEN-DOCS", "GEN-QUALITY", "GEN-KEYFIELDS", "EPF-NAME", "GEN-DOB-CONSISTENCY", "GEN-AADHAAR-FORMAT", "GEN-ACCOUNT-CONSISTENCY",
          "GEN-IFSC-CONSISTENCY", "GEN-IFSC-FORMAT", "GEN-IFSC-REFERENCE", "EPF-31-MEMBERSHIP", "EPF-31-AMOUNT", "EPF-31-PURPOSE",
          "EPF-BANK-NOTE", "EPF-EXTERNAL",
        ],
        draftFields: [
          ...EPF_COMMON.filter((f) => f.key !== "doe" && f.key !== "pan_linked"),
          {
            key: "purpose",
            label: "Purpose of withdrawal",
            type: "select",
            options: [
              { value: "essential", label: "Essential needs — illness, education, marriage" },
              { value: "housing", label: "Housing — purchase, construction, repayment" },
              { value: "special", label: "Special circumstances" },
            ],
          },
          { key: "amount", label: "Amount you want to withdraw (₹)", type: "number" },
        ],
      },
    ],
  },
  {
    id: "nsp-csss",
    categoryId: "education",
    name: "Central Sector Scholarship (PM-USP CSSS)",
    shortName: "NSP · CSSS",
    authority: "Ministry of Education, via the National Scholarship Portal",
    description:
      "Merit-cum-means scholarship for college and university students who scored above the 80th percentile in Class XII. RejectLess checks your certificates and bank details before you apply on NSP.",
    audience: "Students in regular undergraduate or postgraduate courses",
    status: "available",
    officialPortal: "https://scholarships.gov.in/",
    rulePackVersion: "2026.11.1",
    lastReviewed: "2026-11-02",
    notices: [
      "Eligibility conditions are taken from reputable summaries; check the current scheme guidelines on NSP. Conditions marked \"Verify\" have not been confirmed against the official text.",
    ],
    sourceIds: ["nsp-portal", "education-ministry", "csss-summary"],
    variants: [
      {
        id: "fresh",
        name: "Fresh application",
        formName: "NSP application (fresh)",
        summary: "First-year application after Class XII.",
        whoFor: "Students starting a regular UG course who scored above the 80th percentile of their board in Class XII.",
        conditions: [
          "Above the 80th percentile of successful candidates in your board and stream in Class XII.",
          "Annual family income below ₹4.5 lakh.",
          "Enrolled in a regular course (not distance or correspondence).",
          "Not receiving any other scholarship.",
          "Bank account in your own name, linked to Aadhaar for direct benefit transfer.",
        ],
        documents: [
          { docType: "aadhaar", need: "required", why: "To compare your name and date of birth with your other records." },
          { docType: "marksheet_12", need: "required", why: "Your Class XII marks are the basis of eligibility." },
          { docType: "income_certificate", need: "required", why: "Shows your family income is below the limit." },
          { docType: "bonafide_certificate", need: "required", why: "Shows you are enrolled in a regular course." },
          { docType: "bank_passbook", need: "required", why: "To check that the account is in your own name and the details are correct." },
        ],
        ruleIds: [
          "GEN-DOCS", "GEN-QUALITY", "GEN-KEYFIELDS", "NSP-NAME", "GEN-DOB-CONSISTENCY", "NSP-FATHER", "GEN-AADHAAR-FORMAT",
          "NSP-OWN-ACCOUNT", "GEN-ACCOUNT-CONSISTENCY", "GEN-IFSC-CONSISTENCY", "GEN-IFSC-FORMAT", "GEN-IFSC-REFERENCE",
          "NSP-INCOME", "NSP-INCOME-MATCH", "NSP-INCOME-RECENT", "NSP-REGULAR", "NSP-MARKS", "NSP-OTHER-SCHOLARSHIP", "NSP-EXTERNAL",
        ],
        photoSpec: {
          label: "Passport-size photograph",
          width: 413,
          height: 531,
          maxKb: 50,
          note: "Portals accept a small JPG; limits change, so check the current instruction on NSP before uploading.",
        },
        // Mirrors the NSP form tab by tab, so the filled form can be built from these answers alone.
        draftFields: [
          { key: "scheme_category", label: "Scholarship category", type: "select", section: "Registration details", options: [{ value: "post_matric", label: "Post Matric" }, { value: "pre_matric", label: "Pre Matric" }, { value: "top_class", label: "Top Class / Merit" }] },
          { key: "name", label: "Student name as per Aadhaar", type: "text", maps: "name" },
          { key: "dob", label: "Date of birth", type: "date", maps: "dob" },
          { key: "gender", label: "Gender", type: "select", maps: "gender", options: [{ value: "Female", label: "Female" }, { value: "Male", label: "Male" }, { value: "Transgender", label: "Transgender" }] },
          { key: "mobile", label: "Mobile number linked to Aadhaar", type: "text", help: "The number that receives your OTP." },
          { key: "email", label: "Email ID", type: "text" },
          { key: "bank_name", label: "Bank name", type: "text", maps: "bank_name" },
          { key: "ifsc", label: "IFSC", type: "text", maps: "ifsc" },
          { key: "account_number", label: "Bank account number", type: "text", maps: "account_number", sensitive: true },
          { key: "institution", label: "Present institute (college)", type: "text", section: "Academic details", maps: "institution" },
          { key: "course", label: "Present course", type: "text", maps: "course" },
          { key: "course_year", label: "Present class / year", type: "text", maps: "course_year" },
          { key: "study_mode", label: "Mode of study", type: "select", maps: "study_mode", options: [{ value: "Regular", label: "Regular" }, { value: "Correspondence / Distance", label: "Correspondence / Distance" }] },
          { key: "academic_year", label: "Academic year (e.g. 2026-27)", type: "text", maps: "academic_year" },
          { key: "admission_date", label: "Date of admission", type: "date" },
          { key: "board", label: "Previous board / university", type: "text", maps: "board" },
          { key: "roll_number", label: "Previous roll number", type: "text", maps: "roll_number" },
          { key: "year_of_passing", label: "Previous passing year", type: "text", maps: "year_of_passing" },
          { key: "percentage", label: "Previous class % marks", type: "text", maps: "percentage" },
          { key: "hosteller", label: "Day scholar or hosteller?", type: "select", options: [{ value: "Day scholar", label: "Day scholar" }, { value: "Hosteller", label: "Hosteller" }] },
          { key: "fees", label: "Total fees paid this year (₹)", type: "number" },
          { key: "father_name", label: "Father's / guardian's name", type: "text", section: "Basic details", maps: "father_name" },
          { key: "mother_name", label: "Mother's name", type: "text" },
          { key: "religion", label: "Religion", type: "select", options: ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Parsi", "Other"].map((v) => ({ value: v, label: v })) },
          { key: "community", label: "Community / category", type: "select", options: ["General", "SC", "ST", "OBC", "EWS"].map((v) => ({ value: v, label: v })) },
          { key: "annual_income", label: "Annual family income (₹)", type: "number", maps: "annual_income" },
          { key: "disability", label: "Person with disability?", type: "select", options: [{ value: "No", label: "No" }, { value: "Yes", label: "Yes" }] },
          { key: "marital", label: "Marital status", type: "select", options: [{ value: "Unmarried", label: "Unmarried" }, { value: "Married", label: "Married" }] },
          { key: "other_scholarship", label: "Are you receiving any other scholarship?", type: "select", options: yesNo },
          { key: "address", label: "Address", type: "text", section: "Contact details" },
          { key: "district", label: "District", type: "text" },
          { key: "block", label: "Block / taluk", type: "text" },
          { key: "pincode", label: "PIN code", type: "text" },
        ],
      },
    ],
  },
  {
    id: "pm-kisan",
    categoryId: "farmer",
    name: "PM-KISAN registration",
    shortName: "PM-KISAN",
    authority: "Department of Agriculture & Farmers Welfare, Ministry of Agriculture & Farmers Welfare",
    description:
      "₹6,000 a year in three instalments to landholding farmer families, paid by direct transfer to an Aadhaar-seeded bank account. RejectLess checks your Aadhaar, bank and land-record details and the exclusion list before you register on the PM-KISAN portal or at a CSC.",
    audience: "Landholding farmer families (husband, wife and minor children count as one family)",
    status: "available",
    officialPortal: "https://pmkisan.gov.in/",
    rulePackVersion: "2026.11.1",
    lastReviewed: "2026-11-02",
    notices: [
      "Eligibility and exclusions are taken from the Revised Operational Guidelines (21 June 2019) on pmkisan.gov.in. e-KYC became mandatory later and is checked only as an external item.",
      "Your state verifies the land record; RejectLess only checks that the record is present and the names match.",
    ],
    sourceIds: ["pmkisan-portal", "pmkisan-guidelines"],
    variants: [
      {
        id: "registration",
        name: "New farmer registration",
        formName: "PM-KISAN new farmer registration",
        summary: "Register as a beneficiary for the ₹6,000-a-year income support.",
        whoFor: "Farmer families holding cultivable land in their name, not covered by the exclusion list.",
        conditions: [
          "Land must be in the name of a family member as per the state's land records.",
          "Not excluded: institutional landholders; constitutional-post holders; serving/retired government employees (except Group D / MTS); pensioners drawing ₹10,000+/month; income-tax payers; professionals such as doctors, engineers, lawyers, CAs and architects.",
          "Bank account must be Aadhaar-seeded and e-KYC completed.",
        ],
        documents: [
          { docType: "aadhaar", need: "required", why: "Your Aadhaar name must match the bank and land record; Aadhaar is the beneficiary identifier." },
          { docType: "bank_passbook", need: "required", why: "To check the account is in your name and the account number and IFSC you will enter are right." },
          { docType: "land_record", need: "required", why: "Shows you hold cultivable land — the basic eligibility — and gives the khata / survey numbers the form asks for." },
        ],
        ruleIds: [
          "GEN-DOCS", "GEN-QUALITY", "GEN-KEYFIELDS", "PMK-NAME", "PMK-OWN-ACCOUNT", "GEN-DOB-CONSISTENCY", "GEN-AADHAAR-FORMAT",
          "GEN-ACCOUNT-CONSISTENCY", "GEN-IFSC-CONSISTENCY", "GEN-IFSC-FORMAT", "GEN-IFSC-REFERENCE", "PMK-LAND", "PMK-EXCLUSIONS", "PMK-EXTERNAL",
        ],
        draftFields: [
          { key: "name", label: "Your name as you will enter it", type: "text", maps: "name", help: "Exactly as in Aadhaar." },
          { key: "father_name", label: "Father's / husband's name", type: "text", maps: "father_name" },
          { key: "dob", label: "Date of birth", type: "date", maps: "dob" },
          { key: "account_number", label: "Bank account number", type: "text", maps: "account_number", sensitive: true },
          { key: "ifsc", label: "IFSC", type: "text", maps: "ifsc" },
          { key: "khata_number", label: "Khata / account number from the land record", type: "text", maps: "khata_number" },
          { key: "excl_income_tax", label: "Did anyone in your family (you, spouse, minor children) pay income tax last year?", type: "select", options: yesNo },
          { key: "excl_govt", label: "Is anyone in the family a serving or retired government employee (other than Group D / MTS)?", type: "select", options: yesNo },
          { key: "excl_pension", label: "Does anyone in the family get a pension of ₹10,000 or more a month (other than Group D / MTS)?", type: "select", options: yesNo },
          { key: "excl_professional", label: "Is anyone in the family a practising doctor, engineer, lawyer, CA or architect?", type: "select", options: yesNo },
          { key: "excl_constitutional", label: "Has anyone in the family held a constitutional post, or been an MP, MLA, minister or mayor?", type: "select", options: yesNo },
          { key: "excl_institutional", label: "Is the land held by an institution or trust rather than your family?", type: "select", options: yesNo },
        ],
      },
    ],
  },
  {
    id: "income-tax-return",
    categoryId: "tax",
    name: "Income tax return (ITR-1 Sahaj)",
    shortName: "Income Tax",
    authority: "Income Tax Department, Central Board of Direct Taxes, Ministry of Finance",
    description:
      "The yearly return for resident individuals with salary or pension, one or two house properties and other income up to ₹50 lakh. RejectLess checks your PAN, Aadhaar, Form 16 and bank details, whether ITR-1 is the right form, and the deadline — before you file on the e-Filing portal.",
    audience: "Salaried and pensioner individuals filing ITR-1",
    status: "available",
    officialPortal: "https://www.incometax.gov.in/iec/foportal/",
    rulePackVersion: "2026.11.1",
    lastReviewed: "2026-11-02",
    notices: [
      "ITR-1 conditions are from the e-Filing portal. Due dates for AY 2026-27 come from secondary summaries because the CBDT circulars could not be retrieved — confirm on the portal.",
      "RejectLess does not compute your tax. It checks identity, form choice and deadlines only.",
    ],
    sourceIds: ["itr-portal", "incometax-portal", "itr-due-dates-2026"],
    variants: [
      {
        id: "itr1",
        name: "ITR-1 (Sahaj) for salaried individuals",
        formName: "ITR-1 Sahaj, AY 2026-27",
        summary: "File your return for income earned in FY 2025-26.",
        whoFor: "Resident individuals with total income up to ₹50 lakh from salary/pension, up to two house properties and other sources.",
        conditions: [
          "Resident individual (ordinarily resident).",
          "Total income up to ₹50 lakh; agricultural income up to ₹5,000; listed-equity LTCG (s. 112A) up to ₹1.25 lakh.",
          "No business/professional income, foreign assets, or more than two house properties.",
          "PAN linked to Aadhaar; bank account pre-validated for refunds.",
        ],
        documents: [
          { docType: "pan", need: "required", why: "Your PAN is the filing identity; its name and date of birth are compared with Aadhaar and Form 16." },
          { docType: "aadhaar", need: "required", why: "PAN must be linked to Aadhaar; Aadhaar OTP is the simplest way to e-verify." },
          { docType: "form16", need: "required", why: "Gives the PAN your employer reported, your salary and the TDS you will claim." },
          { docType: "bank_passbook", need: "required", why: "The refund account must be in your name and pre-validated; we check the number and IFSC you will enter." },
        ],
        ruleIds: [
          "GEN-DOCS", "GEN-QUALITY", "GEN-KEYFIELDS", "GEN-PAN-FORMAT", "GEN-PAN-SURNAME", "GEN-AADHAAR-FORMAT", "ITR-NAME", "GEN-DOB-CONSISTENCY",
          "ITR-FORM16-PAN", "GEN-ACCOUNT-CONSISTENCY", "GEN-IFSC-CONSISTENCY", "GEN-IFSC-FORMAT", "GEN-IFSC-REFERENCE", "ITR-PAN-LINK", "ITR-FORM", "ITR-DUE", "ITR-EXTERNAL",
        ],
        draftFields: [
          { key: "name", label: "Your name as on PAN", type: "text", maps: "name" },
          { key: "dob", label: "Date of birth", type: "date", maps: "dob" },
          { key: "pan", label: "PAN you will file with", type: "text", maps: "pan_number", sensitive: true },
          { key: "account_number", label: "Bank account number for refund", type: "text", maps: "account_number", sensitive: true },
          { key: "ifsc", label: "IFSC", type: "text", maps: "ifsc" },
          { key: "pan_aadhaar_linked", label: "Is your PAN linked to Aadhaar?", type: "select", options: [...yesNo, { value: "unsure", label: "Not sure" }] },
          { key: "resident", label: "Were you in India for most of the year (resident)?", type: "select", options: yesNo },
          { key: "total_income", label: "Approximate total income for the year (₹)", type: "number" },
          {
            key: "income_sources",
            label: "Where does your income come from?",
            type: "select",
            options: [
              { value: "salary", label: "Salary / pension, up to two house properties, bank interest" },
              { value: "business", label: "Business or profession (freelance, shop, consulting)" },
              { value: "capital_gains", label: "Capital gains (property sale, shares beyond small listed-equity gains)" },
              { value: "many_houses", label: "More than two house properties" },
              { value: "foreign", label: "Foreign income or assets" },
            ],
          },
          { key: "agri_income", label: "Agricultural income, if any (₹)", type: "number" },
          { key: "ltcg_112a", label: "Long-term gains on listed shares / equity funds, if any (₹)", type: "number" },
        ],
      },
    ],
  },
  {
    id: "income-certificate",
    categoryId: "certificates",
    name: "Income certificate application",
    shortName: "Income certificate",
    authority: "State revenue departments",
    description: "State-issued income certificates. Requirements differ by state.",
    audience: "Residents applying through e-district portals",
    status: "coming_soon",
    rulePackVersion: "—",
    lastReviewed: "—",
    notices: [],
    sourceIds: [],
    variants: [],
  },
  {
    id: "old-age-pension",
    categoryId: "other",
    name: "Old-age pension (NSAP)",
    shortName: "NSAP",
    authority: "Ministry of Rural Development",
    description: "Social assistance pensions for elderly citizens.",
    audience: "Senior citizens",
    status: "coming_soon",
    rulePackVersion: "—",
    lastReviewed: "—",
    notices: [],
    sourceIds: [],
    variants: [],
  },
];

export function getApplication(id: string) {
  return APPLICATIONS.find((a) => a.id === id);
}

export function getVariant(appId: string, variantId: string) {
  return getApplication(appId)?.variants.find((v) => v.id === variantId);
}
