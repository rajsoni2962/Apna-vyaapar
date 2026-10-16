import { db } from '../src/lib/db';

async function migrate() {
  console.log('Running DDL migrations for BusinessProfile, Multi-User, and Invoice Designer...');

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BusinessProfile" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "companyName" TEXT NOT NULL DEFAULT 'ASHIRWAD TECHNOLOGIES',
      "tagline" TEXT DEFAULT 'Beyond tech limits',
      "address" TEXT NOT NULL DEFAULT 'A/1, 902, Ashraya 10, GST compound, New Ranip, Ahmedabad 382470.',
      "phone" TEXT NOT NULL DEFAULT '9662278994',
      "email" TEXT DEFAULT 'rajsoni2962@gmail.com',
      "gstin" TEXT DEFAULT '',
      "state" TEXT NOT NULL DEFAULT 'Gujarat',
      "stateCode" TEXT NOT NULL DEFAULT '24',
      "bankName" TEXT DEFAULT 'Kotak Mahindra Bank',
      "accountNumber" TEXT DEFAULT '5947557983',
      "ifscCode" TEXT DEFAULT 'KKBK0000879',
      "upiId" TEXT DEFAULT 'rajsoni2962-2@okaxis',
      "invoicePrefix" TEXT NOT NULL DEFAULT 'AT/2026/',
      "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1,
      "purchasePrefix" TEXT NOT NULL DEFAULT 'PO/2026/',
      "nextPurchaseNumber" INTEGER NOT NULL DEFAULT 1,
      "logoUrl" TEXT DEFAULT '/brand/logo.png',
      "signatureUrl" TEXT DEFAULT '/brand/signature.jpeg',
      "terms" TEXT,
      "footer" TEXT,
      "authorizedSignatory" TEXT DEFAULT 'Ashirwad Technologies\nRaj Soni\nProprietor',
      "invoiceDesign" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.$executeRawUnsafe(`
    ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "invoiceDesign" TEXT;
  `);

  await db.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessProfileId" TEXT;
  `);

  await db.$executeRawUnsafe(`
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "businessProfileId" TEXT;
  `);

  // Create default business profile from existing business settings if none exists
  const count = await db.$queryRawUnsafe<any[]>(`SELECT count(*) FROM "BusinessProfile";`);
  const profileCount = parseInt(count[0]?.count || '0');

  if (profileCount === 0) {
    const settings = await db.businessSettings.findUnique({ where: { id: 'default' } });
    if (settings) {
      await db.$executeRawUnsafe(`
        INSERT INTO "BusinessProfile" (
          "id", "name", "isDefault", "isActive", "companyName", "tagline", "address",
          "phone", "email", "gstin", "state", "stateCode", "bankName", "accountNumber",
          "ifscCode", "upiId", "invoicePrefix", "nextInvoiceNumber", "purchasePrefix",
          "nextPurchaseNumber", "logoUrl", "signatureUrl", "terms", "footer", "authorizedSignatory"
        ) VALUES (
          'default', 'Head Office - Ahmedabad', true, true, $1, $2, $3,
          $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21
        );
      `,
        settings.companyName,
        settings.tagline,
        settings.address,
        settings.phone,
        settings.email,
        settings.gstin,
        settings.state,
        settings.stateCode,
        settings.bankName,
        settings.accountNumber,
        settings.ifscCode,
        settings.upiId,
        settings.invoicePrefix,
        settings.nextInvoiceNumber,
        settings.purchasePrefix,
        settings.nextPurchaseNumber,
        settings.logoUrl,
        settings.signatureUrl,
        settings.terms,
        settings.footer,
        settings.authorizedSignatory
      );
      console.log('Seeded default BusinessProfile from BusinessSettings');
    }
  }

  console.log('Migration successfully applied!');
}

migrate()
  .catch(console.error)
  .finally(() => db.$disconnect());
