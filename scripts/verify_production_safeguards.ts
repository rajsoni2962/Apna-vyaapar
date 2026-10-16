import {
  isProductionDatabase,
  isSafeTestDatabase,
  assertSafeForTesting,
  assertSafeForSeed,
  assertSafeForReset,
  getAppEnvironment,
  ProductionDatabaseProtectionError,
} from '../src/lib/db-guard';
import { sanitizeLogString } from '../src/lib/security-logger';
import { db } from '../src/lib/db';

async function runProductionSafeguardVerification() {
  console.log('================================================================');
  console.log('🛡️  PRODUCTION-GRADE DATABASE SAFEGUARDS VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`, details || '');
      failed++;
    }
  }

  // 1. Environment & Fail-Closed Default Testing
  console.log('--- 1. Environment Classification & Fail-Closed Defaults ---');
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAppEnv = process.env.APP_ENV;

  try {
    delete (process.env as Record<string, string | undefined>).NODE_ENV;
    delete process.env.APP_ENV;
    assert(getAppEnvironment() === 'production', 'Unset environment variables strictly default to "production" (fail-closed)');

    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    assert(getAppEnvironment() === 'development', 'Explicit "development" environment resolved correctly');

    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    assert(getAppEnvironment() === 'test', 'Explicit "test" environment resolved correctly');
  } finally {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    if (originalAppEnv) process.env.APP_ENV = originalAppEnv;
  }

  // 2. Production Database Identity & Fingerprint Detection
  console.log('\n--- 2. Database Identity & Production Fingerprint Detection ---');
  const realProdUrl = process.env.DATABASE_URL || 'postgresql://postgres.teqfmeipvxkoflihmwun:Rajsoni0601@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';
  const dummyProdUrl = 'postgresql://postgres:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';
  const dummyRdsUrl = 'postgresql://admin:secret@my-db.c9ak438.rds.amazonaws.com:5432/production_db';
  const dummyNeonUrl = 'postgresql://user:pass@ep-cool-cloud.neon.tech/neondb';
  const safeSqliteUrl = 'file:./prisma/test.db';
  const safeLocalhostTestUrl = 'postgresql://postgres:postgres@localhost:5432/apna_vyaapar_test';
  const unsafeLocalhostProdUrl = 'postgresql://postgres:postgres@localhost:5432/apna_vyaapar_production';

  assert(isProductionDatabase(realProdUrl), 'Live Supabase pooler URL correctly classified as Production');
  assert(isProductionDatabase(dummyProdUrl), 'Supabase cloud host correctly classified as Production');
  assert(isProductionDatabase(dummyRdsUrl), 'AWS RDS cloud host correctly classified as Production');
  assert(isProductionDatabase(dummyNeonUrl), 'Neon cloud host correctly classified as Production');
  assert(isProductionDatabase(''), 'Empty/missing database URL defaults fail-closed to Production');
  assert(!isProductionDatabase(safeSqliteUrl), 'Local SQLite test database file correctly identified as non-production');

  assert(isSafeTestDatabase(safeSqliteUrl), 'SQLite test file recognized as safe test database');
  assert(isSafeTestDatabase(safeLocalhostTestUrl), 'Localhost test database (*_test) recognized as safe test database');
  assert(!isSafeTestDatabase(dummyProdUrl), 'Live Supabase database rejected by isSafeTestDatabase');
  assert(!isSafeTestDatabase(unsafeLocalhostProdUrl), 'Localhost production database rejected by isSafeTestDatabase');

  // 3. Fail-Closed Test Execution Guard
  console.log('\n--- 3. Fail-Closed Test Script Execution Guard ---');
  let testBlocked = false;
  try {
    assertSafeForTesting({ dbUrl: dummyProdUrl, scriptName: 'test-invoice-types' });
  } catch (err: any) {
    if (err instanceof ProductionDatabaseProtectionError) {
      testBlocked = true;
    }
  }
  assert(testBlocked, 'assertSafeForTesting() throws ProductionDatabaseProtectionError when targeting Supabase');

  // 4. Fail-Closed Production Demo-Seed Protection
  console.log('\n--- 4. Fail-Closed Production Demo-Seed Protection ---');
  let seedBlocked = false;
  try {
    assertSafeForSeed({ dbUrl: dummyProdUrl, scriptName: 'prisma/seed.ts' });
  } catch (err: any) {
    if (err instanceof ProductionDatabaseProtectionError) {
      seedBlocked = true;
    }
  }
  assert(seedBlocked, 'assertSafeForSeed() throws ProductionDatabaseProtectionError and blocks demo data seeding');

  // 5. Fail-Closed Destructive Reset Protection
  console.log('\n--- 5. Fail-Closed Destructive Database Reset Protection ---');
  let resetBlocked = false;
  try {
    assertSafeForReset({ dbUrl: dummyProdUrl, scriptName: 'scripts/reset-database-fresh.ts' });
  } catch (err: any) {
    if (err instanceof ProductionDatabaseProtectionError) {
      resetBlocked = true;
    }
  }
  assert(resetBlocked, 'assertSafeForReset() throws ProductionDatabaseProtectionError and blocks table wiping');

  // 6. Credential Sanitization and Audit Redaction
  console.log('\n--- 6. Credential Sanitization and Audit Redaction ---');
  const sensitiveString = 'Error connecting to postgresql://postgres.user123:SuperSecretPass99@aws-0-ap-south-1.pooler.supabase.com:6543/postgres with token Bearer eyJhbGciOiJIUzI1NiJ9.testToken123';
  const sanitized = sanitizeLogString(sensitiveString);
  assert(!sanitized.includes('SuperSecretPass99'), 'Database password scrubbed from security logs');
  assert(sanitized.includes('[REDACTED_PASSWORD]'), 'Redaction placeholder injected for database password');
  assert(!sanitized.includes('testToken123'), 'Authentication token scrubbed from security logs');
  assert(sanitized.includes('[REDACTED_TOKEN]'), 'Redaction placeholder injected for bearer token');

  // 7. Legitimate Business Data Integrity Check
  console.log('\n--- 7. Legitimate Business Data Integrity Check ---');
  const [activeInvoices, settings, userCount] = await Promise.all([
    db.invoice.findMany({ where: { isDeleted: false }, select: { invoiceNumber: true } }),
    db.businessSettings.findUnique({ where: { id: 'default' } }),
    db.user.count(),
  ]);

  const activeInvoiceNumbers = activeInvoices.map((i) => i.invoiceNumber);
  assert(
    activeInvoiceNumbers.includes('AT/2026/2') && activeInvoiceNumbers.includes('AT/2026/3'),
    `Legitimate invoices intact on live database (${activeInvoiceNumbers.join(', ')})`
  );
  assert(settings?.companyName === 'ASHIRWAD TECHNOLOGIES' || settings?.companyName === 'ASHIRWAD TECH', 'Business settings intact and unaltered');
  assert(userCount >= 1, `Admin user accounts preserved: ${userCount}`);

  // Summary
  console.log('\n================================================================');
  console.log(`SAFEGUARD VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runProductionSafeguardVerification()
  .catch((e) => {
    console.error('Fatal safeguard verification error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
