// Scheme catalogue: what a citizen can browse under each ministry / state department.
// Only schemes with `appId` are checkable; the rest are listed so people can find the
// right office and portal, and are clearly marked "coming soon".
//
// `basis` says how well each entry is researched:
//   official  — name, ministry and portal checked on the official site on VERIFIED_ON
//   secondary — commonly reported; official page not checked by RejectLess yet
// Per-state schemes are the well-known flagship schemes as reported; all are `secondary`.

import { STATE_DEPARTMENT_TEMPLATE, VERIFIED_ON } from "./ministries";
import { STATES } from "./onboarding";

export interface Scheme {
  id: string;
  name: string;
  nameHi?: string;
  ministryId: string;
  level: "central" | "state";
  /** Set for every state scheme; undefined for central ones. */
  stateCode?: string;
  summary: string;
  portal?: { label: string; url: string };
  /** Documents an applicant is usually asked for (plain words; not a RejectLess promise). */
  docs: string[];
  /** Links to a working application. */
  appId?: string;
  variantId?: string;
  /** Goal ids (onboarding) that this scheme offers — e.g. EPFO has three claim types. */
  goalIds?: string[];
  basis: "official" | "secondary";
}

const S = (s: Omit<Scheme, "level" | "basis"> & { basis?: Scheme["basis"] }): Scheme => ({ level: "central", basis: "secondary", ...s });

