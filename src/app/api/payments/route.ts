import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';
    const customerId = searchParams.get('customerId') || '';
    const supplierId = searchParams.get('supplierId') || '';

    const where: any = {};
    if (type) where.type = type;
    if (customerId) where.customerId = customerId;
    if (supplierId) where.supplierId = supplierId;

    const payments = await db.payment.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        customer: true,
        supplier: true,
        invoice: true,
        purchase: true,
      },
    });

    return NextResponse.json({ success: true, data: payments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type, // 'CUSTOMER_PAYMENT' or 'SUPPLIER_PAYMENT'
      customerId,
      supplierId,
      invoiceId,
      purchaseId,
      amount,
      paymentMode,
      referenceNumber,
      notes,
      date,
    } = body;

    const payAmt = parseFloat(amount);
    if (!payAmt || payAmt <= 0) {
      return NextResponse.json({ success: false, error: 'Valid payment amount is required' }, { status: 400 });
    }

    const payDate = date ? new Date(date) : new Date();

    const payment = await db.$transaction(async (tx) => {
      const payNumber = `PAY-${Date.now().toString().slice(-6)}`;

      const newPayment = await tx.payment.create({
        data: {
          paymentNumber: payNumber,
          date: payDate,
          type: type || (customerId ? 'CUSTOMER_PAYMENT' : 'SUPPLIER_PAYMENT'),
          customerId: customerId || null,
          supplierId: supplierId || null,
          invoiceId: invoiceId || null,
          purchaseId: purchaseId || null,
          amount: payAmt,
          paymentMode: paymentMode || 'Cash',
          referenceNumber: referenceNumber || null,
          notes: notes || null,
        },
      });

      // If customer payment, decrement customer balance
      if (customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: { currentBalance: { decrement: payAmt } },
        });

        if (invoiceId) {
          const inv = await tx.invoice.findUnique({ where: { id: invoiceId } });
          if (inv) {
            const newPaid = inv.paidAmount + payAmt;
            const newBal = Math.max(0, inv.grandTotal - newPaid);
            await tx.invoice.update({
              where: { id: invoiceId },
              data: {
                paidAmount: newPaid,
                balanceDue: newBal,
                paymentStatus: newBal <= 0 ? 'Paid' : 'Partial',
              },
            });
          }
        }
      }

      // If supplier payment, decrement supplier balance
      if (supplierId) {
        await tx.supplier.update({
          where: { id: supplierId },
          data: { currentBalance: { decrement: payAmt } },
        });

        if (purchaseId) {
          const po = await tx.purchase.findUnique({ where: { id: purchaseId } });
          if (po) {
            const newPaid = po.paidAmount + payAmt;
            const newBal = Math.max(0, po.grandTotal - newPaid);
            await tx.purchase.update({
              where: { id: purchaseId },
              data: {
                paidAmount: newPaid,
                balanceDue: newBal,
                paymentStatus: newBal <= 0 ? 'Paid' : 'Partial',
              },
            });
          }
        }
      }

      return newPayment;
    });

    return NextResponse.json({ success: true, data: payment });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
