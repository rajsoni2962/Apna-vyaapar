import { jsPDF } from 'jspdf';
import { numberToWords, formatDate, getInvoiceTypeTitle } from './utils';

export function normalizePhoneNumber(rawPhone?: string | null, defaultCountryCode = '91') {
  if (!rawPhone) {
    return { isValid: false, normalized: '', display: '' };
  }

  // Remove non-digit characters
  const cleaned = rawPhone.replace(/\D/g, '');

  if (!cleaned) {
    return { isValid: false, normalized: '', display: '' };
  }

  let normalized = cleaned;

  // If 10 digits (Standard Indian mobile e.g. 9825012345)
  if (cleaned.length === 10) {
    normalized = `${defaultCountryCode}${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    // Leading 0 e.g. 09825012345
    normalized = `${defaultCountryCode}${cleaned.slice(1)}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    // Already has 91
    normalized = cleaned;
  }

  const isValid = normalized.length >= 10 && normalized.length <= 15;

  // Format display string
  let display = `+${normalized}`;
  if (normalized.startsWith('91') && normalized.length === 12) {
    display = `+91 ${normalized.slice(2, 7)} ${normalized.slice(7)}`;
  }

  return { isValid, normalized, display };
}

export function getSanitizedInvoiceFilename(invoiceNumber: string) {
  const sanitized = (invoiceNumber || 'INV').replace(/[^a-zA-Z0-9_-]/g, '-');
  return `Ashirwad_Technologies_${sanitized}.pdf`;
}

export function formatPdfCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rs. 0.00';
  const num = Math.abs(Number(amount));
  const sign = amount < 0 ? '-' : '';
  const parts = num.toFixed(2).split('.');
  const intPart = parts[0];
  const decPart = parts[1];

  let lastThree = intPart.substring(intPart.length - 3);
  const otherNumbers = intPart.substring(0, intPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return `${sign}Rs. ${formattedInt}.${decPart}`;
}

export interface InvoicePdfOptions {
  logoBase64?: string;
  signatureBase64?: string;
}

/**
 * Generates a clean, vector-rendered A4 Tax Invoice PDF using jsPDF.
 * Reconstructs original finalized invoices from stored database snapshots
 * to preserve 100% historical accuracy regardless of subsequent master edits.
 * Works seamlessly in both browser and Node.js server environments.
 */
