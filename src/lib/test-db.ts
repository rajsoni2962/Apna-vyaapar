import { PrismaClient } from '@prisma/client';
import { assertSafeForTesting, isSafeTestDatabase, isProductionDatabase, ProductionDatabaseProtectionError } from './db-guard';
import { logSecurityEvent } from './security-logger';

/**
 * Detects whether the current process is executing an automated test,
 * benchmark, or test verification script.
 */
export function isTestContext(): boolean {
  if (process.env.NODE_ENV === 'test' || process.env.APP_ENV === 'test') {
    return true;
  }
  if (process.env.RUNNING_TEST === 'true' || process.env.IS_TEST_SUITE === 'true') {
    return true;
  }
  const cmd = process.argv.join(' ').toLowerCase();
  if (cmd.includes('test') || cmd.includes('jest') || cmd.includes('vitest') || cmd.includes('verify_')) {
    return true;
  }
  return false;
}

/**
 * Returns a verified, isolated test database URL.
 * Throws a fatal security error if TEST_DATABASE_URL points to a production database.
 */
export function getTestDatabaseUrl(): string {
  const testUrl = process.env.TEST_DATABASE_URL || '';

  if (testUrl) {
    if (isProductionDatabase(testUrl)) {
      const msg = 'CRITICAL CONFIG ERROR: TEST_DATABASE_URL points to a production database! Tests are strictly prohibited from using production database credentials.';
      logSecurityEvent({
        type: 'BLOCKED_PRODUCTION_TEST',
        message: msg,
        databaseHost: testUrl,
        environment: 'test',
        source: 'getTestDatabaseUrl',
      });
      throw new ProductionDatabaseProtectionError(msg);
    }
    return testUrl;
  }

  // Fail-closed default: if TEST_DATABASE_URL is not set, throw to prevent falling back to DATABASE_URL
  throw new ProductionDatabaseProtectionError(
    'No safe test database configured. Please set TEST_DATABASE_URL to an isolated test database (e.g. postgresql://postgres:postgres@localhost:5432/apna_vyaapar_test).'
  );
}

let testPrismaInstance: PrismaClient | null = null;

/**
 * Factory for creating an isolated PrismaClient for automated tests.
 * Guarantees that the client will NEVER connect to a production database.
 */
export function getTestDb(): PrismaClient {
  if (testPrismaInstance) return testPrismaInstance;

  const testDbUrl = getTestDatabaseUrl();
  assertSafeForTesting({ dbUrl: testDbUrl, scriptName: 'getTestDb' });

  testPrismaInstance = new PrismaClient({
    datasources: {
      db: {
        url: testDbUrl,
      },
    },
    log: ['error'],
  });

  return testPrismaInstance;
}
