import {describe, expect, it} from "vitest";
import {archiveRecord, isArchived, restoreRecord} from "./archive";

describe("recoverable archive lifecycle", () => {
  it("archives without changing record identity or business fields", () => {
    const source = {id: "TKF-1", status: "Taslak"};
    const archived = archiveRecord(source, "Erdem Türköz", "2026-07-23T00:00:00.000Z");
    expect(archived).toEqual({...source, archivedAt: "2026-07-23T00:00:00.000Z", archivedBy: "Erdem Türköz"});
    expect(isArchived(archived)).toBe(true);
  });

  it("is idempotent and preserves the original archive audit metadata", () => {
    const archived = {id: 1, archivedAt: "2026-07-22T00:00:00.000Z", archivedBy: "Kurucu"};
    expect(archiveRecord(archived, "Başka Kullanıcı", "2026-07-23T00:00:00.000Z")).toBe(archived);
  });

  it("restores the same record without archive metadata", () => {
    const restored = restoreRecord({id: 1, name: "Aday", archivedAt: "2026-07-23T00:00:00.000Z", archivedBy: "Kurucu"});
    expect(restored).toEqual({id: 1, name: "Aday"});
    expect(isArchived(restored)).toBe(false);
  });
});
