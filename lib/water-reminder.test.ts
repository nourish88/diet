import { describe, expect, it } from "vitest";
import {
  DEFAULT_WATER_REMINDER_SLOT,
  parseWaterReminderSlot,
} from "./water-reminder";

describe("water reminder slots", () => {
  it("keeps noon as the backward-compatible default", () => {
    expect(DEFAULT_WATER_REMINDER_SLOT).toBe("12");
  });

  it("accepts the configured reminder hours", () => {
    expect(parseWaterReminderSlot("12")).toBe("12");
    expect(parseWaterReminderSlot("17")).toBe("17");
  });

  it("rejects unsupported hours", () => {
    expect(parseWaterReminderSlot("10")).toBeNull();
    expect(parseWaterReminderSlot(null)).toBeNull();
  });
});
