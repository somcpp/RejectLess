import { describe, expect, it } from "vitest";
import { decodeRejection } from "./rejection";

describe("rejection decoder", () => {
  it("recognises an EPFO date-of-exit rejection", () => {
    const d = decodeRejection("CLAIM REJECTED\nReason: DATE OF EXIT NOT AVAILABLE IN THE SYSTEM. MEMBER STILL IN SERVICE.", "epfo-withdrawal");
    expect(d[0]?.reason.id).toBe("epf-date-of-exit");
    expect(d[0].evidence[0]).toMatch(/DATE OF EXIT/);
  });
  it("recognises an NSP Aadhaar-seeding failure and a PM-KISAN e-KYC hold", () => {
    expect(decodeRejection("Payment failed: Aadhaar not seeded with bank account (NPCI)", "nsp-csss")[0]?.reason.id).toBe("nsp-bank-seeding");
    expect(decodeRejection("Status: eKYC pending for registration no. UP123", "pm-kisan")[0]?.reason.id).toBe("pmk-ekyc");
  });
  it("recognises a defective-return notice and returns nothing for unknown text", () => {
    expect(decodeRejection("Notice u/s 139(9): return is defective", "income-tax-return")[0]?.reason.id).toBe("itr-defective");
    expect(decodeRejection("Dear applicant, thank you for your patience.", "nsp-csss")).toHaveLength(0);
  });
  it("searches all applications when none is given", () => {
    expect(decodeRejection("PAN is inoperative").map((d) => d.reason.id)).toContain("itr-pan-inoperative");
  });
});
