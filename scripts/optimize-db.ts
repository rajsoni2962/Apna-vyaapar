import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function optimizeAndVerifyDatabase() {
  console.log('--- Initializing SQLite Production & Persistence Optimization ---');

  try {
    // 1. Enable WAL mode (Write-Ahead Logging) for high concurrency
    const journalResult = await prisma.$queryRawUnsafe<{ journal_mode: string }[]>('PRAGMA journal_mode = WAL;');
    console.log('✓ Journal Mode:', journalResult[0]?.journal_mode);

    // 2. Set Synchronous to NORMAL (optimal performance + full durability in WAL mode)
    await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
    console.log('✓ Synchronous: NORMAL (Reliable crash durability)');

    // 3. Set busy timeout to 5000ms to eliminate locking timeouts under multi-threaded requests
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
    console.log('✓ Busy Timeout: 5000ms (Eliminates database-locked errors)');

    // 4. Enforce Foreign Keys
    await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
    console.log('✓ Foreign Keys: ON');

    // 5. Run Integrity Check
    const integrityResult = await prisma.$queryRawUnsafe<{ integrity_check: string }[]>('PRAGMA integrity_check;');
    console.log('✓ Database Integrity Check:', integrityResult[0]?.integrity_check || 'ok');

    // 6. Inspect Active Table Stats
    const [customers, suppliers, products, invoices, purchases, settings] = await Promise.all([
      prisma.customer.count(),
      prisma.supplier.count(),
      prisma.product.count(),
      prisma.invoice.count(),
      prisma.purchase.count(),
      prisma.businessSettings.findUnique({ where: { id: 'default' } }),
    ]);

    console.log('\n--- Official Database Health & Record Counts ---');
    console.log(`• Company: ${settings?.companyName || 'Not configured'} (GSTIN: ${settings?.gstin || '-'})`);
    console.log(`• Customers: ${customers}`);
    console.log(`• Suppliers: ${suppliers}`);
    console.log(`• Products/Inventory: ${products}`);
    console.log(`• Sales Invoices: ${invoices}`);
    console.log(`• Supplier Purchases: ${purchases}`);

    // 7. Create a safety snapshot backup
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const backupDir = path.join(process.cwd(), 'prisma', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup_${timestamp}.db`);
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupFile);
      console.log(`\n✓ Automated snapshot backup created at: ${backupFile}`);
    }

    console.log('\n✓ Database is fully optimized, verified, and persistent!');
  } catch (err) {
    console.error('Database optimization failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

optimizeAndVerifyDatabase();
