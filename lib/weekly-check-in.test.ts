import { describe, expect, it } from "vitest";
import {
  getWeeklyCheckInWeekStart,
  isDissatisfied,
  turkeyDateKey,
} from "./weekly-check-in";

describe("weekly check-in scheduling", () => {
  it("uses the current Monday for a Sunday initial send", () => {
    expect(
      getWeeklyCheckInWeekStart(
        new Date("2026-07-12T15:00:00.000Z"),
        "initial",
      ).toISOString(),
    ).toBe("2026-07-06T00:00:00.000Z");
  });

  it("uses the previous Monday for a Monday reminder", () => {
    expect(
      getWeeklyCheckInWeekStart(
        new Date("2026-07-13T07:00:00.000Z"),
        "reminder",
      ).toISOString(),
    ).toBe("2026-07-06T00:00:00.000Z");
  });

  it("creates Turkey-local date keys", () => {
    expect(turkeyDateKey(new Date("2026-07-11T22:30:00.000Z"))).toBe(
      "2026-07-12",
    );
  });

  it("flags satisfaction scores one and two", () => {
    expect(isDissatisfied(2)).toBe(true);
    expect(isDissatisfied(3)).toBe(false);
    expect(isDissatisfied(null)).toBe(false);
  });
});
