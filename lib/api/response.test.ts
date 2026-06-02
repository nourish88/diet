import { describe, expect, it } from "vitest";
import { fail, isApiEnvelope, ok, legacyErrorMessage, statusToErrorCode } from "./response";

describe("isApiEnvelope", () => {
  it("detects standard envelope", async () => {
    const body = await ok({ id: 1 }).json();
    expect(isApiEnvelope(body)).toBe(true);
  });

  it("rejects legacy JSON", () => {
    expect(isApiEnvelope({ clients: [] })).toBe(false);
    expect(isApiEnvelope(null)).toBe(false);
  });
});

describe("ok / fail", () => {
  it("ok wraps data with meta", async () => {
    const res = ok({ foo: "bar" });
    const json = await res.json();
    expect(json.data).toEqual({ foo: "bar" });
    expect(json.error).toBeNull();
    expect(json.meta.ts).toBeDefined();
  });

  it("fail sets error code and status", async () => {
    const res = fail("not_found", "Missing");
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error?.code).toBe("not_found");
    expect(json.data).toBeNull();
  });
});

describe("helpers", () => {
  it("maps HTTP status to error code", () => {
    expect(statusToErrorCode(404)).toBe("not_found");
    expect(statusToErrorCode(418)).toBe("internal");
  });

  it("extracts legacy error messages", () => {
    expect(legacyErrorMessage({ error: "x" }, "fb")).toBe("x");
    expect(legacyErrorMessage({ message: "m" }, "fb")).toBe("m");
  });
});
