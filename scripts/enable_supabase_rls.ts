import { db } from '../src/lib/db';

const TABLES_TO_PROTECT = [
  'Customer',
  'Supplier',
  'Product',
  'Invoice',
  'InvoiceItem',
  'InvoiceRevisionAudit',
  'Payment',
  'Purchase',
  'PurchaseItem',
  'SerialNumber',
  'StockMovement',
  'Expense',
  'User',
  'BusinessSettings',
  'InvoiceShareLog',
];

async function enableRowLevelSecurity() {
  console.log('================================================================');
  console.log('🔒 ENABLING SUPABASE ROW LEVEL SECURITY (RLS) ON ALL TABLES');
  console.log('================================================================\n');

  for (const table of TABLES_TO_PROTECT) {
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`✓ Enabled Row Level Security on table "${table}"`);
    } catch (err: any) {
      console.error(`❌ Failed to enable RLS on table "${table}":`, err.message);
    }
  }

  // Verify RLS status from PostgreSQL pg_tables
  const rlsStatus: any = await db.$queryRawUnsafe(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename ASC;
  `);

  console.log('\n--- VERIFIED RLS STATUS ON ALL PUBLIC TABLES ---');
  console.log(JSON.stringify(rlsStatus, null, 2));

  await db.$disconnect();
}

enableRowLevelSecurity().catch((err) => {
  console.error('RLS setup error:', err);
  process.exit(1);
});
