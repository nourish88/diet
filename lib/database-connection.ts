/** Runtime settings only; migrations keep using the configured direct URL. */
export function runtimeDatabaseUrl(raw: string | undefined, serverless = Boolean(process.env.VERCEL)): string | undefined {
  if (!raw) return raw;
  const url = new URL(raw);
  if (!/^postgres(ql)?:$/.test(url.protocol)) return raw;
  if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "15");
  if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "15");
  if (serverless && !url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "1");
  return url.toString();
}

export function isTransientDatabaseError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return ["P1001", "P1002", "P1017", "P2024"].includes(code ?? "");
}
