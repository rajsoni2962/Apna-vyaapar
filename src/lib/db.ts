import { PrismaClient } from '@prisma/client';

/**
 * Optimizes the PostgreSQL database URL for serverless environments (e.g. Vercel).
 * If the connection URL uses Supabase Session Mode (:5432) which has a strict limit of 15 connections,
 * this automatically redirects to Transaction Mode (:6543) with PgBouncer enabled and connection_limit=1
 * to prevent FATAL: (EMAXCONNSESSION) max clients reached in session mode.
 */
function getOptimizedDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Auto-rewrite Supabase Session mode pooler (:5432) to Transaction mode pooler (:6543)
  if (url.includes('pooler.supabase.com:5432')) {
    url = url.replace(':5432', ':6543');
  }

  // Ensure pgbouncer and connection_limit are applied for serverless lambda environments
  if (url.includes(':6543') || url.includes('pooler.supabase.com')) {
    const hasParams = url.includes('?');
    if (!url.includes('pgbouncer=true')) {
      url += (hasParams ? '&' : '?') + 'pgbouncer=true';
    }
    if (!url.includes('connection_limit=')) {
      url += '&connection_limit=1';
    }
  }

  return url;
}

const optimizedUrl = getOptimizedDatabaseUrl();
if (optimizedUrl) {
  process.env.DATABASE_URL = optimizedUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: optimizedUrl
      ? {
          db: {
            url: optimizedUrl,
          },
        }
      : undefined,
    log: ['error'],
  });

// Always store on globalThis to prevent connection leaks across serverless function warm starts
globalForPrisma.prisma = db;
