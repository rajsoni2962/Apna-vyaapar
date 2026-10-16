import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supplier = await db.supplier.findUnique({
      where: { id },
      include: {
        purchases: {
          orderBy: { date: 'desc' },
          include: { items: true },
        },
        payments: {
          orderBy: { date: 'desc' },
        },
        serialNumbers: {
          include: { product: true },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
    }

    // Build timeline ledger for supplier
    const ledgerEntries = [
      ...supplier.purchases.map((po) => ({
        type: 'PURCHASE',
        id: po.id,
        date: po.date,
        reference: po.supplierInvoiceNumber || po.purchaseNumber,
        credit: po.grandTotal, // we owe supplier
        debit: 0,
        balanceChange: po.grandTotal,
        paymentStatus: po.paymentStatus,
        details: po.items.map((i) => i.description || i.productId).join(', '),
      })),
      ...supplier.payments.map((pay) => ({
        type: 'PAYMENT',
        id: pay.id,
        date: pay.date,
        reference: pay.paymentNumber,
        credit: 0,
        debit: pay.amount, // we paid supplier
        balanceChange: -pay.amount,
        paymentStatus: 'Paid',
        details: `Mode: ${pay.paymentMode} ${pay.referenceNumber ? `(Ref: ${pay.referenceNumber})` : ''}`,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = supplier.openingBalance;
    const computedLedger = ledgerEntries.map((entry) => {
      runningBalance += entry.balanceChange;
      return {
        ...entry,
        runningBalance,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        supplier,
        ledger: computedLedger.reverse(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    const body = await request.json();
    const updated = await db.supplier.update({
      where: { id },
      data: {
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        gstin: body.gstin || null,
        state: body.state,
        stateCode: body.stateCode,
        notes: body.notes || null,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    await db.supplier.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
