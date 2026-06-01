import { clientEnv } from "./env";

type Level = "debug" | "info" | "warn" | "error";

const isProd = process.env.NODE_ENV === "production";
const debugOn = clientEnv.NEXT_PUBLIC_DEBUG === "1";

function emit(level: Level, scope: string, msg: string, meta?: unknown) {
  if (isProd && (level === "debug" || level === "info") && !debugOn) return;
  const payload = meta === undefined ? "" : " " + safeStringify(meta);
  const line = `[${level}] ${scope} ${msg}${payload}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function safeStringify(v: unknown): string {
  try {
    return typeof v === "string" ? v : JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function createLogger(scope: string) {
  return {
    debug: (msg: string, meta?: unknown) => emit("debug", scope, msg, meta),
    info: (msg: string, meta?: unknown) => emit("info", scope, msg, meta),
    warn: (msg: string, meta?: unknown) => emit("warn", scope, msg, meta),
    error: (msg: string, meta?: unknown) => emit("error", scope, msg, meta),
  };
}

export type Logger = ReturnType<typeof createLogger>;
