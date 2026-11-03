// Sample answers for the "What will you type on the portal?" step, used to fill it once
// when a user arrives with nothing typed. Fictional person and identifiers; the user is told
// the values are samples and can change or clear them.

export const SAMPLE_DRAFTS: Record<string, Record<string, string>> = {
  "nsp-csss:fresh": {
    scheme_category: "post_matric",
    name: "Saurabh Rajput",
    dob: "2004-03-15",
    gender: "Male",
    mobile: "9899012345",
    email: "saurabh.rajput@example.com",
    bank_name: "State Bank of India",
    ifsc: "SBIN0001234",
    account_number: "35421678901",
    institution: "KIET Group of Institutions",
    course: "B.Tech.",
    course_year: "3rd Year",
    study_mode: "Regular",
    academic_year: "2026-27",
    admission_date: "2024-08-28",
    board: "UP Board",
    roll_number: "1234567",
    year_of_passing: "2022",
    percentage: "73",
    hosteller: "Day scholar",
    fees: "95000",
    father_name: "Rajesh Rajput",
    mother_name: "Sunita Rajput",
    religion: "Hindu",
    community: "General",
    annual_income: "250000",
    disability: "No",
    marital: "Unmarried",
    other_scholarship: "no",
    address: "Muradnagar, Ghaziabad, India",
    district: "Ghaziabad",
    block: "Muradnagar",
    pincode: "201206",
  },
};

export function sampleDraftFor(appId: string, variantId: string): Record<string, string> | undefined {
  return SAMPLE_DRAFTS[`${appId}:${variantId}`];
}
