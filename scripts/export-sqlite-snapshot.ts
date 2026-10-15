import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function exportSnapshot() {
  console.log('Exporting all data from local SQLite database...');

  const businessSettings = await prisma.businessSettings.findMany();
  const customers = await prisma.customer.findMany();
  const suppliers = await prisma.supplier.findMany();
  const products = await prisma.product.findMany();
  const serialNumbers = await prisma.serialNumber.findMany();
  const invoices = await prisma.invoice.findMany();
  const invoiceItems = await prisma.invoiceItem.findMany();
  const invoiceRevisions = await prisma.invoiceRevisionAudit.findMany();
  const purchases = await prisma.purchase.findMany();
  const purchaseItems = await prisma.purchaseItem.findMany();
  const payments = await prisma.payment.findMany();
  const stockMovements = await prisma.stockMovement.findMany();
  const expenses = await prisma.expense.findMany();
  const users = await prisma.user.findMany();
  const invoiceShareLogs = await prisma.invoiceShareLog.findMany();

  const snapshot = {
    businessSettings,
    customers,
    suppliers,
    products,
    serialNumbers,
    invoices,
    invoiceItems,
    invoiceRevisions,
    purchases,
    purchaseItems,
    payments,
    stockMovements,
    expenses,
    users,
    invoiceShareLogs,
  };

  const outputPath = path.join(process.cwd(), 'prisma', 'sqlite_data_snapshot.json');
  fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2), 'utf-8');

  console.log(`✓ Data successfully exported to: ${outputPath}`);
  console.log(`• Business Settings: ${businessSettings.length}`);
  console.log(`• Customers: ${customers.length}`);
  console.log(`• Suppliers: ${suppliers.length}`);
  console.log(`• Products: ${products.length}`);
  console.log(`• Serial Numbers: ${serialNumbers.length}`);
  console.log(`• Invoices: ${invoices.length}`);
  console.log(`• Invoice Items: ${invoiceItems.length}`);
  console.log(`• Purchases: ${purchases.length}`);
  console.log(`• Payments: ${payments.length}`);
  console.log(`• Stock Movements: ${stockMovements.length}`);
  console.log(`• Expenses: ${expenses.length}`);
  console.log(`• Users: ${users.length}`);

  await prisma.$disconnect();
}

exportSnapshot().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
