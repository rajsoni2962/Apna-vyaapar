import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table') || 'all';

    if (table === 'all') {
      const [settings, products, customers, suppliers, serialNumbers, invoices, purchases, payments, movements, expenses] = await Promise.all([
        db.businessSettings.findMany(),
        db.product.findMany(),
        db.customer.findMany(),
        db.supplier.findMany(),
        db.serialNumber.findMany(),
        db.invoice.findMany({ include: { items: true } }),
        db.purchase.findMany({ include: { items: true } }),
        db.payment.findMany(),
        db.stockMovement.findMany(),
        db.expense.findMany(),
      ]);

      const backup = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        business: settings[0]?.companyName || 'ASHIRWAD TECH',
        tables: {
          settings,
          products,
          customers,
          suppliers,
          serialNumbers,
          invoices,
          purchases,
          payments,
          movements,
          expenses,
        },
      };

      return new Response(JSON.stringify(backup, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="ashirwad_tech_backup_${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }

    if (table === 'products') {
      const products = await db.product.findMany();
      return NextResponse.json({ success: true, data: products });
    }

    if (table === 'customers') {
      const customers = await db.customer.findMany();
      return NextResponse.json({ success: true, data: customers });
    }

    if (table === 'suppliers') {
      const suppliers = await db.supplier.findMany();
      return NextResponse.json({ success: true, data: suppliers });
    }

    if (table === 'invoices') {
      const invoices = await db.invoice.findMany({ include: { items: true, customer: true } });
      return NextResponse.json({ success: true, data: invoices });
    }

    return NextResponse.json({ success: false, error: 'Unknown table' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