export async function generateInvoicePdf(
  invoice: any,
  settings: any = {},
  options: InvoicePdfOptions = {}
): Promise<{ doc: jsPDF; blob: Blob; file: File; filename: string; arrayBuffer: ArrayBuffer }> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const filename = getSanitizedInvoiceFilename(invoice?.invoiceNumber || 'INVOICE');

  // 1. Reconstruct Business Snapshot (Prioritize saved historical snapshot over mutable live settings)
  let bizSnapshot: any = {};
  if (invoice?.businessSnapshot) {
    try {
      bizSnapshot = typeof invoice.businessSnapshot === 'string'
        ? JSON.parse(invoice.businessSnapshot)
        : invoice.businessSnapshot;
    } catch {}
  }

  const business = {
    companyName: bizSnapshot.companyName || settings?.companyName || 'ASHIRWAD TECHNOLOGIES',
    tagline: bizSnapshot.tagline || settings?.tagline || 'Beyond Tech Limits...',
    address: bizSnapshot.address || settings?.address || 'Ashraya 10, GST compound, new ranip, Ahmedabad 382470.',
    phone: bizSnapshot.phone || settings?.phone || '9662278994',
    email: bizSnapshot.email || settings?.email || 'rajsoni2962@gmail.com',
    gstin: bizSnapshot.gstin || settings?.gstin || '24AANPA0000A1Z5',
    state: bizSnapshot.state || settings?.state || 'Gujarat',
    stateCode: bizSnapshot.stateCode || settings?.stateCode || '24',
    bankName: bizSnapshot.bankName || settings?.bankName || 'State Bank of India',
    accountNumber: bizSnapshot.accountNumber || settings?.accountNumber || '39485720194',
    ifscCode: bizSnapshot.ifscCode || settings?.ifscCode || 'SBIN0001234',
    upiId: bizSnapshot.upiId || settings?.upiId || '9662278994@upi',
    terms: invoice?.terms || bizSnapshot.terms || settings?.terms || `* Tested and working perfectly at the time of sale.
* Please inspect the laptop before purchase.
* 6 Months warranty covers technical issues only (excludes physical or liquid damage).
* Battery backup may vary depending on usage.
* No return or refund after sale unless covered under warranty.
* Thank you for choosing us—we're always here to help if you need support.`,
    authorizedSignatory: bizSnapshot.authorizedSignatory || settings?.authorizedSignatory || 'Ashirwad Technologies\nRaj Soni\nProprietor',
    footer: bizSnapshot.footer || settings?.footer || "Thank you for choosing us—we're always here to help if you need support."
  };

  // 2. Reconstruct Customer Snapshot (Prioritize saved historical snapshot over mutable customer table)
  let custSnapshot: any = null;
  if (invoice?.customerSnapshot) {
    try {
      custSnapshot = typeof invoice.customerSnapshot === 'string'
        ? JSON.parse(invoice.customerSnapshot)
        : invoice.customerSnapshot;
    } catch {}
  }
  const customer = custSnapshot || invoice?.customer || {};

  // Auto-resolve logo & signature if not provided
  let logoBase64 = options.logoBase64;
  let signatureBase64 = options.signatureBase64;

  if (!logoBase64 && typeof window === 'undefined') {
    try {
      const fs = eval('require')('fs');
      const path = eval('require')('path');
      const pngPath = path.join(process.cwd(), 'public/brand/logo.png');
      const jpegPath = path.join(process.cwd(), 'public/brand/logo.jpeg');
      const logoPath = fs.existsSync(pngPath) ? pngPath : jpegPath;
      if (fs.existsSync(logoPath)) {
        logoBase64 = fs.readFileSync(logoPath).toString('base64');
      }
    } catch (e) {}
  } else if (!logoBase64 && typeof window !== 'undefined') {
    try {
      const res = await fetch('/brand/logo.png').catch(() => fetch('/brand/logo.jpeg'));
      if (res && res.ok) {
        const blob = await res.blob();
        const reader = new FileReader();
        logoBase64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {}
  }

  if (!signatureBase64 && typeof window === 'undefined') {
    try {
      const fs = eval('require')('fs');
      const path = eval('require')('path');
      const sigPath = path.join(process.cwd(), 'public/brand/signature.jpeg');
      if (fs.existsSync(sigPath)) {
        signatureBase64 = fs.readFileSync(sigPath).toString('base64');
      }
    } catch (e) {}
  } else if (!signatureBase64 && typeof window !== 'undefined') {
    try {
      const res = await fetch('/brand/signature.jpeg');
      if (res && res.ok) {
        const blob = await res.blob();
        const reader = new FileReader();
        signatureBase64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {}
  }

  const grandTotal = invoice?.grandTotal || 0;
  const paidAmount = invoice?.paidAmount || 0;
  const balanceDue = invoice?.balanceDue !== undefined ? invoice.balanceDue : grandTotal - paidAmount;
  const revisionNumber = invoice?.revisionNumber || 1;
  const templateVersion = invoice?.templateVersion || 'v1.0';

  // 1. Top Banner
  const invoiceTitle = getInvoiceTypeTitle(invoice?.invoiceType);
  doc.setFillColor(15, 23, 42); // Obsidian Slate-900
  doc.rect(10, 8, 190, 7.5, 'F');
  doc.setTextColor(212, 175, 55); // Metallic Gold
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(invoiceTitle, 105, 13.2, { align: 'center' });

  // 2. Business Header
  let headerLeftX = 10;
  if (logoBase64) {
    try {
      const isPng = logoBase64.startsWith('data:image/png') || logoBase64.startsWith('iVBORw0KGgo');
      const format = isPng ? 'PNG' : 'JPEG';
      const imgData = logoBase64.startsWith('data:')
        ? logoBase64
        : `data:image/${isPng ? 'png' : 'jpeg'};base64,${logoBase64}`;
      doc.addImage(imgData, format, 10, 17, 20, 20);
      headerLeftX = 33;
    } catch (e) {
      headerLeftX = 10;
    }
  }

  doc.setTextColor(15, 23, 42); // Slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(business.companyName, headerLeftX, 23);

  doc.setTextColor(197, 155, 39); // Metallic Gold #C59B27
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(business.tagline.toUpperCase(), headerLeftX, 27.5);

  doc.setTextColor(71, 85, 105); // Slate-600
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(business.address, headerLeftX, 32);
  doc.text(`Phone: ${business.phone}  |  Email: ${business.email}`, headerLeftX, 36);

  if (business.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`GSTIN: ${business.gstin}  |  State: ${business.state} (${business.stateCode})`, headerLeftX, 40);
  }

  // Right Header: Invoice Meta Badge Box
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.roundedRect(132, 17.5, 68, 23.5, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const numLabel = invoice?.invoiceType === 'QUOTATION' ? 'Quotation #' : (invoice?.invoiceType === 'PROFORMA' ? 'Proforma #' : 'Invoice #');
  doc.text(`${numLabel}: ${invoice?.invoiceNumber || '-'}`, 135, 22.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`Date: ${formatDate(invoice?.date)}`, 135, 26.5);
  doc.text(`Payment: ${invoice?.paymentMode || 'Cash'}`, 135, 30.5);

  if (invoice?.invoiceType && invoice.invoiceType !== 'TAX_INVOICE') {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text(`Type: ${invoiceTitle}`, 135, 34.5);
  } else if (revisionNumber > 1) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(99, 102, 241); // Indigo-500
    doc.text(`Revision: #${revisionNumber}`, 135, 34.5);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Template: ${templateVersion}`, 135, 34.5);
  }

  // Status badge
  const status = invoice?.status === 'Cancelled' ? 'Cancelled' : (invoice?.paymentStatus || 'Paid');
  if (status === 'Paid') {
    doc.setFillColor(220, 252, 231);
    doc.setTextColor(22, 101, 52);
  } else if (status === 'Cancelled') {
    doc.setFillColor(254, 226, 226);
    doc.setTextColor(153, 27, 27);
  } else {
    doc.setFillColor(254, 243, 199);
    doc.setTextColor(146, 64, 14);
  }
  doc.roundedRect(135, 36, 24, 4.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text(status, 147, 39.2, { align: 'center' });

  // 3. Bill To / Party Information Box
  const boxY = 43.5;
  const boxH = 26;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, boxY, 190, boxH, 1.5, 1.5, 'FD');

  // Vertical split line
  doc.line(110, boxY, 110, boxY + boxH);

  // Left: Bill To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('BILL TO (CUSTOMER):', 13, boxY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(customer.name || 'Walk-in Customer', 13, boxY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Contact: ${customer.phone || '-'}`, 13, boxY + 14.5);
  if (customer.address) {
    const splitAddr = doc.splitTextToSize(`Address: ${customer.address}`, 92);
    doc.text(splitAddr.slice(0, 2), 13, boxY + 18.5);
  } else {
    doc.text(`Place of Supply: ${customer.state || 'Gujarat'} (${customer.stateCode || '24'})`, 13, boxY + 18.5);
  }
  if (customer.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${customer.gstin}`, 13, boxY + 22.5);
  }

  // Right: Delivery & Transport Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('SHIPPED / DELIVERED TO:', 114, boxY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Customer: ${customer.name || 'Same as Billing'}`, 114, boxY + 10);
  doc.text(`State: ${customer.state || 'Gujarat'} (Code: ${customer.stateCode || '24'})`, 114, boxY + 14.5);
  if (invoice?.dueDate) {
    doc.text(`Payment Due: ${formatDate(invoice.dueDate)}`, 114, boxY + 18.5);
  } else {
    doc.text(`Dispatched By: ${business.companyName}`, 114, boxY + 18.5);
  }

  // 4. Line Items Table
  let currentY = 72;
  const colX = {
    num: 10,
    desc: 20,
    hsn: 105,
    qty: 122,
    unit: 136,
    rate: 148,
    amount: 173,
    end: 200,
  };

  // Table Header
  doc.setFillColor(30, 41, 59);
  doc.rect(10, currentY, 190, 6.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('#', 15, currentY + 4.5, { align: 'center' });
  doc.text('ITEM NAME & SPECIFICATIONS', colX.desc + 2, currentY + 4.5);
  doc.text('HSN', 113.5, currentY + 4.5, { align: 'center' });
  doc.text('QTY', 129, currentY + 4.5, { align: 'center' });
  doc.text('UNIT', 142, currentY + 4.5, { align: 'center' });
  doc.text('PRICE (RS.)', 170, currentY + 4.5, { align: 'right' });
  doc.text('TOTAL (RS.)', 198, currentY + 4.5, { align: 'right' });

  currentY += 6.5;

  let totalQty = 0;
  const items = invoice?.items || [];

  items.forEach((item: any, index: number) => {
    let itemSnapshot: any = {};
    if (item.itemSnapshot) {
      try {
        itemSnapshot = typeof item.itemSnapshot === 'string' ? JSON.parse(item.itemSnapshot) : item.itemSnapshot;
      } catch {}
    }

    const qty = Number(item.quantity !== undefined ? item.quantity : itemSnapshot.quantity) || 1;
    totalQty += qty;

    const descText = item.description || item.productName || itemSnapshot.productName || item.product?.name || 'Item';
    const splitDesc = doc.splitTextToSize(descText, 80);
    const serial = item.serialNumber || itemSnapshot.serialNumber;
    const warranty = item.warranty || itemSnapshot.warranty || item.product?.warranty || '6 Months';
    const hasSerial = Boolean(serial);

    const descHeight = splitDesc.length * 3.8;
    const hasExtraLine = Boolean(hasSerial || warranty);
    const rowHeight = Math.max(7, descHeight + (hasExtraLine ? 4 : 2) + 2);

    // Page overflow safety
    if (currentY + rowHeight > 255) {
      doc.addPage();
      currentY = 15;
      doc.setFillColor(30, 41, 59);
      doc.rect(10, currentY, 190, 6.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('#', 15, currentY + 4.5, { align: 'center' });
      doc.text('ITEM NAME & SPECIFICATIONS', colX.desc + 2, currentY + 4.5);
      doc.text('HSN', 113.5, currentY + 4.5, { align: 'center' });
      doc.text('QTY', 129, currentY + 4.5, { align: 'center' });
      doc.text('UNIT', 142, currentY + 4.5, { align: 'center' });
      doc.text('PRICE (RS.)', 170, currentY + 4.5, { align: 'right' });
      doc.text('TOTAL (RS.)', 198, currentY + 4.5, { align: 'right' });
      currentY += 6.5;
    }

    // Alternating zebra striping
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(10, currentY, 190, rowHeight, 'F');
    }

    // Row borders
    doc.setDrawColor(226, 232, 240);
    doc.line(10, currentY + rowHeight, 200, currentY + rowHeight);

    // Column dividers
    doc.line(colX.desc, currentY, colX.desc, currentY + rowHeight);
    doc.line(colX.hsn, currentY, colX.hsn, currentY + rowHeight);
    doc.line(colX.qty, currentY, colX.qty, currentY + rowHeight);
    doc.line(colX.unit, currentY, colX.unit, currentY + rowHeight);
    doc.line(colX.rate, currentY, colX.rate, currentY + rowHeight);
    doc.line(colX.amount, currentY, colX.amount, currentY + rowHeight);

    // # index
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(String(index + 1), 15, currentY + 4.5, { align: 'center' });

    // Description
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(splitDesc, colX.desc + 2, currentY + 4);

    // Serial & Warranty Note
    if (hasSerial && warranty) {
      const snY = currentY + 4 + (splitDesc.length * 3.8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(109, 40, 217); // Purple-700
      doc.text(`S/N: ${serial}  •  Warranty: ${warranty}`, colX.desc + 2, snY);
    } else if (hasSerial) {
      const snY = currentY + 4 + (splitDesc.length * 3.8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(109, 40, 217);
      doc.text(`S/N: ${serial}`, colX.desc + 2, snY);
    } else if (warranty) {
      const snY = currentY + 4 + (splitDesc.length * 3.8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Warranty: ${warranty}`, colX.desc + 2, snY);
    }

    // HSN
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(item.hsn || itemSnapshot.hsn || '8471', 113.5, currentY + 4.5, { align: 'center' });

    // Qty & Unit
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(qty), 129, currentY + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(item.unit || itemSnapshot.unit || 'Pcs', 142, currentY + 4.5, { align: 'center' });

    // Rate & Total (uses frozen rate/total)
    const rateVal = Number(item.rate !== undefined ? item.rate : itemSnapshot.rate) || 0;
    const totalVal = Number(item.total !== undefined ? item.total : itemSnapshot.total) || 0;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(rateVal.toFixed(2), 170, currentY + 4.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(totalVal.toFixed(2), 198, currentY + 4.5, { align: 'right' });

    currentY += rowHeight;
  });

  // Total Quantity Row
  doc.setFillColor(241, 245, 249);
  doc.rect(10, currentY, 190, 5.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(10, currentY + 5.5, 200, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('TOTAL QUANTITY:', colX.desc + 2, currentY + 3.8);
  doc.text(`${totalQty} Pcs`, 129, currentY + 3.8, { align: 'center' });

  currentY += 8.5;

  // 5. Financial Summary Section
  const summaryTop = currentY;

  // LEFT COLUMN: Bank Details & Amount in Words (x=10 to 110, width: 100)
  const leftX = 10;
  const leftW = 100;

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(leftX, summaryTop, leftW, 26, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('BANK & PAYMENT DETAILS', leftX + 3, summaryTop + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`Bank Name: ${business.bankName}`, leftX + 3, summaryTop + 9);
  doc.text(`A/C No: ${business.accountNumber}`, leftX + 3, summaryTop + 13);
  doc.text(`IFSC Code: ${business.ifscCode}`, leftX + 3, summaryTop + 17);
  doc.text(`UPI ID: ${business.upiId}`, leftX + 3, summaryTop + 21);

  // Amount in Words
  const wordsY = summaryTop + 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text('AMOUNT IN WORDS (INR):', 10, wordsY + 3.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  const wordsText = numberToWords(Math.round(grandTotal));
  const splitWords = doc.splitTextToSize(wordsText, 98);
  doc.text(splitWords, 10, wordsY + 7.5);

  // Customer Note Box
  const notesY = wordsY + 11 + (splitWords.length * 3.8);
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(254, 252, 232); // Light yellow tint
  doc.roundedRect(10, notesY, leftW, 11, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(161, 98, 7);
  doc.text('NOTE / REMARK:', 12, notesY + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(113, 63, 18);
  const userNotes = invoice?.notes || 'Refurbished laptop tested and certified with 6 months warranty.';
  const splitNotes = doc.splitTextToSize(userNotes, 94);
  doc.text(splitNotes.slice(0, 2), 12, notesY + 7);

  // RIGHT COLUMN: Breakdown Table (x=115 to 200, width: 85)
  const rightX = 115;
  const rightW = 85;
  let calcY = summaryTop;

  function drawCalcRow(label: string, amountStr: string, isBold = false, textColor = [51, 65, 85]) {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(label, rightX + 2, calcY + 3.6);
    doc.text(amountStr, rightX + rightW - 2, calcY + 3.6, { align: 'right' });
    doc.setDrawColor(241, 245, 249);
    doc.line(rightX, calcY + 4.9, rightX + rightW, calcY + 4.9);
    calcY += 4.9;
  }

  const isNoTax = invoice?.invoiceType === 'BILL_OF_SUPPLY' || 
                  invoice?.invoiceType === 'NON_GST' || 
                  invoice?.taxConfiguration === 'NONE';
  const isExempt = invoice?.taxConfiguration === 'EXEMPT';
  const isIgst = invoice?.taxConfiguration === 'IGST';

  const calcBoxStartY = summaryTop;
  drawCalcRow('Sub Total:', formatPdfCurrency(invoice?.subtotal));

  if (invoice?.discountAmount > 0) {
    const discLabel = invoice?.discountPercent ? `Discount (${invoice.discountPercent}%):` : 'Discount:';
    drawCalcRow(discLabel, `- ${formatPdfCurrency(invoice.discountAmount)}`, false, [5, 150, 105]);
  }

  if (!isNoTax) {
    if (isExempt) {
      drawCalcRow('Tax (Exempt / Nil):', 'Rs. 0.00', false, [100, 116, 139]);
    } else if (isIgst) {
      if (invoice?.taxableAmount > 0) {
        drawCalcRow('Taxable Value:', formatPdfCurrency(invoice.taxableAmount));
      }
      if (invoice?.igst > 0) {
        drawCalcRow('IGST (18%):', formatPdfCurrency(invoice.igst));
      }
    } else {
      // Standard CGST + SGST
      if (invoice?.taxableAmount > 0) {
        drawCalcRow('Taxable Value:', formatPdfCurrency(invoice.taxableAmount));
      }
      if (invoice?.cgst > 0) {
        drawCalcRow('CGST (9%):', formatPdfCurrency(invoice.cgst));
      }
      if (invoice?.sgst > 0) {
        drawCalcRow('SGST (9%):', formatPdfCurrency(invoice.sgst));
      }
    }
  }

  if (invoice?.roundOff && invoice.roundOff !== 0) {
    drawCalcRow('Round-Off:', `${invoice.roundOff > 0 ? '+' : ''}${formatPdfCurrency(invoice.roundOff)}`);
  }

  // Grand Total Row
  doc.setFillColor(30, 41, 59);
  doc.rect(rightX, calcY, rightW, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Grand Total:', rightX + 2, calcY + 5);
  doc.text(formatPdfCurrency(grandTotal), rightX + rightW - 2, calcY + 5, { align: 'right' });
  calcY += 8.5;

  // Paid & Balance Due
  drawCalcRow('Received / Paid:', formatPdfCurrency(paidAmount), true, [5, 150, 105]);

  const balanceColor = balanceDue > 0 ? [220, 38, 38] : [51, 65, 85];
  drawCalcRow('Balance Due:', formatPdfCurrency(balanceDue), true, balanceColor);

  // Border around calc box
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rightX, calcBoxStartY, rightW, calcY - calcBoxStartY, 1.5, 1.5);

  // 6. Bottom Section: Terms and Signatory
  const bottomY = Math.max(notesY + 14, calcY + 4);

  // Terms (x=10 to 135)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(30, 41, 59);
  doc.text('TERMS & CONDITIONS:', 10, bottomY + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  const termsLines = doc.splitTextToSize(business.terms, 122);
  doc.text(termsLines.slice(0, 6), 10, bottomY + 7);

  // Authorized Signatory (x=138 to 200)
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(138, bottomY, 62, 26, 1.5, 1.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(`For: ${business.companyName}`, 169, bottomY + 4.5, { align: 'center' });

  // If signature base64 is available, render it
  if (signatureBase64) {
    try {
      doc.addImage(signatureBase64, 'JPEG', 153, bottomY + 7, 32, 11);
    } catch (e) {}
  }

  // Signature line
  doc.setDrawColor(148, 163, 184);
  doc.line(144, bottomY + 19, 194, bottomY + 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Authorized Signatory', 169, bottomY + 23, { align: 'center' });

  // 7. Footer Note at very bottom
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(business.footer, 105, 290, { align: 'center' });

  const arrayBuffer = doc.output('arraybuffer');
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  return { doc, blob, file, filename, arrayBuffer };
}

/**
 * Triggers a browser download of the on-demand generated PDF blob.
 * Automatically releases the created object URL to prevent memory leaks.
 */
export function downloadPdfBlob(blob: Blob, filename: string) {
  if (typeof window === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safe cleanup: revoke URL after download trigger
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

/**
 * Opens the on-demand generated PDF blob directly in a new browser tab for viewing/printing.
 * Automatically releases temporary ObjectURL resources after a safety window.
 */
export function viewPdfBlob(blob: Blob, filename?: string) {
  if (typeof window === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  window.open(url, '_blank');
  // Release object URL after user opens tab
  setTimeout(() => {
    try {
      window.URL.revokeObjectURL(url);
    } catch {}
  }, 60000);
}

/**
 * Generates and triggers direct download of invoice PDF on-demand.
 */
export async function downloadInvoicePdf(invoice: any, settings: any = {}): Promise<void> {
  const { blob, filename } = await generateInvoicePdf(invoice, settings);
  downloadPdfBlob(blob, filename);
}

/**
 * Generates and views invoice PDF directly on-demand in a new tab.
 */
export async function viewInvoicePdf(invoice: any, settings: any = {}): Promise<void> {
  const { blob, filename } = await generateInvoicePdf(invoice, settings);
  viewPdfBlob(blob, filename);
}

/**
 * Legacy compatibility wrapper: generates invoice PDF directly from structured data.
 */
export async function generateInvoicePdfFromElement(
  element: HTMLElement | null,
  invoiceNumber: string,
  invoiceData?: any,
  settingsData?: any
): Promise<{ blob: Blob; file: File; filename: string }> {
  if (invoiceData) {
    const res = await generateInvoicePdf(invoiceData, settingsData);
    return { blob: res.blob, file: res.file, filename: res.filename };
  }

  const fallbackInvoice = {
    invoiceNumber: invoiceNumber || 'INVOICE',
    date: new Date().toISOString(),
    items: [],
    grandTotal: 0,
    paidAmount: 0,
    balanceDue: 0,
  };
  const res = await generateInvoicePdf(fallbackInvoice);
  return { blob: res.blob, file: res.file, filename: res.filename };
}