export const CENTRAL_SCHEMES: Scheme[] = [
  // --- Agriculture
  S({ id: "pm-kisan", name: "PM-KISAN Samman Nidhi", nameHi: "पीएम-किसान सम्मान निधि", ministryId: "agri", summary: "₹6,000 a year in three instalments to landholding farmer families.", portal: { label: "pmkisan.gov.in", url: "https://pmkisan.gov.in/" }, docs: ["Aadhaar", "Bank passbook (Aadhaar-seeded account)", "Land record (khatauni / RoR)", "Mobile number"], appId: "pm-kisan", variantId: "registration", goalIds: ["pm-kisan"], basis: "official" }),
  S({ id: "pmfby", name: "PM Fasal Bima Yojana (crop insurance)", nameHi: "प्रधानमंत्री फसल बीमा योजना", ministryId: "agri", summary: "Crop insurance against natural calamities, pests and diseases.", portal: { label: "pmfby.gov.in", url: "https://pmfby.gov.in/" }, docs: ["Aadhaar", "Bank passbook", "Land record", "Sowing certificate"] }),
  S({ id: "kcc", name: "Kisan Credit Card", nameHi: "किसान क्रेडिट कार्ड", ministryId: "agri", summary: "Short-term credit for farming at a subsidised rate, through banks.", docs: ["Aadhaar", "PAN or Form 60", "Land record", "Passport photo"] }),
  S({ id: "pm-kmy", name: "PM Kisan Maandhan Yojana (farmer pension)", nameHi: "प्रधानमंत्री किसान मानधन योजना", ministryId: "agri", summary: "₹3,000 monthly pension after 60 for small and marginal farmers who contribute.", portal: { label: "maandhan.in", url: "https://maandhan.in/" }, docs: ["Aadhaar", "Bank passbook", "Land record"] }),
  S({ id: "soil-health", name: "Soil Health Card", nameHi: "मृदा स्वास्थ्य कार्ड", ministryId: "agri", summary: "Free soil testing and nutrient advice for your field.", portal: { label: "soilhealth.dac.gov.in", url: "https://soilhealth.dac.gov.in/" }, docs: ["Aadhaar", "Land details"] }),
  // --- Education
  S({ id: "nsp-csss", name: "Central Sector Scholarship for College & University Students (PM-USP CSSS)", nameHi: "केंद्रीय क्षेत्र छात्रवृत्ति योजना", ministryId: "edu", summary: "Merit-cum-means scholarship for students above the 80th percentile in Class XII with family income up to ₹4.5 lakh.", portal: { label: "scholarships.gov.in", url: "https://scholarships.gov.in/" }, docs: ["Aadhaar", "Class XII marksheet", "Income certificate", "Bonafide certificate", "Bank passbook (own account)"], appId: "nsp-csss", variantId: "fresh", goalIds: ["nsp-csss"], basis: "official" }),
  S({ id: "nmmss", name: "National Means-cum-Merit Scholarship (Class IX–XII)", nameHi: "राष्ट्रीय आय-एवं-योग्यता छात्रवृत्ति", ministryId: "edu", summary: "₹12,000 a year for economically weaker students from Class IX to XII who clear the state exam.", portal: { label: "scholarships.gov.in", url: "https://scholarships.gov.in/" }, docs: ["Aadhaar", "Income certificate", "Marksheet", "Bank passbook"] }),
  S({ id: "pm-vidyalakshmi", name: "PM Vidyalakshmi (education loan)", nameHi: "पीएम विद्यालक्ष्मी", ministryId: "edu", summary: "Collateral-free education loans with interest subvention for quality institutions.", portal: { label: "vidyalakshmi.co.in", url: "https://www.vidyalakshmi.co.in/" }, docs: ["Aadhaar", "PAN", "Admission letter", "Income proof"] }),
  // --- Finance
  S({ id: "itr", name: "Income Tax Return (ITR-1 Sahaj for salaried)", nameHi: "आयकर रिटर्न", ministryId: "fin", summary: "Yearly return of income for resident individuals with salary, one or two house properties and other income up to ₹50 lakh.", portal: { label: "incometax.gov.in", url: "https://www.incometax.gov.in/iec/foportal/" }, docs: ["PAN (linked to Aadhaar)", "Aadhaar", "Form 16", "Bank passbook (pre-validated account)", "Interest certificates"], appId: "income-tax-return", variantId: "itr1", goalIds: ["itr-1"], basis: "official" }),
  S({ id: "pmjdy", name: "PM Jan Dhan Yojana (bank account)", nameHi: "प्रधानमंत्री जन धन योजना", ministryId: "fin", summary: "Zero-balance bank account with RuPay card and accident cover.", portal: { label: "pmjdy.gov.in", url: "https://pmjdy.gov.in/" }, docs: ["Aadhaar", "Passport photo"] }),
  S({ id: "apy", name: "Atal Pension Yojana", nameHi: "अटल पेंशन योजना", ministryId: "fin", summary: "Guaranteed ₹1,000–5,000 monthly pension after 60 for contributors aged 18–40.", docs: ["Aadhaar", "Bank account", "Mobile number"] }),
  S({ id: "pmjjby", name: "PM Jeevan Jyoti Bima Yojana", nameHi: "प्रधानमंत्री जीवन ज्योति बीमा योजना", ministryId: "fin", summary: "₹2 lakh life cover for ₹436 a year, through your bank.", docs: ["Aadhaar", "Bank account"] }),
  S({ id: "pmsby", name: "PM Suraksha Bima Yojana", nameHi: "प्रधानमंत्री सुरक्षा बीमा योजना", ministryId: "fin", summary: "₹2 lakh accident cover for ₹20 a year, through your bank.", docs: ["Aadhaar", "Bank account"] }),
  S({ id: "ssy", name: "Sukanya Samriddhi Yojana", nameHi: "सुकन्या समृद्धि योजना", ministryId: "fin", summary: "Savings account for a girl child under 10, with tax benefits.", docs: ["Girl's birth certificate", "Parent's Aadhaar and PAN"] }),
  S({ id: "mudra", name: "PM MUDRA loan", nameHi: "प्रधानमंत्री मुद्रा योजना", ministryId: "fin", summary: "Loans up to ₹20 lakh for small businesses, through banks.", portal: { label: "mudra.org.in", url: "https://www.mudra.org.in/" }, docs: ["Aadhaar", "PAN", "Business proof", "Bank statement"] }),
  // --- Labour
  S({ id: "epfo", name: "EPF withdrawal & pension (EPFO claims)", nameHi: "ईपीएफ निकासी एवं पेंशन", ministryId: "labour", summary: "Withdraw your provident fund (Form 19 / 31) or pension contribution (Form 10C) online with your UAN.", portal: { label: "EPFO Member e-Sewa", url: "https://unifiedportal-mem.epfindia.gov.in/memberinterface/" }, docs: ["UAN with Aadhaar, PAN and bank KYC", "Aadhaar", "EPF passbook", "Bank passbook"], appId: "epfo-withdrawal", variantId: "final-settlement", goalIds: ["epf-final", "epf-partial", "epf-pension"], basis: "official" }),
  S({ id: "eshram", name: "e-Shram registration (unorganised workers)", nameHi: "ई-श्रम पंजीकरण", ministryId: "labour", summary: "National database card for unorganised workers; needed for several welfare schemes.", portal: { label: "eshram.gov.in", url: "https://eshram.gov.in/" }, docs: ["Aadhaar", "Bank account", "Mobile linked to Aadhaar"] }),
  S({ id: "pm-sym", name: "PM Shram Yogi Maandhan (worker pension)", nameHi: "प्रधानमंत्री श्रम योगी मानधन", ministryId: "labour", summary: "₹3,000 monthly pension after 60 for unorganised workers earning up to ₹15,000.", portal: { label: "maandhan.in", url: "https://maandhan.in/" }, docs: ["Aadhaar", "Bank passbook"] }),
  S({ id: "esic", name: "ESIC medical benefits", nameHi: "ईएसआईसी", ministryId: "labour", summary: "Medical and cash benefits for insured employees earning up to ₹21,000.", portal: { label: "esic.gov.in", url: "https://www.esic.gov.in/" }, docs: ["ESIC Pehchan card", "Aadhaar"] }),
  // --- Health
  S({ id: "pmjay", name: "Ayushman Bharat PM-JAY health card", nameHi: "आयुष्मान भारत", ministryId: "health", summary: "₹5 lakh a year of cashless hospital cover for eligible families (and all citizens 70+).", portal: { label: "beneficiary.nha.gov.in", url: "https://beneficiary.nha.gov.in/" }, docs: ["Aadhaar", "Ration card / family ID"] }),
  // --- Rural development
  S({ id: "mgnrega", name: "MGNREGA job card", nameHi: "मनरेगा जॉब कार्ड", ministryId: "rural", summary: "100 days of guaranteed wage work a year for rural households.", docs: ["Aadhaar", "Passport photo", "Bank / post office account"] }),
  S({ id: "pmay-g", name: "PM Awas Yojana – Gramin", nameHi: "प्रधानमंत्री आवास योजना – ग्रामीण", ministryId: "rural", summary: "Assistance to build a pucca house for eligible rural households.", portal: { label: "pmayg.nic.in", url: "https://pmayg.nic.in/" }, docs: ["Aadhaar", "Bank passbook", "MGNREGA job card"] }),
  S({ id: "nsap", name: "Old-age / widow / disability pension (NSAP)", nameHi: "वृद्धावस्था / विधवा / दिव्यांग पेंशन", ministryId: "rural", summary: "Monthly central pension for BPL elderly, widows and persons with disability, topped up by states.", portal: { label: "nsap.nic.in", url: "https://nsap.nic.in/" }, docs: ["Aadhaar", "Age proof", "BPL / income proof", "Bank passbook"] }),
  // --- Housing & urban
  S({ id: "pmay-u", name: "PM Awas Yojana – Urban 2.0", nameHi: "प्रधानमंत्री आवास योजना – शहरी", ministryId: "housing", summary: "Housing assistance and interest subsidy for urban EWS/LIG/MIG families.", portal: { label: "pmay-urban.gov.in", url: "https://pmay-urban.gov.in/" }, docs: ["Aadhaar", "Income proof", "Bank passbook"] }),
  S({ id: "svanidhi", name: "PM SVANidhi (street-vendor loan)", nameHi: "पीएम स्वनिधि", ministryId: "housing", summary: "Collateral-free working-capital loans for street vendors.", portal: { label: "pmsvanidhi.mohua.gov.in", url: "https://pmsvanidhi.mohua.gov.in/" }, docs: ["Aadhaar", "Vending certificate / letter of recommendation", "Bank account"] }),
  // --- Social justice, minorities, tribal
  S({ id: "pms-sc", name: "Post-Matric Scholarship for SC students", nameHi: "अनुसूचित जाति मैट्रिकोत्तर छात्रवृत्ति", ministryId: "sje", summary: "For SC students studying after Class X, with family income up to ₹2.5 lakh.", portal: { label: "scholarships.gov.in", url: "https://scholarships.gov.in/" }, docs: ["Aadhaar", "Caste certificate", "Income certificate", "Marksheet", "Bank passbook"] }),
  S({ id: "yasasvi", name: "PM-YASASVI (OBC / EBC / DNT scholarship)", nameHi: "पीएम-यशस्वी", ministryId: "sje", summary: "Top-class and post-matric scholarships for OBC, EBC and DNT students.", portal: { label: "scholarships.gov.in", url: "https://scholarships.gov.in/" }, docs: ["Aadhaar", "Caste certificate", "Income certificate", "Marksheet"] }),
  S({ id: "udid", name: "Unique Disability ID (UDID) card", nameHi: "विशिष्ट दिव्यांगता पहचान पत्र", ministryId: "sje", summary: "National disability certificate and card.", portal: { label: "swavlambancard.gov.in", url: "https://www.swavlambancard.gov.in/" }, docs: ["Aadhaar", "Medical certificate", "Passport photo"] }),
  S({ id: "pms-minority", name: "Post-Matric Scholarship for Minorities", nameHi: "अल्पसंख्यक मैट्रिकोत्तर छात्रवृत्ति", ministryId: "minority", summary: "For students from notified minority communities after Class X.", portal: { label: "scholarships.gov.in", url: "https://scholarships.gov.in/" }, docs: ["Aadhaar", "Community declaration", "Income certificate", "Marksheet"] }),
  S({ id: "pms-st", name: "Post-Matric Scholarship for ST students", nameHi: "अनुसूचित जनजाति मैट्रिकोत्तर छात्रवृत्ति", ministryId: "tribal", summary: "For ST students studying after Class X, with family income up to ₹2.5 lakh.", portal: { label: "scholarships.gov.in", url: "https://scholarships.gov.in/" }, docs: ["Aadhaar", "Tribe certificate", "Income certificate", "Marksheet", "Bank passbook"] }),
  // --- Women & child
  S({ id: "pmmvy", name: "PM Matru Vandana Yojana (maternity benefit)", nameHi: "प्रधानमंत्री मातृ वंदना योजना", ministryId: "wcd", summary: "₹5,000 for the first child (₹6,000 for a second girl child) to pregnant and lactating mothers.", portal: { label: "pmmvy.wcd.gov.in", url: "https://pmmvy.wcd.gov.in/" }, docs: ["Aadhaar", "Bank passbook", "MCP card", "Husband's Aadhaar"] }),
  // --- Skills, MSME, energy, petroleum, external affairs, MeitY, roads
  S({ id: "pmkvy", name: "PM Kaushal Vikas Yojana (skill training)", nameHi: "प्रधानमंत्री कौशल विकास योजना", ministryId: "skill", summary: "Free short-term skill courses with certification.", portal: { label: "skillindiadigital.gov.in", url: "https://www.skillindiadigital.gov.in/" }, docs: ["Aadhaar", "Bank account"] }),
  S({ id: "udyam", name: "Udyam registration (MSME)", nameHi: "उद्यम पंजीकरण", ministryId: "msme", summary: "Free online registration of a micro, small or medium enterprise.", portal: { label: "udyamregistration.gov.in", url: "https://udyamregistration.gov.in/" }, docs: ["Aadhaar", "PAN", "GSTIN (if applicable)"] }),
  S({ id: "vishwakarma", name: "PM Vishwakarma (artisans)", nameHi: "पीएम विश्वकर्मा", ministryId: "msme", summary: "Toolkit incentive, training and loans for traditional artisans.", portal: { label: "pmvishwakarma.gov.in", url: "https://pmvishwakarma.gov.in/" }, docs: ["Aadhaar", "Bank passbook", "Ration card"] }),
  S({ id: "surya-ghar", name: "PM Surya Ghar (rooftop solar)", nameHi: "पीएम सूर्य घर मुफ़्त बिजली योजना", ministryId: "mnre", summary: "Subsidy for rooftop solar and up to 300 units of free electricity.", portal: { label: "pmsuryaghar.gov.in", url: "https://pmsuryaghar.gov.in/" }, docs: ["Aadhaar", "Electricity bill", "Bank passbook"] }),
  S({ id: "ujjwala", name: "PM Ujjwala Yojana (LPG connection)", nameHi: "प्रधानमंत्री उज्ज्वला योजना", ministryId: "petro", summary: "Free LPG connection for women from poor households.", portal: { label: "pmuy.gov.in", url: "https://www.pmuy.gov.in/" }, docs: ["Aadhaar", "Ration card", "Bank passbook"] }),
  S({ id: "passport", name: "Passport", nameHi: "पासपोर्ट", ministryId: "mea", summary: "Apply or renew through Passport Seva.", portal: { label: "passportindia.gov.in", url: "https://www.passportindia.gov.in/" }, docs: ["Proof of address", "Proof of date of birth", "Aadhaar"] }),
  S({ id: "aadhaar-update", name: "Aadhaar update (name, address, mobile)", nameHi: "आधार अपडेट", ministryId: "meity", summary: "Correct your Aadhaar details online or at an enrolment centre.", portal: { label: "myaadhaar.uidai.gov.in", url: "https://myaadhaar.uidai.gov.in/" }, docs: ["Proof of identity / address as per UIDAI list"] }),
  S({ id: "driving-licence", name: "Driving licence", nameHi: "ड्राइविंग लाइसेंस", ministryId: "roads", summary: "Learner's and permanent licence through Parivahan Sarathi.", portal: { label: "parivahan.gov.in", url: "https://sarathi.parivahan.gov.in/" }, docs: ["Aadhaar", "Age proof", "Address proof", "Passport photo"] }),
];

