import { describe, expect, it } from "vitest";
import { inspectDataIntegrity } from "./dataIntegrity";

describe("data integrity inspection", () => {
  it("detects broken candidate and revision links", () => {
    const issues = inspectDataIntegrity(
      [{ id: 1, name: "A", phone: "0532 111 22 33" }],
      [{ id: "TKF-2", candidate: "B", candidateId: 99, recordType: "Kayıtlı aday", parentOfferId: "TKF-X", version: 1 }],
    );
    expect(issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["MISSING_CANDIDATE", "MISSING_PARENT_OFFER", "INVALID_REVISION_VERSION"]));
  });

  it("detects normalized duplicate candidate phones", () => {
    const issues = inspectDataIntegrity(
      [
        { id: 1, name: "A", phone: "+90 532 111 22 33" },
        { id: 2, name: "B", phone: "5321112233" },
      ],
      [],
    );
    expect(issues.some((issue) => issue.code === "DUPLICATE_CANDIDATE_PHONE")).toBe(true);
  });

  it("preserves legacy unlinked offers without guessing a candidate by name", () => {
    const issues = inspectDataIntegrity(
      [{ id: 1, name: "A", phone: "0532 111 22 33" }],
      [{ id: "TKF-OLD", candidate: "A" }],
    );
    expect(issues.map((issue) => issue.code)).toEqual(["LEGACY_UNLINKED_OFFER"]);
  });
});
