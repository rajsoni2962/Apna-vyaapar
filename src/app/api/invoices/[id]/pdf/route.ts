import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateInvoicePdf, getSanitizedInvoiceFilename } from '@/lib/invoicePdfGenerator';
import fs from 'fs';
import path from 'path';

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
        businessProfile: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    const settings = await db.businessSettings.findUnique({ where: { id: 'default' } });

    // Optional: Load logo & signature from disk if available
    let logoBase64: string | undefined;
    let signatureBase64: string | undefined;

    try {
      const pngPath = path.join(process.cwd(), 'public/brand/logo.png');
      const jpegPath = path.join(process.cwd(), 'public/brand/logo.jpeg');
      const logoPath = fs.existsSync(pngPath) ? pngPath : jpegPath;
      if (fs.existsSync(logoPath)) {
        logoBase64 = fs.readFileSync(logoPath).toString('base64');
      }
    } catch (e) {
      // Ignore logo read error
    }

    try {
      const sigPath = path.join(process.cwd(), 'public/brand/signature.jpeg');
      if (fs.existsSync(sigPath)) {
        signatureBase64 = fs.readFileSync(sigPath).toString('base64');
      }
    } catch (e) {
      // Ignore signature read error
    }

    const { arrayBuffer, filename } = await generateInvoicePdf(invoice, settings, {
      logoBase64,
      signatureBase64,
    });

    // Record on-demand generation timestamp (no permanent file stored)
    await db.invoice.update({
      where: { id },
      data: { pdfGeneratedAt: new Date() },
    }).catch(() => {});

    // Check if user requested inline view or download attachment
    const url = new URL(request.url);
    const disposition = url.searchParams.get('inline') === 'true' ? 'inline' : 'attachment';

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('Invoice PDF API Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to generate PDF' }, { status: 500 });
  }
}
