# Production-Grade Database Safeguards & Safe Operations Guide
**Ashirwad Technologies Billing & Inventory Management System**

---

## 1. Executive Summary & Safeguard Architecture

To protect live business data (customers, products, invoices, stock movements, and financial audit trails) from accidental contamination, modification, or erasure by automated tests, development scripts, seed scripts, or CI/CD pipelines, Ashirwad Technologies implements an enterprise-grade, **multi-layered fail-closed defense system**.

### The Core Principle: Fail-Closed Security
- **No Reliance on Manual Flags:** Safeguards do not simply trust an environment variable like `IS_PROD=false`.
- **Database Identity Verification:** Every database connection URL is fingerprinted against known cloud providers (Supabase poolers, AWS RDS, Neon, Railway, Render, etc.) and project references (e.g., `teqfmeipvxkoflihmwun`).
- **Fail-Closed Defaults:** If `APP_ENV` or `NODE_ENV` is missing, undefined, or ambiguous, the system **unconditionally defaults to `"production"`**.
- **Zero Production Test Writes:** Any test script, seed script, or reset utility targeting a production database is immediately halted with a `ProductionDatabaseProtectionError` before a single byte can be written.

---

## 2. Multi-Layer Defense Matrix

| Layer | Mechanism | File Location | Protection Behavior |
| :--- | :--- | :--- | :--- |
| **Layer 1: Environment Classification** | `getAppEnvironment()` | `src/lib/db-guard.ts` | Resolves environment strictly. Defaults to `'production'` if unset or invalid. |
| **Layer 2: Database Fingerprinting** | `isProductionDatabase()` | `src/lib/db-guard.ts` | Inspects connection strings for cloud patterns (`supabase.com`, `aws-0-ap-south-1...`, `rds...`, `neon...`). Rejects any remote host as production. |
| **Layer 3: Pre-Flight Script Guards** | `assertSafeForTesting()`, `assertSafeForSeed()`, `assertSafeForReset()` | `src/lib/db-guard.ts` | Script-level assertions that throw `ProductionDatabaseProtectionError` before any script logic begins. |
| **Layer 4: Prisma Client Runtime Interceptor** | Prisma Client `$extends` Query Hook | `src/lib/db.ts` | Intercepts all database write mutations (`create`, `createMany`, `update`, `updateMany`, `delete`, `deleteMany`, `upsert`, `executeRaw`) at the ORM layer. Throws runtime exception if test context is detected against a production database. |
| **Layer 5: Database Isolation** | `getTestDb()` & `TEST_DATABASE_URL` | `src/lib/test-db.ts` | All automated tests must use a dedicated, isolated test database (`TEST_DATABASE_URL` or local SQLite/Postgres container). Tests never connect to the primary database. |
| **Layer 6: Row Level Security (RLS)** | Supabase PostgreSQL Policies | `scripts/enable_supabase_rls.ts` | RLS is enabled across all 15 public tables, preventing unauthorized anonymous or public PostgREST queries from reading or modifying business data. |
| **Layer 7: CI/CD Secret Isolation** | GitHub Actions Pipeline | `.github/workflows/ci.yml` | CI runs against an isolated ephemeral `postgres:16-alpine` service container. Production database secrets are strictly excluded from CI runner environments. |
| **Layer 8: Credential-Scrubbed Audit Logging** | `logSecurityEvent()` & `sanitizeLogString()` | `src/lib/security-logger.ts` | All blocked attempts and sensitive operations are logged to `prisma/logs/security-audit.log`. Passwords and authorization tokens are automatically redacted (`[REDACTED_PASSWORD]`, `[REDACTED_TOKEN]`). |

---

## 3. Row Level Security (RLS) Status

All 15 tables in the Ashirwad Technologies database have Supabase Row Level Security enabled:

1. `Customer` - `rowsecurity: true`
2. `Supplier` - `rowsecurity: true`
3. `Product` - `rowsecurity: true`
4. `Invoice` - `rowsecurity: true`
5. `InvoiceItem` - `rowsecurity: true`
6. `InvoiceRevisionAudit` - `rowsecurity: true`
7. `Payment` - `rowsecurity: true`
8. `Purchase` - `rowsecurity: true`
9. `PurchaseItem` - `rowsecurity: true`
10. `SerialNumber` - `rowsecurity: true`
11. `StockMovement` - `rowsecurity: true`
12. `Expense` - `rowsecurity: true`
13. `User` - `rowsecurity: true`
14. `BusinessSettings` - `rowsecurity: true`
15. `InvoiceShareLog` - `rowsecurity: true`

---

## 4. Safe Commands Reference

### A. Development (Local App Execution)
To run the local Next.js development server:
```bash
npm run dev
```
*Note: In development, real administrative actions taken through the authenticated web UI are allowed, but automated test scripts and demo seeds remain guarded.*

