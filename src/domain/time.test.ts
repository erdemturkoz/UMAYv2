import { describe, expect, it } from "vitest";
import {
  formatIstanbulDateTime,
  inIstanbulPeriod,
  istanbulDateKey,
  parseStoredDate,
} from "./time";

describe("Europe/Istanbul date standard", () => {
  it("keeps the Istanbul business day around UTC midnight", () => {
    expect(istanbulDateKey(new Date("2026-07-22T21:30:00.000Z"))).toBe("2026-07-23");
    expect(formatIstanbulDateTime(new Date("2026-07-22T21:30:00.000Z"))).toContain("23.07.2026");
  });

  it("reads legacy Turkish wall-clock values as Istanbul time", () => {
    expect(parseStoredDate("23.07.2026 00:30")?.toISOString()).toBe("2026-07-22T21:30:00.000Z");
  });

  it("filters periods by Istanbul calendar boundaries", () => {
    const now = new Date("2026-07-22T21:15:00.000Z"); // 23 July in Istanbul
    expect(inIstanbulPeriod("2026-07-22T21:05:00.000Z", "Bugün", now)).toBe(true);
    expect(inIstanbulPeriod("2026-07-22T20:59:59.000Z", "Bugün", now)).toBe(false);
    expect(inIstanbulPeriod("20.07.2026 09:00", "Bu Hafta", now)).toBe(true);
  });
});
