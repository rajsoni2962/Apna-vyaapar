import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function resetAndSeed() {
  console.log('====================================================');
  console.log('        ASHIRWAD TECHNOLOGIES - DATA RESET          ');
  console.log('====================================================');

  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  const backupDir = path.join(process.cwd(), 'prisma', 'backups');

  // Step 1: Safety Backup
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `pre_reset_backup_${timestamp}.db`);
    fs.copyFileSync(dbPath, backupFile);
    console.log(`\n[1/4] Safety backup saved to: ${backupFile}`);
  }

  // Step 2: Clean all tables in relational dependency order
  console.log('\n[2/4] Wiping existing database records...');
  await prisma.$transaction([
    prisma.stockMovement.deleteMany(),
    prisma.serialNumber.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.purchaseItem.deleteMany(),
    prisma.purchase.deleteMany(),
    prisma.product.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.user.deleteMany(),
    prisma.businessSettings.deleteMany(),
  ]);
  console.log('✓ All existing records cleared successfully.');

  // Step 3: Run Seed
  console.log('\n[3/4] Re-seeding official Ashirwad Technologies starter data...');
  await prisma.$disconnect();

  execSync('npx tsx prisma/seed.ts', { stdio: 'inherit', cwd: process.cwd() });

  // Step 4: Re-connect and optimize SQLite (WAL mode, timeouts)
  console.log('\n[4/4] Optimizing database with WAL mode and crash durability...');
  const freshPrisma = new PrismaClient();
  await freshPrisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
  await freshPrisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
  await freshPrisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
  await freshPrisma.$queryRawUnsafe('PRAGMA foreign_keys = ON;');

  const [customers, suppliers, products, invoices, purchases] = await Promise.all([
    freshPrisma.customer.count(),
    freshPrisma.supplier.count(),
    freshPrisma.product.count(),
    freshPrisma.invoice.count(),
    freshPrisma.purchase.count(),
  ]);

  console.log('\n====================================================');
  console.log('           DATABASE RESET COMPLETE & FRESH          ');
  console.log('====================================================');
  console.log(`• Customers: ${customers}`);
  console.log(`• Suppliers: ${suppliers}`);
  console.log(`• Products/Inventory: ${products}`);
  console.log(`• Sales Invoices: ${invoices}`);
  console.log(`• Supplier Purchases: ${purchases}`);
  console.log('====================================================\n');

  await freshPrisma.$disconnect();
}

resetAndSeed().catch((err) => {
  console.error('Reset error:', err);
  process.exit(1);
});
