// Who runs what: Union ministries and the departments every state has.
//
// Honesty note. The Union list is the standard set of ministries (54) as commonly published;
// portfolios get merged and renamed, so `verifiedOn` records when it was last checked and each
// entry links to the ministry's own site. State departments are NOT researched state by state:
// every state is given the same template of citizen-facing departments, with the state's
// e-District / service portal where RejectLess knows it. Names differ between states (e.g.
// "Revenue" vs "Revenue & Disaster Management") — the UI says "typical name" for these.

export type Level = "central" | "state";

export interface Ministry {
  id: string;
  level: Level;
  name: string;
  nameHi: string;
  url?: string;
  /** Short line for citizens: what you'd come here for. */
  citizen?: string;
}

export const VERIFIED_ON = "2026-11-02";

const M = (id: string, name: string, nameHi: string, url?: string, citizen?: string): Ministry => ({ id, level: "central", name, nameHi, url, citizen });

export const CENTRAL_MINISTRIES: Ministry[] = [
  M("agri", "Ministry of Agriculture & Farmers Welfare", "कृषि एवं किसान कल्याण मंत्रालय", "https://agriwelfare.gov.in/", "PM-KISAN, crop insurance, Kisan Credit Card"),
  M("ayush", "Ministry of AYUSH", "आयुष मंत्रालय", "https://ayush.gov.in/"),
  M("chem", "Ministry of Chemicals & Fertilizers", "रसायन एवं उर्वरक मंत्रालय", "https://chemicals.gov.in/", "Jan Aushadhi medicines"),
  M("civav", "Ministry of Civil Aviation", "नागर विमानन मंत्रालय", "https://www.civilaviation.gov.in/"),
  M("coal", "Ministry of Coal", "कोयला मंत्रालय", "https://coal.gov.in/"),
  M("commerce", "Ministry of Commerce & Industry", "वाणिज्य एवं उद्योग मंत्रालय", "https://commerce.gov.in/", "Startup / export registrations"),
  M("comm", "Ministry of Communications", "संचार मंत्रालय", "https://dot.gov.in/", "Post office savings, India Post"),
  M("food", "Ministry of Consumer Affairs, Food & Public Distribution", "उपभोक्ता मामले, खाद्य एवं सार्वजनिक वितरण मंत्रालय", "https://consumeraffairs.nic.in/", "Ration card (through your state), consumer complaints"),
  M("coop", "Ministry of Cooperation", "सहकारिता मंत्रालय", "https://cooperation.gov.in/"),
  M("corp", "Ministry of Corporate Affairs", "कॉरपोरेट कार्य मंत्रालय", "https://www.mca.gov.in/", "Company and LLP registration"),
  M("culture", "Ministry of Culture", "संस्कृति मंत्रालय", "https://indiaculture.gov.in/"),
  M("defence", "Ministry of Defence", "रक्षा मंत्रालय", "https://mod.gov.in/", "Ex-servicemen welfare, Agnipath"),
  M("doner", "Ministry of Development of North Eastern Region", "पूर्वोत्तर क्षेत्र विकास मंत्रालय", "https://mdoner.gov.in/"),
  M("earth", "Ministry of Earth Sciences", "पृथ्वी विज्ञान मंत्रालय", "https://moes.gov.in/"),
  M("edu", "Ministry of Education", "शिक्षा मंत्रालय", "https://www.education.gov.in/", "Scholarships (NSP), education loans"),
  M("meity", "Ministry of Electronics & Information Technology", "इलेक्ट्रॉनिकी और सूचना प्रौद्योगिकी मंत्रालय", "https://www.meity.gov.in/", "Aadhaar (UIDAI), DigiLocker, UMANG"),
  M("env", "Ministry of Environment, Forest & Climate Change", "पर्यावरण, वन और जलवायु परिवर्तन मंत्रालय", "https://moef.gov.in/"),
  M("mea", "Ministry of External Affairs", "विदेश मंत्रालय", "https://www.mea.gov.in/", "Passport"),
  M("fin", "Ministry of Finance", "वित्त मंत्रालय", "https://finmin.gov.in/", "Income tax return, Jan Dhan, Atal Pension, insurance schemes"),
  M("fish", "Ministry of Fisheries, Animal Husbandry & Dairying", "मत्स्यपालन, पशुपालन और डेयरी मंत्रालय", "https://dahd.gov.in/", "Kisan Credit Card for animal husbandry"),
  M("fpi", "Ministry of Food Processing Industries", "खाद्य प्रसंस्करण उद्योग मंत्रालय", "https://www.mofpi.gov.in/"),
  M("health", "Ministry of Health & Family Welfare", "स्वास्थ्य एवं परिवार कल्याण मंत्रालय", "https://mohfw.gov.in/", "Ayushman Bharat health card"),
  M("heavy", "Ministry of Heavy Industries", "भारी उद्योग मंत्रालय", "https://heavyindustries.gov.in/"),
  M("home", "Ministry of Home Affairs", "गृह मंत्रालय", "https://www.mha.gov.in/", "Citizenship, police verification"),
  M("housing", "Ministry of Housing & Urban Affairs", "आवासन और शहरी कार्य मंत्रालय", "https://mohua.gov.in/", "PM Awas (Urban), PM SVANidhi street-vendor loans"),
  M("ib", "Ministry of Information & Broadcasting", "सूचना और प्रसारण मंत्रालय", "https://mib.gov.in/"),
  M("jal", "Ministry of Jal Shakti", "जल शक्ति मंत्रालय", "https://jalshakti-ddws.gov.in/", "Tap water connection (Jal Jeevan Mission)"),
  M("labour", "Ministry of Labour & Employment", "श्रम और रोज़गार मंत्रालय", "https://labour.gov.in/", "EPF / pension withdrawals, e-Shram, ESIC"),
  M("law", "Ministry of Law & Justice", "विधि और न्याय मंत्रालय", "https://lawmin.gov.in/", "Legal aid (NALSA), Tele-Law"),
  M("msme", "Ministry of Micro, Small & Medium Enterprises", "सूक्ष्म, लघु और मध्यम उद्यम मंत्रालय", "https://msme.gov.in/", "Udyam registration, PM Vishwakarma"),
  M("mines", "Ministry of Mines", "खान मंत्रालय", "https://mines.gov.in/"),
  M("minority", "Ministry of Minority Affairs", "अल्पसंख्यक कार्य मंत्रालय", "https://www.minorityaffairs.gov.in/", "Minority scholarships"),
  M("mnre", "Ministry of New & Renewable Energy", "नवीन और नवीकरणीय ऊर्जा मंत्रालय", "https://mnre.gov.in/", "PM Surya Ghar rooftop solar"),
  M("panchayat", "Ministry of Panchayati Raj", "पंचायती राज मंत्रालय", "https://panchayat.gov.in/", "SVAMITVA property cards"),
  M("parl", "Ministry of Parliamentary Affairs", "संसदीय कार्य मंत्रालय", "https://mpa.gov.in/"),
  M("dopt", "Ministry of Personnel, Public Grievances & Pensions", "कार्मिक, लोक शिकायत और पेंशन मंत्रालय", "https://dopt.gov.in/", "Central pensions, CPGRAMS grievances"),
  M("petro", "Ministry of Petroleum & Natural Gas", "पेट्रोलियम और प्राकृतिक गैस मंत्रालय", "https://mopng.gov.in/", "Ujjwala LPG connection"),
  M("planning", "Ministry of Planning", "योजना मंत्रालय", "https://www.niti.gov.in/"),
  M("ports", "Ministry of Ports, Shipping & Waterways", "पत्तन, पोत परिवहन और जलमार्ग मंत्रालय", "https://shipmin.gov.in/"),
  M("power", "Ministry of Power", "विद्युत मंत्रालय", "https://powermin.gov.in/"),
  M("rail", "Ministry of Railways", "रेल मंत्रालय", "https://indianrailways.gov.in/"),
  M("roads", "Ministry of Road Transport & Highways", "सड़क परिवहन और राजमार्ग मंत्रालय", "https://morth.nic.in/", "Driving licence, vehicle registration (Parivahan)"),
  M("rural", "Ministry of Rural Development", "ग्रामीण विकास मंत्रालय", "https://rural.gov.in/", "MGNREGA job card, PM Awas (Gramin), old-age / widow / disability pensions (NSAP)"),
  M("sci", "Ministry of Science & Technology", "विज्ञान और प्रौद्योगिकी मंत्रालय", "https://dst.gov.in/", "INSPIRE scholarships"),
  M("skill", "Ministry of Skill Development & Entrepreneurship", "कौशल विकास और उद्यमिता मंत्रालय", "https://www.msde.gov.in/", "PMKVY skill courses, apprenticeships"),
  M("sje", "Ministry of Social Justice & Empowerment", "सामाजिक न्याय और अधिकारिता मंत्रालय", "https://socialjustice.gov.in/", "SC / OBC scholarships, disability (UDID) card"),
  M("mospi", "Ministry of Statistics & Programme Implementation", "सांख्यिकी और कार्यक्रम कार्यान्वयन मंत्रालय", "https://mospi.gov.in/"),
  M("steel", "Ministry of Steel", "इस्पात मंत्रालय", "https://steel.gov.in/"),
  M("textiles", "Ministry of Textiles", "वस्त्र मंत्रालय", "https://texmin.nic.in/", "Handloom / handicraft artisan cards"),
  M("tourism", "Ministry of Tourism", "पर्यटन मंत्रालय", "https://tourism.gov.in/"),
  M("tribal", "Ministry of Tribal Affairs", "जनजातीय कार्य मंत्रालय", "https://tribal.nic.in/", "ST scholarships, Eklavya schools"),
  M("wcd", "Ministry of Women & Child Development", "महिला एवं बाल विकास मंत्रालय", "https://wcd.nic.in/", "Maternity benefit (PMMVY), Anganwadi services"),
  M("youth", "Ministry of Youth Affairs & Sports", "युवा कार्यक्रम और खेल मंत्रालय", "https://yas.nic.in/", "Khelo India, NSS / NYKS"),
];