// ---------------------------------------------------------------------------- state schemes

/** Certificate and welfare services every state offers through its revenue / welfare departments. */
const STATE_TEMPLATE: { dept: string; id: string; name: string; nameHi: string; summary: string; docs: string[] }[] = [
  { dept: "revenue", id: "income-cert", name: "Income certificate", nameHi: "आय प्रमाण पत्र", summary: "Proof of family income for scholarships, fee waivers and welfare schemes.", docs: ["Aadhaar", "Self-declaration of income", "Ration card / address proof", "Salary slip or Form 16 if salaried"] },
  { dept: "revenue", id: "caste-cert", name: "Caste certificate (SC / ST / OBC)", nameHi: "जाति प्रमाण पत्र", summary: "Proof of caste category for reservations and scholarships.", docs: ["Aadhaar", "Father's caste certificate or family records", "Address proof"] },
  { dept: "revenue", id: "domicile-cert", name: "Domicile / residence certificate", nameHi: "निवास प्रमाण पत्र", summary: "Proof that you are a resident of the state.", docs: ["Aadhaar", "Address proof", "Ration card / school certificate"] },
  { dept: "revenue", id: "ews-cert", name: "EWS certificate", nameHi: "ईडब्ल्यूएस प्रमाण पत्र", summary: "For general-category families with income under ₹8 lakh, for the 10% EWS quota.", docs: ["Aadhaar", "Income proof", "Land / property details"] },
  { dept: "social", id: "old-age-pension", name: "Old-age pension (state)", nameHi: "वृद्धावस्था पेंशन", summary: "Monthly pension for senior citizens below the income limit (state top-up on NSAP).", docs: ["Aadhaar", "Age proof", "Income / BPL proof", "Bank passbook"] },
  { dept: "social", id: "widow-pension", name: "Widow pension", nameHi: "विधवा पेंशन", summary: "Monthly pension for widows below the income limit.", docs: ["Aadhaar", "Husband's death certificate", "Income proof", "Bank passbook"] },
  { dept: "social", id: "disability-pension", name: "Disability pension", nameHi: "दिव्यांग पेंशन", summary: "Monthly pension for persons with 40%+ disability.", docs: ["Aadhaar", "UDID / disability certificate", "Income proof", "Bank passbook"] },
  { dept: "education", id: "state-scholarship", name: "State post-matric / merit scholarships", nameHi: "राज्य छात्रवृत्ति", summary: "Scholarships run by the state education and welfare departments (often on the state scholarship portal).", docs: ["Aadhaar", "Marksheet", "Income certificate", "Caste certificate (if applicable)", "Bank passbook"] },
  { dept: "foodsupply", id: "ration-card", name: "Ration card (NFSA)", nameHi: "राशन कार्ड", summary: "Subsidised food grains for eligible households.", docs: ["Aadhaar of all family members", "Address proof", "Income / category proof"] },
  { dept: "labour", id: "bocw", name: "Construction-worker welfare board registration", nameHi: "भवन निर्माण श्रमिक पंजीकरण", summary: "Registration that unlocks state benefits for building and construction workers.", docs: ["Aadhaar", "90-day work certificate", "Bank passbook", "Passport photo"] },
  { dept: "health", id: "birth-cert", name: "Birth certificate", nameHi: "जन्म प्रमाण पत्र", summary: "Issued by the municipal body or panchayat; now also on the national CRS portal.", docs: ["Hospital discharge / birth report", "Parents' Aadhaar"] },
  { dept: "home", id: "police-verification", name: "Police verification / character certificate", nameHi: "पुलिस सत्यापन", summary: "Needed for jobs, tenancy and some licences.", docs: ["Aadhaar", "Address proof", "Passport photo"] },
];

