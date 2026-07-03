import { describe, expect, it } from "vitest";
import { formatPhoneForWhatsApp } from "./whatsapp";

describe("formatPhoneForWhatsApp", () => {
  it.each([
    ["+90 533 310 49 70", "905333104970"],
    ["‎+90 533 310 49 70", "905333104970"],
    ["+90 0 533 310 49 70", "905333104970"],
    ["90 0 533 310 49 70", "905333104970"],
    ["0 533 310 49 70", "905333104970"],
    ["533 310 49 70", "905333104970"],
    ["+5333104970", "905333104970"],
    ["0090 533 310 49 70", "905333104970"],
  ])("normalizes %s", (input, expected) => {
    expect(formatPhoneForWhatsApp(input)).toBe(expected);
  });
});
