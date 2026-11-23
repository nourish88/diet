"use client";
import { canReportRecovery, ClientErrorSchema, classifyError, errorPath, tracksRecovery, type ApplicationErrorCode, type ClientErrorEvent } from "./application-errors";

const STORAGE_KEY = "application-error-outbox-v1";
const RECOVERY_KEY = "application-error-waiting-for-success-v1";
const MAX_EVENTS = 50;
const memory = new Map<string, ClientErrorEvent[]>();
let subject: string | null = null;
let sessionChangedAt = 0;
let accessToken: string | null = null;
let flushing = false;
let storageWritable = true;

function readQueue(key = STORAGE_KEY): ClientErrorEvent[] {
  if (!storageWritable) return memory.get(key) ?? [];
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (Array.isArray(stored)) return stored.flatMap((item) => {
      const result = ClientErrorSchema.safeParse(item);
      return result.success && Date.parse(result.data.occurredAt) > Date.now() - 7 * 86400000 ? [result.data] : [];
    }).slice(-MAX_EVENTS);
  } catch { storageWritable = false; }
  return memory.get(key) ?? [];
}
function saveQueue(queue: ClientErrorEvent[], key = STORAGE_KEY) {
  const bounded = queue.slice(-MAX_EVENTS);
  memory.set(key, bounded);
  try { localStorage.setItem(key, JSON.stringify(bounded)); } catch { storageWritable = false; }
}
export function setErrorReporterSession(id: string | null, token: string | null) {
  if (id !== subject) sessionChangedAt = Date.now();
  subject = id;
  accessToken = token;
}

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

export function reportClientError(error: unknown, options: { code?: ApplicationErrorCode; path?: string; method?: string; status?: number; event?: ErrorEvent; loginLogToken?: string } = {}) {
  if (typeof window === "undefined") return;
  try {
    const code = options.code ?? classifyError(error);
    const path = errorPath(options.path ?? window.location.pathname);
    if (path === "/api/application-errors") return; // Never report the reporter's own failures.
    const position = code === "javascript_error" ? bundlePosition(error, options.event) : undefined;
    const queue = readQueue();
    if (queue.some((item) => !item.recoveredAt && item.code === code && item.path === path && item.bundlePosition === position && item.subject === subject && item.loginLogToken === options.loginLogToken && Date.parse(item.occurredAt) > Date.now() - 60000)) return;
    const eventId = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16));
    const event = { eventId, code, path, bundlePosition: position, occurredAt: new Date().toISOString(), subject, loginLogToken: options.loginLogToken, ...(options.status && options.status >= 400 && options.status <= 599 ? { status: options.status } : {}) };
    saveQueue([...queue, event]);
    if (subject && canReportRecovery(path, code) && tracksRecovery(path, options.method ?? "")) {
      saveQueue([...readQueue(RECOVERY_KEY), event], RECOVERY_KEY);
    }
    // Flushed by the provider, after the active user request has completed.
  } catch { /* Reporting must never break the application. */ }
}

export function observeRequestSuccess(url: string, method: string, startedAt: number) {
  if (typeof window === "undefined" || !subject || startedAt < sessionChangedAt) return;
  try {
    const path = errorPath(url);
    if (!tracksRecovery(path, method)) return;
    const waiting = readQueue(RECOVERY_KEY);
    const matches = waiting.filter(item => item.path === path && item.subject === subject && Date.parse(item.occurredAt) <= startedAt);
    if (!matches.length) return;
    const ids = new Set(matches.map(item => item.eventId));
    const recoveredAt = new Date().toISOString();
    saveQueue([...readQueue().filter(item => !ids.has(item.eventId)), ...matches.map(item => ({ ...item, recoveredAt }))]);
    saveQueue(waiting.filter(item => !ids.has(item.eventId)), RECOVERY_KEY);
  } catch { /* Reporting must never interfere with a successful request. */ }
}

export async function flushClientErrors() {
  if (flushing || typeof window === "undefined" || navigator.onLine === false) return;
  const batch = readQueue().filter(item => !item.subject || (subject === item.subject && accessToken)).slice(0, 10);
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
    const sent = new Map(batch.map((item) => [item.eventId, item.recoveredAt]));
    saveQueue(readQueue().filter(item => !sent.has(item.eventId) || sent.get(item.eventId) !== item.recoveredAt));
  } catch { /* Keep the outbox until connectivity / database recovers. */ }
  finally { clearTimeout(timer); flushing = false; }
}