// ---------------------------------------------------------------------------- state departments (template)

/** Departments every state/UT has in some form. `id` is stable; the display name is the typical one. */
export const STATE_DEPARTMENT_TEMPLATE: Omit<Ministry, "level">[] = [
  { id: "revenue", name: "Revenue Department", nameHi: "राजस्व विभाग", citizen: "Income, caste, domicile and residence certificates; land records" },
  { id: "social", name: "Social Welfare Department", nameHi: "समाज कल्याण विभाग", citizen: "Old-age, widow and disability pensions; SC/ST/OBC scholarships" },
  { id: "education", name: "Education / Higher Education Department", nameHi: "शिक्षा / उच्च शिक्षा विभाग", citizen: "State scholarships, school admissions" },
  { id: "bcmw", name: "Backward Classes & Minority Welfare Department", nameHi: "पिछड़ा वर्ग एवं अल्पसंख्यक कल्याण विभाग", citizen: "OBC / minority scholarships and hostels" },
  { id: "foodsupply", name: "Food & Civil Supplies Department", nameHi: "खाद्य एवं आपूर्ति विभाग", citizen: "Ration card (NFSA), LPG subsidy linkage" },
  { id: "labour", name: "Labour Department", nameHi: "श्रम विभाग", citizen: "Construction-worker welfare board, e-Shram, shop registration" },
  { id: "agriculture", name: "Agriculture Department", nameHi: "कृषि विभाग", citizen: "State farmer support, seeds and equipment subsidies" },
  { id: "wcd", name: "Women & Child Development Department", nameHi: "महिला एवं बाल विकास विभाग", citizen: "Girl-child and women's support schemes, Anganwadi" },
  { id: "health", name: "Health & Family Welfare Department", nameHi: "स्वास्थ्य एवं परिवार कल्याण विभाग", citizen: "State health insurance, birth/death certificates (with local bodies)" },
  { id: "rural", name: "Rural Development / Panchayati Raj Department", nameHi: "ग्रामीण विकास / पंचायती राज विभाग", citizen: "MGNREGA job card, rural housing" },
  { id: "urban", name: "Urban Development / Municipal Administration", nameHi: "नगर विकास विभाग", citizen: "Property tax, trade licence, urban housing" },
  { id: "transport", name: "Transport Department", nameHi: "परिवहन विभाग", citizen: "Driving licence, vehicle registration (via Parivahan)" },
  { id: "home", name: "Home / Police Department", nameHi: "गृह विभाग", citizen: "Police verification, character certificate, tenant verification" },
  { id: "tribal", name: "Tribal Welfare Department", nameHi: "जनजातीय कल्याण विभाग", citizen: "ST certificates and scholarships (where applicable)" },
  { id: "housing", name: "Housing Department", nameHi: "आवास विभाग", citizen: "State housing schemes, PMAY implementation" },
];

