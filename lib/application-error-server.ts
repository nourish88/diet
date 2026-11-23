import { createHash, randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { after } from "next/server";
import { classifyError, errorMessages, errorPath, type ApplicationErrorCode } from "./application-errors";
import { getLoggingEnabled } from "./logging-settings";

type ErrorStore = Pick<PrismaClient, "applicationError" | "systemConfig">;

export interface ServerErrorInput {
  code: ApplicationErrorCode;
  path?: string;
  eventId?: string;
  subject?: string | null;
  source?: "client" | "server";
  occurredAt?: Date;
  status?: number;
  device?: string;
  referenceId?: number;
  bundlePosition?: string;
}
// Separate from Prisma imports so failed logging cannot recursively log itself.
function errorData(input: ServerErrorInput) {
  const occurredAt = input.occurredAt ?? new Date();
  const path = errorPath(input.path ?? "/");
  // Group server error storms per minute; browser retries use their stable event UUID.
  const eventId = input.eventId ?? createHash("sha256").update(JSON.stringify([input.code, path, input.subject, input.referenceId, Math.floor(occurredAt.getTime() / 60000)])).digest("hex");
  const message = input.code === "javascript_error" && input.bundlePosition
    ? `${errorMessages[input.code]} (JS ${input.bundlePosition})`
    : errorMessages[input.code];
  return { id: randomUUID(), eventId, code: input.code, message, path,
        source: input.source ?? "server", subject: input.subject ?? null, occurredAt,
        status: input.status, device: input.device?.slice(0, 160), referenceId: input.referenceId };
}
export async function persistApplicationErrors(db: ErrorStore, inputs: ServerErrorInput[]): Promise<boolean> {
  if (!inputs.length) return true;
  try {
    if (!await getLoggingEnabled(db, "application_error_logging_enabled")) return true;
    const data = inputs.map(errorData);
    // A single write keeps error collection from delaying notification delivery.
    await db.applicationError.createMany({ data, skipDuplicates: true });
    return true;
  } catch {
    console.error(JSON.stringify({ event: "application_error_persistence_failed", codes: [...new Set(inputs.map((item) => item.code))], count: inputs.length }));
    return false;
  }
}

export function persistApplicationError(db: ErrorStore, input: ServerErrorInput) {
  return persistApplicationErrors(db, [input]);
}

export function scheduleApplicationError(db: ErrorStore, input: ServerErrorInput) {
  const write = () => persistApplicationError(db, input).then(() => undefined);
  try { after(write); } catch { void write(); }
}

export function databaseErrorCode(error: unknown) { return classifyError(error, "database_query"); }
