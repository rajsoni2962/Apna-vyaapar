import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, data: { products: [], invoices: [], purchases: [], customers: [], suppliers: [], serialNumbers: [] } });
    }

    const [products, invoices, purchases, customers, suppliers, serialNumbers] = await Promise.all([
      db.product.findMany({
        where: {
          isDeleted: false,
          OR: [
            { name: { contains: q } },
            { brand: { contains: q } },
            { model: { contains: q } },
            { cpu: { contains: q } },
          ],
        },
        take: 5,
      }),
      db.invoice.findMany({
        where: {
          OR: [
            { invoiceNumber: { contains: q } },
            { customer: { name: { contains: q } } },
          ],
        },
        include: { customer: true },
        take: 5,
      }),
      db.purchase.findMany({
        where: {
          OR: [
            { purchaseNumber: { contains: q } },
            { supplierInvoiceNumber: { contains: q } },
            { supplier: { name: { contains: q } } },
          ],
        },
        include: { supplier: true },
        take: 5,
      }),
      db.customer.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
            { email: { contains: q } },
          ],
        },
        take: 5,
      }),
      db.supplier.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
            { gstin: { contains: q } },
          ],
        },
        take: 5,
      }),
      db.serialNumber.findMany({
        where: {
          serialNumber: { contains: q },
        },
        include: { product: true, customer: true, salesInvoice: true },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        products,
        invoices,
        purchases,
        customers,
        suppliers,
        serialNumbers,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