/** State service portals RejectLess knows. Others fall back to NIC's ServicePlus. */
export const STATE_PORTALS: Record<string, { label: string; url: string }> = {
  AP: { label: "AP Meeseva", url: "https://ap.meeseva.gov.in/" },
  AS: { label: "Sewa Setu Assam", url: "https://sewasetu.assam.gov.in/" },
  BR: { label: "ServicePlus Bihar (RTPS)", url: "https://serviceonline.bihar.gov.in/" },
  CG: { label: "Chhattisgarh e-District", url: "https://edistrict.cgstate.gov.in/" },
  DL: { label: "Delhi e-District", url: "https://edistrict.delhigovt.nic.in/" },
  GA: { label: "Goa Online", url: "https://goaonline.gov.in/" },
  GJ: { label: "Digital Gujarat", url: "https://www.digitalgujarat.gov.in/" },
  HR: { label: "Saral Haryana", url: "https://saralharyana.gov.in/" },
  HP: { label: "HP e-District", url: "https://edistrict.hp.gov.in/" },
  JH: { label: "JharSewa", url: "https://jharsewa.jharkhand.gov.in/" },
  KA: { label: "Seva Sindhu", url: "https://sevasindhu.karnataka.gov.in/" },
  KL: { label: "Kerala e-District", url: "https://edistrict.kerala.gov.in/" },
  MP: { label: "MP e-District", url: "https://mpedistrict.gov.in/" },
  MH: { label: "Aaple Sarkar", url: "https://aaplesarkar.mahaonline.gov.in/" },
  OD: { label: "Odisha e-District", url: "https://edistrict.odisha.gov.in/" },
  PB: { label: "Punjab Connect", url: "https://connect.punjab.gov.in/" },
  RJ: { label: "e-Mitra Rajasthan", url: "https://emitra.rajasthan.gov.in/" },
  TN: { label: "TN e-Sevai", url: "https://tnesevai.tn.gov.in/" },
  TS: { label: "Telangana MeeSeva", url: "https://ts.meeseva.telangana.gov.in/" },
  UP: { label: "UP e-District", url: "https://edistrict.up.gov.in/" },
  UK: { label: "Uttarakhand e-District", url: "https://edistrict.uk.gov.in/" },
  WB: { label: "WB e-District", url: "https://edistrict.wb.gov.in/" },
};

export const DEFAULT_PORTAL = { label: "ServicePlus (NIC) — find your state", url: "https://serviceonline.gov.in/" };

export function statePortal(code: string) {
  return STATE_PORTALS[code] ?? DEFAULT_PORTAL;
}

export function stateDepartments(code: string): Ministry[] {
  return STATE_DEPARTMENT_TEMPLATE.map((d) => ({ ...d, level: "state", id: `${code}:${d.id}`, url: statePortal(code).url }));
}

export function getMinistry(id: string): Ministry | undefined {
  const central = CENTRAL_MINISTRIES.find((m) => m.id === id);
  if (central) return central;
  const [code] = id.split(":");
  return stateDepartments(code).find((m) => m.id === id);
}
