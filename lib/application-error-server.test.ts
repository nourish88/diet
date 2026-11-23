import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { persistApplicationErrors } from "./application-error-server";
import { classifyError, errorPath } from "./application-errors";

function errorStore(createMany: ReturnType<typeof vi.fn>) {
  return { applicationError: { createMany }, systemConfig: { findUnique: async () => null } } as unknown as PrismaClient;
}

describe("sanitized persistent server errors", () => {
  it("writes fixed messages in one deduplicated batch", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const db = errorStore(createMany);
    const input = { code: "database_connection" as const, path: "/api/auth/sync?password=secret", occurredAt: new Date("2026-11-21T15:00:00Z") };
    expect(await persistApplicationErrors(db, [input, input])).toBe(true);
    const args = createMany.mock.calls[0][0];
    expect(args.skipDuplicates).toBe(true); expect(args.data[0].eventId).toBe(args.data[1].eventId);
    expect(JSON.stringify(args)).not.toContain("secret"); expect(args.data[0].message).toContain("PostgreSQL");
  });
  it("does not throw or recursively log when the database is unavailable", async () => {
    const createMany = vi.fn().mockRejectedValue(new Error("private connection string"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await persistApplicationErrors(errorStore(createMany), [{ code: "database_connection" }])).toBe(false);
      expect(createMany).toHaveBeenCalledOnce(); expect(JSON.stringify(consoleError.mock.calls)).not.toContain("private");
    } finally { consoleError.mockRestore(); }
  });
  it("recognizes closed PostgreSQL and preserves only safe paths", () => {
    expect(classifyError(new Error("Error in PostgreSQL connection: Error { kind: Closed, cause: None }"))).toBe("database_connection");
    expect(classifyError({ code: "P1017" })).toBe("database_connection");
    expect(errorPath("https://example.com/api/clients/123?phoneNumber=private")).toBe("/api/clients/:id");
  });
});
