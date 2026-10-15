import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const purchase = await db.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
        payments: true,
      },
    });

    if (!purchase) {
      return NextResponse.json({ success: false, error: 'Purchase not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: purchase });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = await request.json();

    if (action === 'cancel') {
      const purchase = await db.purchase.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!purchase) {
        return NextResponse.json({ success: false, error: 'Purchase not found' }, { status: 404 });
      }

      if (purchase.status === 'Cancelled') {
        return NextResponse.json({ success: false, error: 'Purchase is already cancelled' }, { status: 400 });
      }

      const cancelled = await db.$transaction(async (tx) => {
        // 1. Reverse stock
        for (const it of purchase.items) {
          const prod = await tx.product.update({
            where: { id: it.productId },
            data: { currentStock: { decrement: it.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              productId: it.productId,
              type: 'RETURN_SUPPLIER',
              referenceType: 'PURCHASE_CANCELLED',
              referenceId: purchase.id,
              referenceNumber: purchase.supplierInvoiceNumber,
              quantityChange: -it.quantity,
              balanceAfter: prod.currentStock,
              unitPrice: it.rate,
              notes: `Stock reversed upon cancellation of PO ${purchase.purchaseNumber}`,
            },
          });
        }

        // 2. Adjust supplier balance
        if (purchase.balanceDue > 0) {
          await tx.supplier.update({
            where: { id: purchase.supplierId },
            data: { currentBalance: { decrement: purchase.balanceDue } },
          });
        }

        // 3. Mark purchase cancelled
        return await tx.purchase.update({
          where: { id },
          data: { status: 'Cancelled' },
        });
      });

      return NextResponse.json({ success: true, data: cancelled });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
