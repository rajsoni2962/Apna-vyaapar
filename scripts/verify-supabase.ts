import { db } from '../src/lib/db';

async function verify() {
  const [customers, suppliers, products, invoices, settings] = await Promise.all([
    db.customer.count(),
    db.supplier.count(),
    db.product.count(),
    db.invoice.count(),
    db.businessSettings.findUnique({ where: { id: 'default' } }),
  ]);

  console.log('--- SUPABASE DATABASE LIVE STATUS ---');
  console.log(`• Company: ${settings?.companyName}`);
  console.log(`• Customers: ${customers}`);
  console.log(`• Suppliers: ${suppliers}`);
  console.log(`• Products: ${products}`);
  console.log(`• Invoices: ${invoices}`);

  // Test customer create
  const testCustomer = await db.customer.create({
    data: {
      name: 'Vercel Supabase Test',
      phone: '9999900000',
    },
  });
  console.log('✓ Successfully created test customer:', testCustomer.id);

  // Clean up
  await db.customer.delete({ where: { id: testCustomer.id } });
  console.log('✓ Successfully cleaned up test customer');

  await db.$disconnect();
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