/** Flagship state schemes as commonly reported (not verified against each state's official page). */
const STATE_FLAGSHIPS: Record<string, { dept: string; id: string; name: string; nameHi?: string; summary: string }[]> = {
  UP: [{ dept: "wcd", id: "kanya-sumangala", name: "Mukhyamantri Kanya Sumangala Yojana", nameHi: "मुख्यमंत्री कन्या सुमंगला योजना", summary: "Staged payments for a girl child from birth to graduation." }],
  BR: [{ dept: "education", id: "kanya-utthan", name: "Mukhyamantri Kanya Utthan Yojana", nameHi: "मुख्यमंत्री कन्या उत्थान योजना", summary: "Support for girls from birth through graduation." }],
  MP: [{ dept: "wcd", id: "ladli-behna", name: "Ladli Behna Yojana", nameHi: "लाड़ली बहना योजना", summary: "Monthly support for eligible women." }, { dept: "wcd", id: "ladli-laxmi", name: "Ladli Laxmi Yojana", nameHi: "लाड़ली लक्ष्मी योजना", summary: "Savings and education support for girl children." }],
  MH: [{ dept: "wcd", id: "ladki-bahin", name: "Mukhyamantri Majhi Ladki Bahin Yojana", summary: "Monthly support for eligible women." }],
  RJ: [{ dept: "social", id: "palanhar", name: "Palanhar Yojana", summary: "Support for orphaned and vulnerable children living with guardians." }],
  DL: [{ dept: "wcd", id: "delhi-ladli", name: "Delhi Ladli Scheme", summary: "Staged deposits for girl children born in Delhi." }],
  WB: [{ dept: "wcd", id: "kanyashree", name: "Kanyashree Prakalpa", summary: "Support for girls aged 13–18 who stay in education." }, { dept: "wcd", id: "lakshmir-bhandar", name: "Lakshmir Bhandar", summary: "Monthly support for women heads of households." }, { dept: "health", id: "swasthya-sathi", name: "Swasthya Sathi", summary: "State health cover for families." }],
  TN: [{ dept: "education", id: "pudhumai-penn", name: "Pudhumai Penn (Moovalur Ramamirtham)", summary: "Monthly support for girls from government schools in higher education." }],
  KA: [{ dept: "wcd", id: "gruha-lakshmi", name: "Gruha Lakshmi", summary: "Monthly support for women heads of households." }],
  TS: [{ dept: "agriculture", id: "rythu-bharosa", name: "Rythu Bharosa", summary: "Per-acre investment support for farmers." }],
  AP: [{ dept: "agriculture", id: "annadata-sukhibhava", name: "Annadata Sukhibhava", summary: "Yearly support for farmer families, alongside PM-KISAN." }],
  OD: [{ dept: "wcd", id: "subhadra", name: "Subhadra Yojana", summary: "Yearly support for eligible women." }],
  GJ: [{ dept: "wcd", id: "vahli-dikri", name: "Vahli Dikri Yojana", summary: "Staged support for girl children." }],
  PB: [{ dept: "social", id: "ashirwad", name: "Ashirwad Scheme", summary: "Marriage assistance for daughters of SC / BC / EWS families." }],
  HR: [{ dept: "revenue", id: "ppp", name: "Parivar Pehchan Patra (family ID)", summary: "Family ID required for most Haryana services." }],
  JH: [{ dept: "wcd", id: "maiya-samman", name: "Mukhyamantri Maiya Samman Yojana", summary: "Monthly support for eligible women." }],
  CG: [{ dept: "wcd", id: "mahtari-vandan", name: "Mahtari Vandan Yojana", summary: "Monthly support for married women." }],
  AS: [{ dept: "social", id: "orunodoi", name: "Orunodoi", summary: "Monthly support for poor households, paid to women." }],
  KL: [{ dept: "health", id: "karunya", name: "Karunya Arogya Suraksha Padhathi", summary: "State health cover, integrated with PM-JAY." }],
  UK: [{ dept: "wcd", id: "nanda-gaura", name: "Nanda Gaura Yojana", summary: "Support at birth and after Class XII for girls." }],
};

