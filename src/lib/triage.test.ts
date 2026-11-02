import { describe, expect, it } from "vitest";
import type { Finding } from "@/engine/types";
import { bucketOf, groupFindings, missingDocType } from "./triage";

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
  it("keeps engine statuses for pass / external", () => {
    expect(bucketOf({ ...base, status: "passed" })).toBe("passed");
    expect(bucketOf({ ...base, status: "external" })).toBe("external");
  });
  it("splits action vs review", () => {
    expect(bucketOf({ ...base, status: "action" })).toBe("action");
    expect(bucketOf({ ...base, status: "review" })).toBe("review");
  });
  it("sends missing documents and 'could not check' to the documents group", () => {
    expect(bucketOf({ ...base, ruleId: "GEN-DOCS", key: "GEN-DOCS:pan" })).toBe("documents");
    expect(bucketOf({ ...base, status: "review", missingInput: "date of exit" })).toBe("documents");
    expect(missingDocType({ ...base, ruleId: "GEN-DOCS", key: "GEN-DOCS:pan" })).toBe("pan");
    expect(missingDocType(base)).toBeUndefined();
  });
  it("groups every finding exactly once", () => {
    const g = groupFindings([base, { ...base, status: "passed" }, { ...base, status: "external" }]);
    expect(Object.values(g).flat()).toHaveLength(3);
  });
});
