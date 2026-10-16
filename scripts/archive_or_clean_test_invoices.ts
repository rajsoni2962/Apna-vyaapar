import { db } from '../src/lib/db';

const TARGET_INVOICE_NUMBERS = [
  'TI-572910',
  'IGST-573108',
  'BOS-573296',
  'NGST-573484',
  'EST-573668',
];

const KNOWN_TEST_CUSTOMERS = [
  'Jignesh Patel (Local Gujarat Buyer)',
  'Vikas Sharma (Outstation Buyer)',
];

const KNOWN_TEST_PRODUCT = 'HP EliteBook 840 G6 Test Laptop';

// Test execution timestamp range (around 22:49 UTC on 15 Oct 2026 / 04:19 IST on 16 Oct 2026)
const MIN_TEST_TIMESTAMP = new Date('2026-10-15T22:45:00.000Z').getTime();
const MAX_TEST_TIMESTAMP = new Date('2026-10-15T22:55:00.000Z').getTime();

interface VerificationResult {
  verified: boolean;
  reasons: string[];
}

function verifyTestInvoiceOrigin(inv: any): VerificationResult {
  const reasons: string[] = [];

  // Check 1: Target Invoice Number Pattern
  if (!TARGET_INVOICE_NUMBERS.includes(inv.invoiceNumber)) {
    return { verified: false, reasons: [`Invoice number ${inv.invoiceNumber} not in target list`] };
  }

  // Check 2: Customer Name
  const customerName = inv.customer?.name || '';
  if (!KNOWN_TEST_CUSTOMERS.includes(customerName)) {
    reasons.push(`Customer "${customerName}" is not one of the expected test script customers`);
  }

  // Check 3: Product Name in Items
  const hasTestProduct = inv.items?.some(
    (item: any) =>
      item.productName === KNOWN_TEST_PRODUCT ||
      item.product?.name === KNOWN_TEST_PRODUCT ||
      item.description?.includes('HP EliteBook 840 G6')
  );
  if (!hasTestProduct) {
    reasons.push(`Items do not contain known test product "${KNOWN_TEST_PRODUCT}"`);
  }

  // Check 4: Creation Timestamp Window
  const createdTime = new Date(inv.createdAt).getTime();
  if (createdTime < MIN_TEST_TIMESTAMP || createdTime > MAX_TEST_TIMESTAMP) {
    reasons.push(`Creation timestamp ${inv.createdAt.toISOString()} falls outside the known test execution window`);
  }

  // Check 5: No Real Payments Attached
  if (inv.payments && inv.payments.length > 0) {
    reasons.push(`Invoice has real payment records attached (${inv.payments.length})`);
  }

  return {
    verified: reasons.length === 0,
    reasons,
  };
}

