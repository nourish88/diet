import { describe, it, expect } from "vitest";
import { runtimeDatabaseUrl, isTransientDatabaseError } from "./database-connection";
describe("serverless PostgreSQL settings", () => {
  it("allows a Neon cold start and bounds each serverless pool while preserving configured settings", () => {
    const raw = "postgresql://user:password@db-pooler.neon.tech/db?sslmode=require";
    const url = new URL(runtimeDatabaseUrl(raw, true)!);
    expect(url.searchParams.get("connect_timeout")).toBe("15"); expect(url.searchParams.get("connection_limit")).toBe("1");
    expect(url.searchParams.get("sslmode")).toBe("require");
    expect(new URL(runtimeDatabaseUrl(`${raw}&connection_limit=3&connect_timeout=25`, true)!).searchParams.get("connection_limit")).toBe("3");
    expect(new URL(runtimeDatabaseUrl(raw, false)!).searchParams.has("connection_limit")).toBe(false);
  });
  it("only retries recognized connection failures", () => {
    expect(isTransientDatabaseError({ code: "P1017" })).toBe(true);
    expect(isTransientDatabaseError({ code: "P2002" })).toBe(false);
    expect(isTransientDatabaseError(new Error("unknown"))).toBe(false);
  });
});
