import { describe, expect, it } from "vitest";
import { normalizeClientPhoneNumber } from "./phone-normalize";

describe("normalizeClientPhoneNumber", () => {
  it.each([
    ["0533 310 49 70", "+905333104970"],
    ["+90 533 310 49 70", "+905333104970"],
    ["+49 1512 3456789", "+4915123456789"],
    ["0049 1512 3456789", "+4915123456789"],
    ["4915123456789", "+4915123456789"],
    ["+33 6 12 34 56 78", "+33612345678"],
    ["+1 415 555 2671", "+14155552671"],
    ["14155552671", "+14155552671"],
    ["+44 7400 123456", "+447400123456"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeClientPhoneNumber(input)).toBe(expected);
  });

  it.each(["1234567890", "1111111111", "+44 7700 900123"])(
    "rejects invalid or fake-looking number %s",
    (input) => {
      expect(normalizeClientPhoneNumber(input)).toBeNull();
    }
  );
});
