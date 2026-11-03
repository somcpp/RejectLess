import { describe, expect, it } from "vitest";
import type { Finding } from "@/engine/types";
import { BUCKETS, bucketOf, groupFindings, missingDocType } from "./triage";

const base: Finding = {
  key: "X",
  ruleId: "X",
  ruleVersion: "1",
  title: "t",
  category: "consistency",
  status: "action",
  severity: "high",
  summary: "",
  whyItMatters: "",
  recommendation: "",
  observations: [],
  signals: [],
  confidence: 1,
  sourceIds: [],
  basis: "engine",
  abstract: "",
  affectedDocIds: [],
};

describe("triage buckets", () => {
  it("has the five sections in the agreed order", () => {
    expect(BUCKETS.map((b) => b.id)).toEqual(["passed", "documents", "review", "verify", "external"]);
  });
  it("keeps engine statuses for pass / external", () => {
    expect(bucketOf({ ...base, status: "passed" })).toBe("passed");
    expect(bucketOf({ ...base, status: "external" })).toBe("external");
  });
  it("mismatches of either severity go to 'needs review'", () => {
    expect(bucketOf({ ...base, status: "action" })).toBe("review");
    expect(bucketOf({ ...base, status: "review" })).toBe("review");
  });
  it("missing documents, poor photos and 'could not check' go to 'documents needed'", () => {
    expect(bucketOf({ ...base, ruleId: "GEN-DOCS", key: "GEN-DOCS:pan" })).toBe("documents");
    expect(bucketOf({ ...base, ruleId: "GEN-QUALITY", key: "GEN-QUALITY:doc1" })).toBe("documents");
    expect(bucketOf({ ...base, status: "review", missingInput: "date of exit" })).toBe("documents");
    expect(missingDocType({ ...base, ruleId: "GEN-DOCS", key: "GEN-DOCS:pan" })).toBe("pan");
    expect(missingDocType(base)).toBeUndefined();
  });
  it("groups every finding exactly once", () => {
    const g = groupFindings([base, { ...base, status: "passed" }, { ...base, status: "external" }]);
    expect(Object.values(g).flat()).toHaveLength(3);
  });
});