async function main() {
  console.log('================================================================');
  console.log('🔍 VERIFYING AND SOFT-DELETING TEST INVOICES');
  console.log('================================================================\n');

  // 1. Fetch target invoices
  const candidateInvoices = await db.invoice.findMany({
    where: { invoiceNumber: { in: TARGET_INVOICE_NUMBERS } },
    include: {
      customer: true,
      items: { include: { product: true } },
      payments: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${candidateInvoices.length} candidate invoice(s) matching target invoice numbers.\n`);

  const verifiedInvoices: any[] = [];
  const unverifiedInvoices: any[] = [];

  // 2. Perform rigorous forensic verification for each candidate
  for (const inv of candidateInvoices) {
    const check = verifyTestInvoiceOrigin(inv);
    if (check.verified) {
      console.log(`✅ VERIFIED: ${inv.invoiceNumber} (Type: ${inv.invoiceType}, Total: ₹${inv.grandTotal})`);
      console.log(`   - Customer: ${inv.customer.name}`);
      console.log(`   - Product: ${inv.items[0]?.product?.name || inv.items[0]?.productName}`);
      console.log(`   - Created At: ${inv.createdAt.toISOString()}`);
      console.log(`   - Already soft-deleted: ${inv.isDeleted}\n`);
      verifiedInvoices.push(inv);
    } else {
      console.warn(`⚠️ UNVERIFIED: ${inv.invoiceNumber} could not be confirmed as a test record:`);
      for (const r of check.reasons) {
        console.warn(`   - ${r}`);
      }
      console.warn(`   Leaving ${inv.invoiceNumber} UNCHANGED.\n`);
      unverifiedInvoices.push({ inv, reasons: check.reasons });
    }
  }

  // Ensure all 5 target records are present and verified
  if (candidateInvoices.length !== TARGET_INVOICE_NUMBERS.length) {
    const foundNumbers = candidateInvoices.map((i) => i.invoiceNumber);
    const missing = TARGET_INVOICE_NUMBERS.filter((num) => !foundNumbers.includes(num));
    console.warn(`⚠️ Warning: The following expected target numbers were not found in database: ${missing.join(', ')}`);
  }

  if (unverifiedInvoices.length > 0) {
    console.warn(`⚠️ ${unverifiedInvoices.length} invoice(s) failed verification and will NOT be modified.`);
  }

  // 3. Check for legitimate invoices and ensure they will NOT be touched
  const legitimateInvoices = await db.invoice.findMany({
    where: { invoiceNumber: { notIn: TARGET_INVOICE_NUMBERS } },
    select: { id: true, invoiceNumber: true, isDeleted: true },
  });
  console.log(`🛡️ Confirmed: ${legitimateInvoices.length} legitimate invoice(s) will be completely preserved:`);
  for (const leg of legitimateInvoices) {
    console.log(`   - ${leg.invoiceNumber} (isDeleted: ${leg.isDeleted})`);
  }
  console.log('');

  // 4. Execute Soft Delete Workflow for Verified Invoices
  console.log('----------------------------------------------------------------');
  console.log(`Executing soft-delete workflow for ${verifiedInvoices.length} verified test invoice(s)...`);
  console.log('----------------------------------------------------------------\n');

  const now = new Date();
  const deletionReason = 'Archived confirmed test invoice created by scripts/test_invoice_types_and_gst.ts';
  const deletedBy = 'admin';

  for (const inv of verifiedInvoices) {
    const previousSnapshot = JSON.stringify(inv);

    const updated = await db.$transaction(async (tx) => {
      // Soft-delete the invoice record
      const updatedInv = await tx.invoice.update({
        where: { id: inv.id },
        data: {
          isDeleted: true,
          deletedAt: now,
          deletedBy,
          deletionReason,
        },
      });

      // Record in InvoiceRevisionAudit
      await tx.invoiceRevisionAudit.create({
        data: {
          invoiceId: inv.id,
          revisionNumber: inv.revisionNumber || 1,
          action: 'SOFT_DELETED',
          changedBy: deletedBy,
          changeReason: 'Moved to Recently Deleted: verified test record from scripts/test_invoice_types_and_gst.ts',
          diffSummary: JSON.stringify([
            { field: 'Status', oldVal: inv.isDeleted ? 'Recently Deleted' : 'Active', newVal: 'Recently Deleted (7-day recovery)' },
            { field: 'Deletion Reason', oldVal: inv.deletionReason || '-', newVal: deletionReason },
          ]),
          previousSnapshot,
          newSnapshot: JSON.stringify(updatedInv),
        },
      });

      return updatedInv;
    });

    console.log(`✓ Soft-deleted ${updated.invoiceNumber}:`);
    console.log(`   - isDeleted: ${updated.isDeleted}`);
    console.log(`   - deletedAt: ${updated.deletedAt?.toISOString()}`);
    console.log(`   - deletedBy: ${updated.deletedBy}`);
    console.log(`   - deletionReason: ${updated.deletionReason}`);
    console.log(`   - InvoiceRevisionAudit recorded: Action SOFT_DELETED\n`);
  }

  // 5. Final State Verification
  console.log('================================================================');
  console.log('🏁 FINAL POST-EXECUTION VERIFICATION');
  console.log('================================================================\n');

  const activeInvoices = await db.invoice.findMany({
    where: { isDeleted: false },
    select: { invoiceNumber: true, isDeleted: true },
    orderBy: { createdAt: 'asc' },
  });

  const recentlyDeletedInvoices = await db.invoice.findMany({
    where: { isDeleted: true },
    select: { invoiceNumber: true, deletedAt: true, deletionReason: true },
    orderBy: { deletedAt: 'desc' },
  });

  console.log(`Active Invoices in 'All Invoices' (${activeInvoices.length}):`);
  for (const a of activeInvoices) {
    console.log(`   - ${a.invoiceNumber}`);
  }

  console.log(`\nInvoices in 'Recently Deleted' (${recentlyDeletedInvoices.length}):`);
  for (const d of recentlyDeletedInvoices) {
    console.log(`   - ${d.invoiceNumber} | Deleted At: ${d.deletedAt?.toISOString()} | Reason: ${d.deletionReason}`);
  }

  console.log('\n✅ Operation completed successfully.');
}

main()
  .catch((err) => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