### B. Running Automated Tests & Safeguard Verification
To run the safeguards verification test suite:
```bash
npm test
# or
npm run test:safeguards
```
To run an automated test script against a dedicated test database:
```bash
# Set TEST_DATABASE_URL to an isolated test database
set TEST_DATABASE_URL=file:./prisma/test.db
set APP_ENV=test
npx tsx scripts/test_invoice_types_and_gst.ts
```

### C. Safe Database Seeding (Development Only)
Demo seeding is **strictly blocked** on production databases. To seed a local development or test database:
```bash
# 1. Point to your local development database
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/apna_vyaapar_dev
set APP_ENV=development

# 2. Run the seed script
npx tsx prisma/seed.ts
```
*If executed against the live Supabase database, `prisma/seed.ts` immediately aborts with code 1 and writes an audit log.*

### D. Safe Database Migrations
When updating the database schema:
```bash
# Validate and generate Prisma client
npx prisma generate

# For development environments:
npx prisma migrate dev

# For production deployment:
npx prisma migrate deploy
```

### E. CI/CD Pipeline Execution
The GitHub Actions workflow (`.github/workflows/ci.yml`) automatically executes on push and pull request to `main`:
- Provisions an ephemeral `postgres:16-alpine` service container.
- Sets `DATABASE_URL` and `TEST_DATABASE_URL` to `postgresql://postgres:postgres@localhost:5432/apna_vyaapar_test`.
- Runs schema push, safeguard verification suite, and production build.
- **Has zero access to production credentials or Supabase secrets.**

---

## 5. Security Audit Log Format

Rejected attempts and security events are recorded in `prisma/logs/security-audit.log` in structured JSON format with complete credential redaction:

```json
{
  "timestamp": "2026-10-16T06:38:17.521Z",
  "type": "BLOCKED_PRODUCTION_SEED",
  "message": "CRITICAL SECURITY ABORT: Demo-data seeding is strictly prohibited on production database! Seeding would insert synthetic records into live business data.",
  "environment": "production",
  "databaseHost": "postgresql://postgres.teqfmeipvxkoflihmwun:[REDACTED_PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1",
  "source": "prisma/seed.ts"
}
```

---

## 6. Verification Evidence

The automated verification suite (`scripts/verify_production_safeguards.ts`) runs 23 exhaustive assertions across 7 categories:

```text
================================================================
🛡️  PRODUCTION-GRADE DATABASE SAFEGUARDS VERIFICATION SUITE
================================================================

--- 1. Environment Classification & Fail-Closed Defaults ---
✅ PASS: Unset environment variables strictly default to "production" (fail-closed)
✅ PASS: Explicit "development" environment resolved correctly
✅ PASS: Explicit "test" environment resolved correctly

--- 2. Database Identity & Production Fingerprint Detection ---
✅ PASS: Live Supabase pooler URL correctly classified as Production
✅ PASS: Supabase cloud host correctly classified as Production
✅ PASS: AWS RDS cloud host correctly classified as Production
✅ PASS: Neon cloud host correctly classified as Production
✅ PASS: Empty/missing database URL defaults fail-closed to Production
✅ PASS: Local SQLite test database file correctly identified as non-production
✅ PASS: SQLite test file recognized as safe test database
✅ PASS: Localhost test database (*_test) recognized as safe test database
✅ PASS: Live Supabase database rejected by isSafeTestDatabase
✅ PASS: Localhost production database rejected by isSafeTestDatabase

--- 3. Fail-Closed Test Script Execution Guard ---
[SECURITY AUDIT] [BLOCKED_PRODUCTION_TEST] CRITICAL SECURITY ABORT: test-invoice-types attempted to run against a live/production database!
✅ PASS: assertSafeForTesting() throws ProductionDatabaseProtectionError when targeting Supabase

--- 4. Fail-Closed Production Demo-Seed Protection ---
[SECURITY AUDIT] [BLOCKED_PRODUCTION_SEED] CRITICAL SECURITY ABORT: Demo-data seeding is strictly prohibited on production database!
✅ PASS: assertSafeForSeed() throws ProductionDatabaseProtectionError and blocks demo data seeding

--- 5. Fail-Closed Destructive Database Reset Protection ---
[SECURITY AUDIT] [BLOCKED_PRODUCTION_WRITE] CRITICAL SECURITY ABORT: Destructive database reset is strictly prohibited on production database!
✅ PASS: assertSafeForReset() throws ProductionDatabaseProtectionError and blocks table wiping

--- 6. Credential Sanitization and Audit Redaction ---
✅ PASS: Database password scrubbed from security logs
✅ PASS: Redaction placeholder injected for database password
✅ PASS: Authentication token scrubbed from security logs
✅ PASS: Redaction placeholder injected for bearer token

--- 7. Legitimate Business Data Integrity Check ---
✅ PASS: Legitimate invoices intact on live database (AT/2026/2, AT/2026/3)
✅ PASS: Business settings intact and unaltered
✅ PASS: Admin user accounts preserved: 1

================================================================
SAFEGUARD VERIFICATION RESULTS: 23 PASSED, 0 FAILED
================================================================
```