export const STATE_SCHEMES: Scheme[] = STATES.flatMap((st) =>
  [
    ...STATE_TEMPLATE.map<Scheme>((t) => ({
      id: `${st.code}:${t.id}`,
      name: t.name,
      nameHi: t.nameHi,
      ministryId: `${st.code}:${t.dept}`,
      level: "state",
      stateCode: st.code,
      summary: t.summary,
      docs: t.docs,
      basis: "secondary",
      // Income certificate is on the roadmap; the others are listed for navigation only.
    })),
    ...(STATE_FLAGSHIPS[st.code] ?? []).map<Scheme>((f) => ({
      id: `${st.code}:${f.id}`,
      name: f.name,
      nameHi: f.nameHi,
      ministryId: `${st.code}:${f.dept}`,
      level: "state",
      stateCode: st.code,
      summary: f.summary,
      docs: ["Aadhaar", "Bank passbook", "Income / category proof (as per the state's rules)"],
      basis: "secondary",
    })),
  ],
);

// Guard: every template department id must exist.
for (const t of STATE_TEMPLATE) if (!STATE_DEPARTMENT_TEMPLATE.some((d) => d.id === t.dept)) throw new Error(`Unknown department ${t.dept}`);

export const SCHEMES: Scheme[] = [...CENTRAL_SCHEMES, ...STATE_SCHEMES];

export function schemesFor(ministryId: string): Scheme[] {
  return SCHEMES.filter((s) => s.ministryId === ministryId);
}

export function getScheme(id: string | undefined): Scheme | undefined {
  return SCHEMES.find((s) => s.id === id);
}

export function schemeForGoal(goalId: string): Scheme | undefined {
  return CENTRAL_SCHEMES.find((s) => s.goalIds?.includes(goalId));
}

export const CATALOGUE_VERIFIED_ON = VERIFIED_ON;
