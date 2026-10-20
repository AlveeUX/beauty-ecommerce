import { describe, expect, it } from "vitest";
import { formatClock, storeStatus } from "../../src/lib/store-status";

const hours = { open: "10:00", close: "20:00" };
const tz = "Europe/Copenhagen";
// Copenhagen is UTC+2 on 2026-10-20 (summer time ended 25 Oct), so 12:00 UTC is 14:00 there
const at = (iso: string) => new Date(iso);

describe("store opening status (CNT-005)", () => {
  it("formats 24h times the way the design writes them", () => {
    expect(formatClock("20:00")).toBe("8:00 PM");
    expect(formatClock("10:00")).toBe("10:00 AM");
    expect(formatClock("00:30")).toBe("12:30 AM");
    expect(formatClock("12:00")).toBe("12:00 PM");
  });

  it("is open between opening and closing time in the store's own time zone", () => {
    expect(storeStatus(hours, tz, at("2026-10-20T12:00:00Z"))).toEqual({
      open: true,
      text: "Closes 8:00 PM",
    });
    // 07:30 UTC = 09:30 in Copenhagen: still closed
    expect(storeStatus(hours, tz, at("2026-10-20T07:30:00Z"))).toEqual({
      open: false,
      text: "Opens 10:00 AM",
    });
  });

  it("closes exactly at closing time and opens exactly at opening time", () => {
    expect(storeStatus(hours, tz, at("2026-10-20T18:00:00Z")).open).toBe(false); // 20:00 local
    expect(storeStatus(hours, tz, at("2026-10-20T17:59:00Z")).open).toBe(true);
    expect(storeStatus(hours, tz, at("2026-10-20T08:00:00Z")).open).toBe(true); // 10:00 local
  });
});
