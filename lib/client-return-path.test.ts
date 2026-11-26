import { describe, expect, it } from "vitest";
import { clientReturnPath } from "./client-return-path";

describe("client portal continuation", () => {
  it("preserves the meal identifier on return", () => {
    expect(clientReturnPath("/client/diets/42?ogunId=5")).toBe("/client/diets/42?ogunId=5");
  });
  it.each([null, "//other.test/client", "/client/../../diets", "/clients", "/\\other.test/client", "https://other.test"])(
    "defaults to the dashboard for %s", (target) => expect(clientReturnPath(target)).toBe("/client"),
  );
});
