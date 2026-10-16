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
  qrBase64?: string;
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
    tagline: bizSnapshot.tagline || settings?.tagline || 'REPAIR | UPGRADE | BUILD | SERVICE',
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

  // Auto-resolve logo, signature & QR code if not provided
  let logoBase64 = options.logoBase64;
  let signatureBase64 = options.signatureBase64;
  let qrBase64 = options.qrBase64;

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

  // Auto-resolve UPI QR Code
  if (!qrBase64 && business.upiId) {
    try {
      const upiLink = `upi://pay?pa=${encodeURIComponent(business.upiId)}&pn=${encodeURIComponent(business.companyName)}&am=${encodeURIComponent(grandTotal)}&cu=INR&tn=${encodeURIComponent(`Inv ${invoice?.invoiceNumber || ''}`)}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiLink)}`;
      const qrRes = await fetch(qrUrl, { cache: 'force-cache' });
      if (qrRes && qrRes.ok) {
        if (typeof window !== 'undefined') {
          const blob = await qrRes.blob();
          const reader = new FileReader();
          qrBase64 = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } else {
          const arrayBuf = await qrRes.arrayBuffer();
          qrBase64 = `data:image/png;base64,${Buffer.from(arrayBuf).toString('base64')}`;
        }
      }
    } catch (e) {}
  }
  const revisionNumber = invoice?.revisionNumber || 1;
  const templateVersion = invoice?.templateVersion || 'v1.0';

  // 1. Top Banner (matching on-screen format)
  const invoiceTitle = getInvoiceTypeTitle(invoice?.invoiceType);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(invoiceTitle, 105, 12, { align: 'center' });
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.3);
  doc.line(10, 15, 200, 15);

  // 2. Business Header
  // Logo on Left
  if (logoBase64) {
    try {
      const isPng = logoBase64.startsWith('data:image/png') || logoBase64.startsWith('iVBORw0KGgo');
      const format = isPng ? 'PNG' : 'JPEG';
      const imgData = logoBase64.startsWith('data:')
        ? logoBase64
        : `data:image/${isPng ? 'png' : 'jpeg'};base64,${logoBase64}`;
      // Golden border around logo box
      doc.setDrawColor(245, 158, 11); // Amber-500
      doc.roundedRect(10, 18, 24, 24, 2, 2);
      doc.addImage(imgData, format, 11, 19, 22, 22);
    } catch (e) {}
  }

  // Right-aligned Business Info (X=200)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text('ASHIRWAD ', 184, 22.5, { align: 'right' });
  doc.setTextColor(234, 88, 12); // Orange #ea580c
  doc.text('TECH', 200, 22.5, { align: 'right' });

  doc.setTextColor(180, 83, 9); // Amber-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(business.tagline.toUpperCase(), 200, 27, { align: 'right' });

  doc.setTextColor(71, 85, 105); // Slate-600
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(business.address, 200, 31.5, { align: 'right' });
  doc.text(`Phone no.: ${business.phone}  •  Email: ${business.email}`, 200, 35.5, { align: 'right' });

  if (business.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(`GSTIN: ${business.gstin}`, 200, 39.5, { align: 'right' });
  }

  // Horizontal divider
  doc.setDrawColor(226, 232, 240);
  doc.line(10, 43, 200, 43);

  // 3. Bill To & Invoice Details (Two Columns with vertical line)
  const partyY = 43.5;
  const partyH = 24.5;
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.rect(10, partyY, 190, partyH, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(105, partyY, 105, partyY + partyH); // Vertical separator

  // Left Column: Bill To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('BILL TO:', 13, partyY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(customer.name || 'Walk-in Customer', 13, partyY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Contact No.: ${customer.phone || '-'}`, 13, partyY + 13.5);
  if (customer.address) {
    const splitAddr = doc.splitTextToSize(`Address: ${customer.address}`, 88);
    doc.text(splitAddr.slice(0, 1), 13, partyY + 17.5);
  }
  doc.text(`State: ${customer.state || 'Gujarat'} (Code: ${customer.stateCode || '24'})`, 13, partyY + 21.5);

  // Right Column: Invoice Details (Right-aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('INVOICE DETAILS:', 197, partyY + 4.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const typeLabel = invoice?.invoiceType === 'QUOTATION' ? 'Quotation' : (invoice?.invoiceType === 'PROFORMA' ? 'Proforma' : 'Invoice');
  doc.text(`${typeLabel} No.: `, 170, partyY + 9, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice?.invoiceNumber || '-', 197, partyY + 9, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Date: ', 175, partyY + 13.5, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(invoice?.date), 197, partyY + 13.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text('Payment Mode: ', 175, partyY + 17.5, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(invoice?.paymentMode || 'Cash', 197, partyY + 17.5, { align: 'right' });

  // Horizontal divider below party details
  doc.setDrawColor(226, 232, 240);
  doc.line(10, partyY + partyH, 200, partyY + partyH);

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
  doc.setFillColor(15, 23, 42); // Obsidian Slate-900 / dark navy
  doc.rect(10, currentY, 190, 6.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('#', 15, currentY + 4.5, { align: 'center' });
  doc.text('ITEM NAME & SPECIFICATIONS', colX.desc + 2, currentY + 4.5);
  doc.text('HSN', 113.5, currentY + 4.5, { align: 'center' });
  doc.text('QTY', 129, currentY + 4.5, { align: 'center' });
  doc.text('UNIT', 142, currentY + 4.5, { align: 'center' });
  doc.text('PRICE / UNIT', 170, currentY + 4.5, { align: 'right' });
  doc.text('AMOUNT', 198, currentY + 4.5, { align: 'right' });

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

  // Total Quantity & Subtotal Row (matching on-screen format)
  doc.setFillColor(241, 245, 249);
  doc.rect(10, currentY, 190, 6, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(10, currentY + 6, 200, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Total', 113.5, currentY + 4.2, { align: 'center' });
  doc.text(String(totalQty), 129, currentY + 4.2, { align: 'center' });
  doc.text('Pcs', 142, currentY + 4.2, { align: 'center' });
  doc.text(formatPdfCurrency(invoice?.subtotal), 198, currentY + 4.2, { align: 'right' });

  currentY += 8;

  // 5. Financial Summary Section
  const summaryTop = currentY;
  const leftX = 10;
  const leftW = 100;

  // Card 1: Amount In Words Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('INVOICE AMOUNT IN WORDS:', leftX, summaryTop + 3);

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(leftX, summaryTop + 4.5, leftW, 9, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(7.8);
  doc.setTextColor(30, 41, 59);
  const wordsText = numberToWords(Math.round(grandTotal));
  doc.text(wordsText, leftX + 3, summaryTop + 10.2);

  // Card 2: Description & Condition Box
  const card2Y = summaryTop + 16.5;
  doc.setDrawColor(191, 219, 254); // Blue-200
  doc.setFillColor(239, 246, 255); // Blue-50
  doc.roundedRect(leftX, card2Y, leftW, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 58, 138); // Blue-900
  doc.text('Description & Condition:', leftX + 3, card2Y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  const notesStr = invoice?.notes || 'Professionally refurbished, fully tested, and ready to use. Clean, reliable, and backed by quality service.';
  const splitNotes = doc.splitTextToSize(notesStr, 94);
  doc.text(splitNotes.slice(0, 2), leftX + 3, card2Y + 8);

  // Card 3: Bank & Payment Details with QR Code
  const card3Y = card2Y + 15;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(leftX, card3Y, leftW, 23, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(30, 41, 59);
  doc.text('Bank & Payment Details:', leftX + 3, card3Y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Bank Name: ${business.bankName}`, leftX + 3, card3Y + 8.5);
  doc.text(`Account No.: ${business.accountNumber}`, leftX + 3, card3Y + 12.5);
  doc.text(`IFSC Code: ${business.ifscCode}`, leftX + 3, card3Y + 16.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(67, 56, 202); // Indigo-700
  doc.text(`UPI ID: ${business.upiId}`, leftX + 3, card3Y + 20.5);

  // QR Code on right side of card 3
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(leftX + leftW - 20, card3Y + 2, 17, 17, 1, 1, 'FD');
  if (qrBase64) {
    try {
      doc.addImage(qrBase64, 'PNG', leftX + leftW - 19.5, card3Y + 2.5, 16, 16);
    } catch (e) {}
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text('Scan & Pay', leftX + leftW - 11.5, card3Y + 21, { align: 'center' });

  // RIGHT COLUMN: Breakdown Table (x=115 to 200, width: 85)
  const rightX = 115;
  const rightW = 85;
  let calcY = summaryTop + 4;

  function drawCalcRow(label: string, amountStr: string, isBold = false, textColor = [51, 65, 85], isLarge = false) {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(isLarge ? 9.5 : 7.8);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(label, rightX + 2, calcY + 3.6);
    doc.text(amountStr, rightX + rightW - 2, calcY + 3.6, { align: 'right' });
    doc.setDrawColor(241, 245, 249);
    doc.line(rightX, calcY + 5.2, rightX + rightW, calcY + 5.2);
    calcY += 5.5;
  }

  const isNoTax = invoice?.invoiceType === 'BILL_OF_SUPPLY' || 
                  invoice?.invoiceType === 'NON_GST' || 
                  invoice?.taxConfiguration === 'NONE';
  const isExempt = invoice?.taxConfiguration === 'EXEMPT';
  const isIgst = invoice?.taxConfiguration === 'IGST';

  drawCalcRow('Sub Total:', formatPdfCurrency(invoice?.subtotal));

  if (invoice?.discountAmount > 0) {
    const discLabel = invoice?.discountPercent ? `Discount (${invoice.discountPercent}%):` : 'Discount:';
    drawCalcRow(discLabel, `- ${formatPdfCurrency(invoice.discountAmount)}`, false, [5, 150, 105]);
  }

  if (!isNoTax) {
    if (isExempt) {
      drawCalcRow('GST (Exempt / Nil-Rated):', 'Rs. 0.00 (0%)', false, [100, 116, 139]);
    } else if (isIgst) {
      if (invoice?.taxableAmount > 0) {
        drawCalcRow('Taxable Value:', formatPdfCurrency(invoice.taxableAmount));
      }
      if (invoice?.igst > 0) {
        drawCalcRow('IGST (18%):', formatPdfCurrency(invoice.igst));
      }
    } else {
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

  // Grand Total Row in Bold Indigo
  drawCalcRow('Grand Total:', formatPdfCurrency(grandTotal), true, [67, 56, 202], true);

  // Received / Paid in Green
  drawCalcRow('Received / Paid:', formatPdfCurrency(paidAmount), true, [21, 128, 61]);

  // Balance Due in Dark Bold
  const balanceColor = balanceDue > 0 ? [220, 38, 38] : [30, 41, 59];
  drawCalcRow('Balance Due:', formatPdfCurrency(balanceDue), true, balanceColor);

  // 6. Bottom Section: Terms and Signatory
  const bottomY = Math.max(card3Y + 26, calcY + 4);

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
 * In the browser, captures the exact rendered DOM view for 100% visual parity.
 */
export async function downloadInvoicePdf(invoice: any, settings: any = {}): Promise<void> {
  if (typeof window !== 'undefined') {
    const el = document.getElementById('printable-invoice-document');
    if (el) {
      const { blob, filename } = await generateInvoicePdfFromElement(el, invoice?.invoiceNumber, invoice, settings);
      downloadPdfBlob(blob, filename);
      return;
    }
  }

  const { blob, filename } = await generateInvoicePdf(invoice, settings);
  downloadPdfBlob(blob, filename);
}

/**
 * Generates and views invoice PDF directly on-demand in a new tab.
 * In the browser, captures the exact rendered DOM view for 100% visual parity.
 */
export async function viewInvoicePdf(invoice: any, settings: any = {}): Promise<void> {
  if (typeof window !== 'undefined') {
    const el = document.getElementById('printable-invoice-document');
    if (el) {
      const { blob, filename } = await generateInvoicePdfFromElement(el, invoice?.invoiceNumber, invoice, settings);
      viewPdfBlob(blob, filename);
      return;
    }
  }

  const { blob, filename } = await generateInvoicePdf(invoice, settings);
  viewPdfBlob(blob, filename);
}

/**
 * Captures the rendered DOM invoice element into a high-DPI A4 PDF with 100% exact
 * layout, typography, colors, QR codes, and digital signatures matching the on-screen view.
 */
export async function generateInvoicePdfFromElement(
  element: HTMLElement | null,
  invoiceNumber: string,
  invoiceData?: any,
  settingsData?: any
): Promise<{ doc: jsPDF; blob: Blob; file: File; filename: string }> {
  const filename = getSanitizedInvoiceFilename(invoiceNumber || invoiceData?.invoiceNumber || 'INVOICE');

  if (typeof window !== 'undefined' && element) {
    try {
      // 1. Ensure all custom web fonts (Inter, etc.) are fully loaded before rasterizing
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // 2. Ensure all <img> tags inside element are loaded and ready
      const imgs = Array.from(element.querySelectorAll('img'));
      await Promise.all(
        imgs.map((img) => {
          if (img.complete && img.naturalHeight !== 0) return Promise.resolve(true);
          return new Promise((resolve) => {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            setTimeout(() => resolve(false), 2000);
          });
        })
      );

      const html2canvas = (await import('html2canvas')).default;

      // Capture at scale 2.5 for crisp 300-DPI equivalent text, logo, QR code, and borders
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200, // Enforce desktop viewport so columns never collapse on mobile
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('printable-invoice-document');
          if (el) {
            el.style.boxShadow = 'none';
            el.style.borderRadius = '0';
            el.style.border = 'none';
            el.style.width = '794px'; // 210mm at 96 DPI
            el.style.maxWidth = '794px';
            el.style.margin = '0 auto';
            el.style.padding = '32px';
          }
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      if (imgHeight <= pdfHeight) {
        doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = 0;

        doc.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position -= pdfHeight;
          doc.addPage();
          doc.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
      }

      const blob = doc.output('blob');
      const file = new File([blob], filename, { type: 'application/pdf' });
      return { doc, blob, file, filename };
    } catch (domErr) {
      console.warn('html2canvas capture encountered an issue, falling back to direct jsPDF generation:', domErr);
    }
  }

  // Fallback to direct jsPDF vector generation
  const res = await generateInvoicePdf(invoiceData || { invoiceNumber }, settingsData);
  return { doc: res.doc, blob: res.blob, file: res.file, filename };
}
