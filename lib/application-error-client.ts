"use client";
import { ClientErrorSchema, classifyError, errorPath, type ApplicationErrorCode, type ClientErrorEvent } from "./application-errors";

const STORAGE_KEY = "application-error-outbox-v1";
const MAX_EVENTS = 50;
let memory: ClientErrorEvent[] = [];
let subject: string | null = null;
let accessToken: string | null = null;
let flushing = false;
let storageWritable = true;

function readQueue(): ClientErrorEvent[] {
  if (!storageWritable) return memory;
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (Array.isArray(stored)) return stored.flatMap((item) => {
      const result = ClientErrorSchema.safeParse(item);
      return result.success && Date.parse(result.data.occurredAt) > Date.now() - 7 * 86400000 ? [result.data] : [];
    }).slice(-MAX_EVENTS);
  } catch { storageWritable = false; }
  return memory;
}
function saveQueue(queue: ClientErrorEvent[]) {
  memory = queue.slice(-MAX_EVENTS);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memory)); } catch { storageWritable = false; }
}
export function setErrorReporterSession(id: string | null, token: string | null) { subject = id; accessToken = token; }

function bundlePosition(error: unknown, event?: ErrorEvent): string | undefined {
  function position(file: string, line: number, column: number) {
    try {
      const url = new URL(file);
      if (url.origin !== window.location.origin || !url.pathname.startsWith("/_next/static/chunks/")) return;
      const hash = url.pathname.match(/[-.]([a-f0-9]{16})\.js$/)?.[1];
      if (hash && [line, column].every((n) => Number.isInteger(n) && n > 0 && n < 1e8)) {
        return `${hash}:${line}:${column}`;
      }
    } catch { /* Ignore non-URL stack frames. */ }
  }
  if (event?.filename) {
    const found = position(event.filename, event.lineno, event.colno);
    if (found) return found;
  }
  if (error instanceof Error && typeof error.stack === "string") {
    const frames = error.stack.slice(0, 8192).matchAll(/(https?:\/\/[^\s()@]+?\.js):(\d+):(\d+)/g);
    for (const [, file, line, column] of frames) {
      const found = position(file, Number(line), Number(column));
      if (found) return found;
    }
  }
}

export function reportClientError(error: unknown, options: { code?: ApplicationErrorCode; path?: string; status?: number; event?: ErrorEvent } = {}) {
  if (typeof window === "undefined") return;
  try {
    const code = options.code ?? classifyError(error);
    const path = errorPath(options.path ?? window.location.pathname);
    if (path === "/api/application-errors") return; // Never report the reporter's own failures.
    const position = code === "javascript_error" ? bundlePosition(error, options.event) : undefined;
    const queue = readQueue();
    if (queue.some((item) => item.code === code && item.path === path && item.bundlePosition === position && item.subject === subject && Date.parse(item.occurredAt) > Date.now() - 60000)) return;
    const eventId = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16));
    saveQueue([...queue, { eventId, code, path, bundlePosition: position, occurredAt: new Date().toISOString(), subject, ...(options.status && options.status >= 400 && options.status <= 599 ? { status: options.status } : {}) }]);
    // Flushed by the provider, after the active user request has completed.
  } catch { /* Reporting must never break the application. */ }
}

export async function flushClientErrors() {
  if (flushing || typeof window === "undefined" || navigator.onLine === false) return;
  const batch = readQueue().slice(0, 10);
  if (!batch.length) return;
  flushing = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("/api/application-errors", {
      method: "POST", headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify({ events: batch }), signal: controller.signal, cache: "no-store",
    });
    if (!response.ok) return;
    const result = await response.json();
    if (result?.ok !== true) return;
    const sent = new Set(batch.map((item) => item.eventId));
    saveQueue(readQueue().filter((item) => !sent.has(item.eventId)));
  } catch { /* Keep the outbox until connectivity / database recovers. */ }
  finally { clearTimeout(timer); flushing = false; }
}
