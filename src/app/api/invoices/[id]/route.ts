import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
        payments: true,
        serialNumbers: true,
        revisions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: invoice });
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
    const body = await request.json();
    const { action, reason, changedBy, updates } = body;

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { items: true, serialNumbers: true, customer: true },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    if (action === 'cancel') {
      if (invoice.status === 'Cancelled') {
        return NextResponse.json({ success: false, error: 'Invoice is already cancelled' }, { status: 400 });
      }

      const cancelled = await db.$transaction(async (tx) => {
        // 1. Restore stock and record reverse stock movement
        for (const it of invoice.items) {
          const prod = await tx.product.update({
            where: { id: it.productId },
            data: { currentStock: { increment: it.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              productId: it.productId,
              type: 'RETURN_CUSTOMER',
              referenceType: 'INVOICE_CANCELLED',
              referenceId: invoice.id,
              referenceNumber: invoice.invoiceNumber,
              quantityChange: it.quantity,
              balanceAfter: prod.currentStock,
              unitPrice: it.rate,
              notes: `Stock restored upon cancellation of Invoice ${invoice.invoiceNumber}`,
            },
          });
        }

        // 2. Restore serial numbers back to 'In Stock'
        for (const sn of invoice.serialNumbers) {
          await tx.serialNumber.update({
            where: { id: sn.id },
            data: {
              status: 'In Stock',
              salesInvoiceId: null,
              customerId: null,
              saleDate: null,
              warrantyStart: null,
              warrantyEnd: null,
            },
          });
        }

        // 3. Adjust customer balance (reverse outstanding)
        if (invoice.balanceDue > 0) {
          await tx.customer.update({
            where: { id: invoice.customerId },
            data: { currentBalance: { decrement: invoice.balanceDue } },
          });
        }

        // 4. Mark invoice cancelled
        const updated = await tx.invoice.update({
          where: { id },
          data: { status: 'Cancelled' },
        });

        // 5. Record cancellation in audit trail
        await tx.invoiceRevisionAudit.create({
          data: {
            invoiceId: id,
            revisionNumber: invoice.revisionNumber,
            action: 'CANCELLED',
            changedBy: changedBy || 'admin',
            changeReason: reason || 'Customer requested invoice cancellation',
            previousSnapshot: JSON.stringify({
              invoiceNumber: invoice.invoiceNumber,
              status: invoice.status,
              grandTotal: invoice.grandTotal,
              balanceDue: invoice.balanceDue,
            }),
            newSnapshot: JSON.stringify({
              invoiceNumber: invoice.invoiceNumber,
              status: 'Cancelled',
            }),
          },
        });

        return updated;
      });

      return NextResponse.json({ success: true, data: cancelled });
    }

    if (action === 'revise' || action === 'correct') {
      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        return NextResponse.json(
          { success: false, error: 'A revision reason is mandatory to modify a finalized invoice.' },
          { status: 400 }
        );
      }

      if (invoice.status === 'Cancelled') {
        return NextResponse.json(
          { success: false, error: 'Cannot revise a cancelled invoice.' },
          { status: 400 }
        );
      }

      const nextRev = (invoice.revisionNumber || 1) + 1;
      const prevSnapshot = JSON.stringify(invoice);

      const revisedInvoice = await db.$transaction(async (tx) => {
        const updateData: any = {
          revisionNumber: nextRev,
          revisionReason: reason.trim(),
        };

        if (updates) {
          if (updates.notes !== undefined) updateData.notes = updates.notes;
          if (updates.terms !== undefined) updateData.terms = updates.terms;
          if (updates.paymentMode !== undefined) updateData.paymentMode = updates.paymentMode;
          if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
          if (updates.customerSnapshot !== undefined) {
            updateData.customerSnapshot = typeof updates.customerSnapshot === 'string'
              ? updates.customerSnapshot
              : JSON.stringify(updates.customerSnapshot);
          }
        }

        const updated = await tx.invoice.update({
          where: { id },
          data: updateData,
        });

        await tx.invoiceRevisionAudit.create({
          data: {
            invoiceId: id,
            revisionNumber: nextRev,
            action: 'REVISED',
            changedBy: changedBy || 'admin',
            changeReason: reason.trim(),
            previousSnapshot: prevSnapshot,
            newSnapshot: JSON.stringify(updated),
          },
        });

        return updated;
      });

      return NextResponse.json({ success: true, data: revisedInvoice });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Explicit revision handler: Disallow silent modifications.
 * Any update must provide an explicit revision reason and audit trail.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { revisionReason, changedBy, ...updates } = body;

    if (!revisionReason || typeof revisionReason !== 'string' || !revisionReason.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Direct silent modification of finalized invoices is prohibited. You must provide a revisionReason for the historical audit trail.',
        },
        { status: 400 }
      );
    }

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { items: true, customer: true },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    const nextRev = (invoice.revisionNumber || 1) + 1;
    const prevSnapshot = JSON.stringify(invoice);

    const revised = await db.$transaction(async (tx) => {
      const updateData: any = {
        revisionNumber: nextRev,
        revisionReason: revisionReason.trim(),
      };

      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.terms !== undefined) updateData.terms = updates.terms;
      if (updates.paymentMode !== undefined) updateData.paymentMode = updates.paymentMode;
      if (updates.customerSnapshot !== undefined) {
        updateData.customerSnapshot = typeof updates.customerSnapshot === 'string'
          ? updates.customerSnapshot
          : JSON.stringify(updates.customerSnapshot);
      }

      const updated = await tx.invoice.update({
        where: { id },
        data: updateData,
      });

      await tx.invoiceRevisionAudit.create({
        data: {
          invoiceId: id,
          revisionNumber: nextRev,
          action: 'REVISED',
          changedBy: changedBy || 'admin',
          changeReason: revisionReason.trim(),
          previousSnapshot: prevSnapshot,
          newSnapshot: JSON.stringify(updated),
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, data: revised });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
