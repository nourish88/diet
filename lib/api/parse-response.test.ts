import { describe, expect, it } from "vitest";
import { parseApiResponse } from "./parse-response";
import { ok, fail } from "./response";

describe("parseApiResponse", () => {
  it("unwraps envelope success", async () => {
    const res = ok({ items: [1, 2] });
    const data = await parseApiResponse<{ items: number[] }>(res);
    expect(data.items).toEqual([1, 2]);
  });

  it("throws on envelope error", async () => {
    const res = fail("forbidden", "Nope");
    await expect(parseApiResponse(res)).rejects.toMatchObject({
      message: "Nope",
      status: 403,
      code: "forbidden",
    });
  });

  it("supports legacy JSON", async () => {
    const res = new Response(JSON.stringify({ total: 5 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    const data = await parseApiResponse<{ total: number }>(res);
    expect(data.total).toBe(5);
  });
});
