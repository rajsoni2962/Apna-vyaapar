import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
        serialNumbers: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    if (!invoice.isDeleted) {
      return NextResponse.json(
        { success: false, error: 'Only invoices moved to Recently Deleted can be permanently purged.' },
        { status: 400 }
      );
    }

    // Permanent delete within transaction
    await db.$transaction(async (tx) => {
      // Clean up linked logs, items, and audit entries
      await tx.invoiceShareLog.deleteMany({ where: { invoiceId: id } });
      await tx.invoiceRevisionAudit.deleteMany({ where: { invoiceId: id } });
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      // Detach payments and serial numbers if any (to preserve accounting audit history)
      await tx.payment.updateMany({
        where: { invoiceId: id },
        data: { invoiceId: null },
      });
      await tx.serialNumber.updateMany({
        where: { salesInvoiceId: id },
        data: { salesInvoiceId: null },
      });
      await tx.invoice.delete({ where: { id } });
    });

    return NextResponse.json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} permanently purged from system.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
