import { PrismaClient } from '@prisma/client'
import { after } from 'next/server'
import { runtimeDatabaseUrl, isTransientDatabaseError } from './database-connection'
import { persistApplicationErrors, databaseErrorCode, type ServerErrorInput } from './application-error-server'

const createPrisma = () => {
  const base = new PrismaClient({
    datasourceUrl: runtimeDatabaseUrl(process.env.DATABASE_URL),
    log: [{ level: 'error', emit: 'event' }, ...(process.env.NODE_ENV === 'production' ? [] : [{ level: 'warn' as const, emit: 'stdout' as const }])],
  });
  let recording = false;
  let scheduled = false;
  let lastEngineError = 0;
  const pending = new Map<string, ServerErrorInput>();
  const flush = () => {
    if (scheduled || !pending.size) return;
    scheduled = true;
    const write = async () => {
      recording = true;
      const batch = [...pending.entries()].slice(0, 20);
      try {
        if (await persistApplicationErrors(base, batch.map(([, value]) => value))) {
          for (const [key] of batch) pending.delete(key);
        }
      } finally { recording = false; scheduled = false; }
    };
    try { after(write); } catch { void write(); }
  };
  const record = (error: unknown, path: string) => {
    const code = databaseErrorCode(error);
    const occurredAt = new Date();
    const key = `${code}:${path}:${Math.floor(occurredAt.getTime() / 60000)}`;
    pending.set(key, { code, path, occurredAt });
    if (pending.size > 100) pending.delete(pending.keys().next().value!);
    flush();
  };
  base.$on('error', (event) => {
    if (recording) return;
    // Engine diagnostics may occur without a rejected application query.
    console.error('prisma:error', event.message);
    if (Date.now() - lastEngineError < 60000) return;
    lastEngineError = Date.now();
    record(new Error(event.message), '/database');
  });
  const readOperations = new Set(['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy']);
  const extended = base.$extends({
    query: { $allModels: { async $allOperations({ model, operation, args, query }) {
      if (model === 'ApplicationError') return query(args);
      try {
        const result = await query(args);
        flush();
        return result;
      } catch (error) {
        record(error, `/database/${model}/${operation}`);
        // A closed idle connection can recover on a fresh read. Never replay writes.
        if (readOperations.has(operation) && isTransientDatabaseError(error)) {
          const result = await query(args);
          flush();
          return result;
        }
        throw error;
      }
    } } },
  });
  // Query-only extension preserves the existing client/transaction contract.
  return extended as unknown as PrismaClient;
};

type AppPrisma = ReturnType<typeof createPrisma>;
const globalForPrisma = globalThis as unknown as { prisma?: AppPrisma };
export const prisma = globalForPrisma.prisma ?? createPrisma();
globalForPrisma.prisma = prisma;

export default prisma
