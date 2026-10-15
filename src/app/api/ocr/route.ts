import { NextResponse } from 'next/server';
import path from 'path';
import { analyzeBillWithVision } from '@/lib/vision/engine';
import { db } from '@/lib/db';
import { uploadSupplierBillAttachment } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    // 1. Save uploaded file via Supabase Storage / optimized storage layer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeExt = path.extname(file.name) || '.png';
    const mimeType = file.type || (safeExt === '.pdf' ? 'application/pdf' : 'image/jpeg');

    const uploadRes = await uploadSupplierBillAttachment(buffer, file.name, mimeType);
    const fileUrl = uploadRes.fileUrl;

    // 2. Multimodal AI Document Vision Understanding
    try {
      const visionResult = await analyzeBillWithVision([
        {
          buffer,
          fileName: file.name,
          mimeType: file.type || (safeExt === '.pdf' ? 'application/pdf' : 'image/jpeg'),
          fileUrl,
        },
      ]);

      return NextResponse.json({
        success: true,
        data: {
          supplierName: visionResult.supplier.business_name?.value,
          supplierGstin: visionResult.supplier.gstin?.value,
          supplierAddress: visionResult.supplier.address?.value,
          invoiceNumber: visionResult.invoice.invoice_number?.value,
          invoiceDate: visionResult.invoice.invoice_date?.value,
          dueDate: visionResult.invoice.due_date?.value,
          subtotal: visionResult.totals.taxable_amount?.value,
          discount: visionResult.totals.discount?.value,
          taxableAmount: visionResult.totals.taxable_amount?.value,
          cgst: visionResult.totals.cgst_total?.value,
          sgst: visionResult.totals.sgst_total?.value,
          igst: visionResult.totals.igst_total?.value,
          grandTotal: visionResult.totals.grand_total?.value,
          items: visionResult.items.map((it) => ({
            name: it.item_name?.value,
            description: it.full_description?.value || it.item_name?.value,
            hsn: it.hsn_sac?.value || '8471',
            quantity: it.quantity?.value || 1,
            unit: it.unit?.value || 'Pcs',
            rate: it.rate?.value || 0,
            discount: it.discount?.value || 0,
            gstPercent: it.gst_rate?.value || 18,
            taxableAmount: it.taxable_amount?.value || 0,
            gstAmount: ((it.cgst?.value || 0) + (it.sgst?.value || 0) + (it.igst?.value || 0)),
            total: it.line_total?.value || 0,
            confidence: it.line_total?.confidence || 0.95,
            isMatched: it.isMatched,
            matchedProduct: it.matchedProduct,
          })),
          fileUrl,
          matchedSupplier: visionResult.matchedSupplier,
          mathVerification: visionResult.mathVerification,
          documentClassification: visionResult.documentClassification,
        },
      });
    } catch (visionErr: any) {
      console.warn('Multimodal vision failed:', visionErr?.message);
      return NextResponse.json(
        {
          success: false,
          error: visionErr?.message || 'Multimodal AI Vision analysis failed.',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('OCR Endpoint Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
