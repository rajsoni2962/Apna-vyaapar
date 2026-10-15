import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function importSnapshot() {
  console.log('--- Starting Migration: Importing Snapshot into PostgreSQL ---');

  const snapshotPath = path.join(process.cwd(), 'prisma', 'sqlite_data_snapshot.json');
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Snapshot file not found at ${snapshotPath}`);
  }

  const rawData = fs.readFileSync(snapshotPath, 'utf-8');
  const data = JSON.parse(rawData);

  // 1. BusinessSettings
  if (data.businessSettings?.length) {
    for (const item of data.businessSettings) {
      await prisma.businessSettings.upsert({
        where: { id: item.id },
        update: { ...item, updatedAt: new Date(item.updatedAt) },
        create: { ...item, updatedAt: new Date(item.updatedAt) },
      });
    }
    console.log(`✓ Imported ${data.businessSettings.length} BusinessSettings`);
  }

  // 2. Users
  if (data.users?.length) {
    for (const item of data.users) {
      await prisma.user.upsert({
        where: { id: item.id },
        update: {
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
        create: {
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
      });
    }
    console.log(`✓ Imported ${data.users.length} Users`);
  }

  // 3. Customers
  if (data.customers?.length) {
    for (const item of data.customers) {
      await prisma.customer.upsert({
        where: { id: item.id },
        update: {
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
        create: {
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
      });
    }
    console.log(`✓ Imported ${data.customers.length} Customers`);
  }

  // 4. Suppliers
  if (data.suppliers?.length) {
    for (const item of data.suppliers) {
      await prisma.supplier.upsert({
        where: { id: item.id },
        update: {
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
        create: {
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
      });
    }
    console.log(`✓ Imported ${data.suppliers.length} Suppliers`);
  }

  // 5. Products
  if (data.products?.length) {
    for (const item of data.products) {
      await prisma.product.upsert({
        where: { id: item.id },
        update: {
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
        create: {
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
      });
    }
    console.log(`✓ Imported ${data.products.length} Products`);
  }

  // 6. Purchases & Purchase Items
  if (data.purchases?.length) {
    for (const item of data.purchases) {
      await prisma.purchase.upsert({
        where: { id: item.id },
        update: {
          ...item,
          date: new Date(item.date),
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
        create: {
          ...item,
          date: new Date(item.date),
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
      });
    }
    console.log(`✓ Imported ${data.purchases.length} Purchases`);
  }

  if (data.purchaseItems?.length) {
    for (const item of data.purchaseItems) {
      await prisma.purchaseItem.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
    console.log(`✓ Imported ${data.purchaseItems.length} Purchase Items`);
  }

  // 7. Invoices & Invoice Items & Revisions
  if (data.invoices?.length) {
    for (const item of data.invoices) {
      await prisma.invoice.upsert({
        where: { id: item.id },
        update: {
          ...item,
          date: new Date(item.date),
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
          whatsappSharedAt: item.whatsappSharedAt ? new Date(item.whatsappSharedAt) : null,
          finalizedAt: item.finalizedAt ? new Date(item.finalizedAt) : null,
          pdfGeneratedAt: item.pdfGeneratedAt ? new Date(item.pdfGeneratedAt) : null,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
        create: {
          ...item,
          date: new Date(item.date),
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
          whatsappSharedAt: item.whatsappSharedAt ? new Date(item.whatsappSharedAt) : null,
          finalizedAt: item.finalizedAt ? new Date(item.finalizedAt) : null,
          pdfGeneratedAt: item.pdfGeneratedAt ? new Date(item.pdfGeneratedAt) : null,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
      });
    }
    console.log(`✓ Imported ${data.invoices.length} Invoices`);
  }

  if (data.invoiceItems?.length) {
    for (const item of data.invoiceItems) {
      await prisma.invoiceItem.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    }
    console.log(`✓ Imported ${data.invoiceItems.length} Invoice Items`);
  }

  if (data.invoiceRevisions?.length) {
    for (const item of data.invoiceRevisions) {
      await prisma.invoiceRevisionAudit.upsert({
        where: { id: item.id },
        update: {
          ...item,
          createdAt: new Date(item.createdAt),
        },
        create: {
          ...item,
          createdAt: new Date(item.createdAt),
        },
      });
    }
    console.log(`✓ Imported ${data.invoiceRevisions.length} Invoice Revision Audits`);
  }

  // 8. Serial Numbers
  if (data.serialNumbers?.length) {
    for (const item of data.serialNumbers) {
      await prisma.serialNumber.upsert({
        where: { id: item.id },
        update: {
          ...item,
          purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : null,
          saleDate: item.saleDate ? new Date(item.saleDate) : null,
          warrantyStart: item.warrantyStart ? new Date(item.warrantyStart) : null,
          warrantyEnd: item.warrantyEnd ? new Date(item.warrantyEnd) : null,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
        create: {
          ...item,
          purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : null,
          saleDate: item.saleDate ? new Date(item.saleDate) : null,
          warrantyStart: item.warrantyStart ? new Date(item.warrantyStart) : null,
          warrantyEnd: item.warrantyEnd ? new Date(item.warrantyEnd) : null,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
      });
    }
    console.log(`✓ Imported ${data.serialNumbers.length} Serial Numbers`);
  }

  // 9. Payments
  if (data.payments?.length) {
    for (const item of data.payments) {
      await prisma.payment.upsert({
        where: { id: item.id },
        update: {
          ...item,
          date: new Date(item.date),
          createdAt: new Date(item.createdAt),
        },
        create: {
          ...item,
          date: new Date(item.date),
          createdAt: new Date(item.createdAt),
        },
      });
    }
    console.log(`✓ Imported ${data.payments.length} Payments`);
  }

  // 10. Stock Movements
  if (data.stockMovements?.length) {
    for (const item of data.stockMovements) {
      await prisma.stockMovement.upsert({
        where: { id: item.id },
        update: {
          ...item,
          date: new Date(item.date),
          createdAt: new Date(item.createdAt),
        },
        create: {
          ...item,
          date: new Date(item.date),
          createdAt: new Date(item.createdAt),
        },
      });
    }
    console.log(`✓ Imported ${data.stockMovements.length} Stock Movements`);
  }

  // 11. Expenses
  if (data.expenses?.length) {
    for (const item of data.expenses) {
      await prisma.expense.upsert({
        where: { id: item.id },
        update: {
          ...item,
          date: new Date(item.date),
          createdAt: new Date(item.createdAt),
        },
        create: {
          ...item,
          date: new Date(item.date),
          createdAt: new Date(item.createdAt),
        },
      });
    }
    console.log(`✓ Imported ${data.expenses.length} Expenses`);
  }

  // 12. Share logs
  if (data.invoiceShareLogs?.length) {
    for (const item of data.invoiceShareLogs) {
      await prisma.invoiceShareLog.upsert({
        where: { id: item.id },
        update: {
          ...item,
          sharedAt: new Date(item.sharedAt),
        },
        create: {
          ...item,
          sharedAt: new Date(item.sharedAt),
        },
      });
    }
    console.log(`✓ Imported ${data.invoiceShareLogs.length} Invoice Share Logs`);
  }

  console.log('\n--- Migration Completed Successfully! All records migrated to PostgreSQL ---');
  await prisma.$disconnect();
}

importSnapshot().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
