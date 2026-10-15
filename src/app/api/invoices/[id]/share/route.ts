import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { recipient, customerName, customerPhone, updateCustomerPhone } = body;

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    // If user provided a phone update for customer
    if (updateCustomerPhone && customerPhone && invoice.customerId) {
      await db.customer.update({
        where: { id: invoice.customerId },
        data: { phone: customerPhone },
      });
    }

    const now = new Date();

    // 1. Update invoice timestamp
    const updatedInvoice = await db.invoice.update({
      where: { id },
      data: {
        whatsappSharedAt: now,
      },
    });

    // 2. Log share entry
    const shareLog = await db.invoiceShareLog.create({
      data: {
        invoiceId: id,
        channel: 'WhatsApp',
        recipient: recipient || customerPhone || invoice.customer?.phone || 'Unknown',
        customerName: customerName || invoice.customer?.name || null,
        invoiceNumber: invoice.invoiceNumber,
        sharedAt: now,
        status: 'Shared',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        invoice: updatedInvoice,
        shareLog,
      },
    });
  } catch (error: any) {
    console.error('Error logging WhatsApp share:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logs = await db.invoiceShareLog.findMany({
      where: { invoiceId: id },
      orderBy: { sharedAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
