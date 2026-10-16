import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        invoices: {
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

    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    // Build timeline ledger
    const ledgerEntries = [
      ...customer.invoices.map((inv) => ({
        type: 'INVOICE',
        id: inv.id,
        date: inv.date,
        reference: inv.invoiceNumber,
        debit: inv.grandTotal, // customer owes
        credit: 0,
        balanceChange: inv.grandTotal,
        paymentStatus: inv.paymentStatus,
        details: inv.items.map((i) => i.description || i.productId).join(', '),
      })),
      ...customer.payments.map((pay) => ({
        type: 'PAYMENT',
        id: pay.id,
        date: pay.date,
        reference: pay.paymentNumber,
        debit: 0,
        credit: pay.amount, // customer paid
        balanceChange: -pay.amount,
        paymentStatus: 'Paid',
        details: `Mode: ${pay.paymentMode} ${pay.referenceNumber ? `(Ref: ${pay.referenceNumber})` : ''}`,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = customer.openingBalance;
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
        customer,
        ledger: computedLedger.reverse(), // newest first
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
    const updated = await db.customer.update({
      where: { id },
      data: {
        name: body.name,
        phone: body.phone,
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
    await db.customer.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
