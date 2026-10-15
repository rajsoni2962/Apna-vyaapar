import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const supplierId = searchParams.get('supplierId') || '';
    const status = searchParams.get('status') || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { purchaseNumber: { contains: search } },
        { supplierInvoiceNumber: { contains: search } },
        { supplier: { name: { contains: search } } },
      ];
    }
    if (supplierId) where.supplierId = supplierId;
    if (status && status !== 'All') where.status = status;

    const purchases = await db.purchase.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
        payments: true,
      },
    });

    return NextResponse.json({ success: true, data: purchases });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      supplierId,
      supplierInvoiceNumber,
      date,
      dueDate,
      items, // array of { productId, serialNumbers, description, hsn, quantity, unit, rate, discount, gstPercent, taxableAmount, gstAmount, total }
      subtotal,
      discountPercent,
      discountAmount,
      taxableAmount,
      cgst,
      sgst,
      igst,
      grandTotal,
      paidAmount,
      paymentMode,
      paymentReference,
      billFileUrl,
      originalFileName,
      documentType,
      aiExtractedData,
      verificationStatus,
      ocrRawData,
      notes,
    } = body;

    if (!supplierId || !items || !items.length) {
      return NextResponse.json(
        { success: false, error: 'Supplier and at least one item are required' },
        { status: 400 }
      );
    }

    const poDate = date ? new Date(date) : new Date();
    const paid = parseFloat(paidAmount) || 0;
    const total = parseFloat(grandTotal) || 0;
    const balanceDue = Math.max(0, total - paid);
    let payStatus = 'Unpaid';
    if (paid >= total && total > 0) payStatus = 'Paid';
    else if (paid > 0) payStatus = 'Partial';

    // Perform atomic purchase transaction
    const createdPurchase = await db.$transaction(async (tx) => {
      // 1. Get or generate internal purchase PO number
      const settings = await tx.businessSettings.findUnique({ where: { id: 'default' } });
      const prefix = settings?.purchasePrefix || 'PO/2026/';
      let nextNum = settings?.nextPurchaseNumber || 201;
      let purchaseNumber = `${prefix}${nextNum}`;
      while (await tx.purchase.findUnique({ where: { purchaseNumber } })) {
        nextNum++;
        purchaseNumber = `${prefix}${nextNum}`;
      }

      await tx.businessSettings.update({
        where: { id: 'default' },
        data: { nextPurchaseNumber: nextNum + 1 },
      });

      // 2. Create the Purchase record
      const purchase = await tx.purchase.create({
        data: {
          purchaseNumber,
          supplierInvoiceNumber: supplierInvoiceNumber || `BILL-${Date.now().toString().slice(-4)}`,
          date: poDate,
          dueDate: dueDate ? new Date(dueDate) : null,
          supplierId,
          subtotal: parseFloat(subtotal) || 0,
          discountPercent: parseFloat(discountPercent) || 0,
          discountAmount: parseFloat(discountAmount) || 0,
          taxableAmount: parseFloat(taxableAmount) || 0,
          cgst: parseFloat(cgst) || 0,
          sgst: parseFloat(sgst) || 0,
          igst: parseFloat(igst) || 0,
          grandTotal: total,
          paidAmount: paid,
          balanceDue,
          paymentStatus: payStatus,
          billFileUrl: billFileUrl || null,
          originalFileName: originalFileName || null,
          documentType: documentType || 'GST Invoice',
          aiExtractedData: aiExtractedData ? (typeof aiExtractedData === 'string' ? aiExtractedData : JSON.stringify(aiExtractedData)) : null,
          verificationStatus: verificationStatus || 'VERIFIED',
          ocrRawData: ocrRawData ? JSON.stringify(ocrRawData) : null,
          notes: notes || null,
          status: 'Confirmed',
          items: {
            create: items.map((it: any) => ({
              productId: it.productId,
              serialNumbers: it.serialNumbers || null,
              description: it.description || null,
              hsn: it.hsn || '8471',
              quantity: parseInt(it.quantity) || 1,
              unit: it.unit || 'Pcs',
              rate: parseFloat(it.rate) || 0,
              discount: parseFloat(it.discount) || 0,
              gstPercent: parseFloat(it.gstPercent) || 18,
              taxableAmount: parseFloat(it.taxableAmount) || 0,
              gstAmount: parseFloat(it.gstAmount) || 0,
              total: parseFloat(it.total) || 0,
            })),
          },
        },
      });

      // 3. For each item: increase product stock, update last purchase price, log movement
      for (const it of items) {
        const qty = parseInt(it.quantity) || 1;
        const rate = parseFloat(it.rate) || 0;

        const prod = await tx.product.update({
          where: { id: it.productId },
          data: {
            currentStock: { increment: qty },
            purchasePrice: rate > 0 ? rate : undefined,
          },
        });

        // Record stock movement
        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            date: poDate,
            type: 'PURCHASE',
            referenceType: 'PURCHASE',
            referenceId: purchase.id,
            referenceNumber: purchase.supplierInvoiceNumber,
            quantityChange: qty,
            balanceAfter: prod.currentStock,
            unitPrice: rate,
            notes: `Supplier bill from ${purchase.supplierInvoiceNumber}`,
          },
        });

        // If serial numbers provided (comma separated)
        if (it.serialNumbers) {
          const serialsList = it.serialNumbers.split(',').map((s: string) => s.trim()).filter(Boolean);
          for (const sn of serialsList) {
            const exists = await tx.serialNumber.findUnique({ where: { serialNumber: sn } });
            if (!exists) {
              await tx.serialNumber.create({
                data: {
                  serialNumber: sn,
                  productId: it.productId,
                  supplierId,
                  purchaseInvoiceId: purchase.id,
                  purchasePrice: rate,
                  purchaseDate: poDate,
                  sellingPrice: prod.sellingPrice,
                  status: 'In Stock',
                  notes: `Imported via Purchase ${purchase.purchaseNumber}`,
                },
              });
            }
          }
        }
      }

      // 4. Update supplier balance with unpaid balance and record learned invoice pattern (Section 17)
      const existingSupplier = await tx.supplier.findUnique({ where: { id: supplierId } });
      let patterns: any = {};
      if (existingSupplier?.invoicePatterns) {
        try { patterns = JSON.parse(existingSupplier.invoicePatterns); } catch {}
      }
      patterns.lastInvoiceNumber = supplierInvoiceNumber;
      patterns.lastDate = poDate.toISOString();
      patterns.invoiceCount = (patterns.invoiceCount || 0) + 1;
      if (items.length > 0 && items[0].hsn) patterns.commonHsn = items[0].hsn;
      if (items.length > 0 && items[0].gstPercent) patterns.commonGstPercent = items[0].gstPercent;

      await tx.supplier.update({
        where: { id: supplierId },
        data: {
          currentBalance: balanceDue > 0 ? { increment: balanceDue } : undefined,
          invoicePatterns: JSON.stringify(patterns),
        },
      });

      // 5. If payment recorded
      if (paid > 0) {
        const payNum = `PAY-PO-${Date.now().toString().slice(-6)}`;
        await tx.payment.create({
          data: {
            paymentNumber: payNum,
            date: poDate,
            type: 'SUPPLIER_PAYMENT',
            supplierId,
            purchaseId: purchase.id,
            amount: paid,
            paymentMode: paymentMode || 'Cash',
            referenceNumber: paymentReference || `PO-PAY-${purchase.supplierInvoiceNumber}`,
            notes: `Payment for supplier bill ${purchase.supplierInvoiceNumber}`,
          },
        });
      }

      return purchase;
    });

    return NextResponse.json({ success: true, data: createdPurchase });
  } catch (error: any) {
    console.error('Purchase Creation Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
