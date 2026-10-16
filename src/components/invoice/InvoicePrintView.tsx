'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import {
  Printer,
  Download,
  Share2,
  ArrowLeft,
  CheckCircle2,
  QrCode,
  MessageCircle,
  Eye,
  Edit,
  History,
  GitCompare,
  RotateCcw,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { formatCurrency, formatDate, numberToWords, getInvoiceTypeTitle, getTaxConfigLabel } from '@/lib/utils';
import Link from 'next/link';
import WhatsAppShareModal from '@/components/invoice/WhatsAppShareModal';
import InvoiceAuditHistoryModal from '@/components/invoice/InvoiceAuditHistoryModal';
import InvoiceVersionCompareModal from '@/components/invoice/InvoiceVersionCompareModal';

import {
  downloadInvoicePdf,
  viewInvoicePdf,
  generateInvoicePdfFromElement,
  downloadPdfBlob,
  viewPdfBlob,
} from '@/lib/invoicePdfGenerator';
import { getInvoiceDesign, InvoiceDesignConfig, DEFAULT_INVOICE_DESIGN } from '@/lib/invoice-design';

interface InvoicePrintViewProps {
  invoice: any;
  settings?: any;
  customDesign?: InvoiceDesignConfig;
  isDesignerPreview?: boolean;
}

export default function InvoicePrintView({
  invoice,
  settings,
  customDesign,
  isDesignerPreview = false,
}: InvoicePrintViewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState(invoice);
  const [downloading, setDownloading] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletionReason, setDeletionReason] = useState('Customer requested return / correction');
  const [deleting, setDeleting] = useState(false);

  // 1. Reconstruct business from saved historical snapshot (prioritized over mutable live settings)
  let bizSnapshot: any = {};
  if (currentInvoice?.businessSnapshot) {
    try {
      bizSnapshot = typeof currentInvoice.businessSnapshot === 'string'
        ? JSON.parse(currentInvoice.businessSnapshot)
        : currentInvoice.businessSnapshot;
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
    logoUrl: '/brand/logo.png',
    signatureUrl: '/brand/signature.jpeg',
    terms: currentInvoice?.terms || bizSnapshot.terms || settings?.terms || `* Tested and working perfectly at the time of sale.
* Please inspect the laptop before purchase.
* 6 Months of warranty covers technical issues only and excludes physical or liquid damage.
* Battery backup may vary depending on usage.
* No return or refund after sale unless covered under warranty.
* Thank you for choosing us—we’re always here to help if you need support.`,
    footer: bizSnapshot.footer || settings?.footer || "Thank you for choosing us—we're always here to help if you need support.",
    authorizedSignatory: bizSnapshot.authorizedSignatory || settings?.authorizedSignatory || 'Ashirwad Technologies\nRaj Soni\nProprietor',
  };

  // 2. Reconstruct customer from saved historical snapshot
  let custSnapshot: any = null;
  if (currentInvoice?.customerSnapshot) {
    try {
      custSnapshot = typeof currentInvoice.customerSnapshot === 'string'
        ? JSON.parse(currentInvoice.customerSnapshot)
        : currentInvoice.customerSnapshot;
    } catch {}
  }
  const customer = custSnapshot || currentInvoice?.customer || {};

  const handlePrint = () => {
    window.print();
  };

  const handleViewPdf = async () => {
    setViewing(true);
    try {
      if (printRef.current) {
        const { blob, filename } = await generateInvoicePdfFromElement(
          printRef.current,
          currentInvoice.invoiceNumber,
          currentInvoice,
          business
        );
        viewPdfBlob(blob, filename);
        return;
      }
      await viewInvoicePdf(currentInvoice, business);
    } catch (err: any) {
      console.error('Client PDF view error, using server fallback:', err);
      window.open(`/api/invoices/${currentInvoice.id}/pdf?inline=true`, '_blank');
    } finally {
      setViewing(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      if (printRef.current) {
        const { blob, filename } = await generateInvoicePdfFromElement(
          printRef.current,
          currentInvoice.invoiceNumber,
          currentInvoice,
          business
        );
        downloadPdfBlob(blob, filename);
        return;
      }
      await downloadInvoicePdf(currentInvoice, business);
    } catch (err: any) {
      console.error('Client PDF generation error, using server fallback:', err);
      window.location.href = `/api/invoices/${currentInvoice.id}/pdf`;
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = () => {
    const text = `Tax Invoice ${invoice.invoiceNumber} from Ashirwad Tech for ${invoice.customer?.name}. Amount: ${formatCurrency(invoice.grandTotal)}`;
    if (navigator.share) {
      navigator.share({
        title: `Invoice ${invoice.invoiceNumber}`,
        text: text,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Invoice URL copied to clipboard! You can share it on WhatsApp or Email.');
    }
  };

  // 3. Resolve 100% customizable invoice design
  const design: InvoiceDesignConfig = customDesign || getInvoiceDesign(
    bizSnapshot?.invoiceDesign || currentInvoice?.businessProfile?.invoiceDesign || settings?.invoiceDesign
  );

  const grandTotal = invoice.grandTotal || 0;
  const paidAmount = invoice.paidAmount || 0;
  const balanceDue = invoice.balanceDue !== undefined ? invoice.balanceDue : grandTotal - paidAmount;

  const totalQuantity = invoice.items?.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0) || 0;

  // Generate UPI payment QR link
  const upiLink = `upi://pay?pa=${encodeURIComponent(business.upiId)}&pn=${encodeURIComponent(business.companyName)}&am=${encodeURIComponent(grandTotal)}&cu=INR&tn=${encodeURIComponent(`Inv ${invoice.invoiceNumber}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiLink)}`;

  const handleRestore = async () => {
    if (!confirm('Restore this invoice back to active invoices?')) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/invoices/recently-deleted/${currentInvoice.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restoredBy: 'admin' }),
      });
      const json = await res.json();
      if (json.success) {
        alert('Invoice restored successfully!');
        window.location.reload();
      } else {
        alert(json.error || 'Failed to restore invoice');
      }
    } catch (err: any) {
      alert(err.message || 'Error restoring invoice');
    } finally {
      setRestoring(false);
    }
  };

  const handleSoftDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${currentInvoice.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deletionReason, deletedBy: 'admin' }),
      });
      const json = await res.json();
      if (json.success) {
        setShowDeleteModal(false);
        setCurrentInvoice({
          ...currentInvoice,
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          deletedBy: 'admin',
          deletionReason,
        });
      } else {
        alert(json.error || 'Failed to move invoice to Recently Deleted');
      }
    } catch (err: any) {
      alert(err.message || 'Error moving invoice to Recently Deleted');
    } finally {
      setDeleting(false);
    }
  };

  // Dynamic style calculations
  const fontStyle = {
    fontFamily:
      design.fontFamily === 'Outfit' ? '"Outfit", -apple-system, BlinkMacSystemFont, sans-serif' :
      design.fontFamily === 'Inter' ? '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' :
      design.fontFamily === 'Roboto' ? '"Roboto", -apple-system, BlinkMacSystemFont, sans-serif' :
      design.fontFamily === 'JetBrains Mono' ? '"JetBrains Mono", monospace' :
      design.fontFamily === 'Georgia' ? 'Georgia, serif' :
      'inherit',
  };

  const radiusClass =
    design.borderRadius === 'none' ? 'rounded-none' :
    design.borderRadius === 'small' ? 'rounded-lg' :
    design.borderRadius === 'rounded' ? 'rounded-3xl' :
    'rounded-2xl';

  const paddingClass =
    design.pageMargin === 'compact' ? 'p-5 sm:p-6' :
    design.pageMargin === 'spacious' ? 'p-10 sm:p-14' :
    'p-8 sm:p-10';

  const fontScaleClass =
    design.fontSizeScale === 'compact' ? 'text-[12px] leading-snug' :
    design.fontSizeScale === 'large' ? 'text-[14px] leading-relaxed' :
    'text-[13px] leading-snug';

  const tableHeaderStyle =
    design.tableHeaderStyle === 'filled'
      ? { backgroundColor: design.primaryColor, color: '#ffffff' }
      : design.tableHeaderStyle === 'tinted'
      ? { backgroundColor: `${design.primaryColor}18`, color: '#0f172a' }
      : design.tableHeaderStyle === 'bordered'
      ? { backgroundColor: '#ffffff', color: '#0f172a', borderTop: `2px solid ${design.primaryColor}`, borderBottom: `2px solid ${design.primaryColor}` }
      : { backgroundColor: '#0f172a', color: '#ffffff' };

  return (
    <div className="space-y-6">
      {/* Soft-Deleted Recovery Notice Banner */}
      {!isDesignerPreview && currentInvoice.isDeleted && (
        <div className="print:hidden bg-amber-50 border border-amber-300 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3 text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-xs sm:text-sm">This invoice is in Recently Deleted (7-day recovery period)</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Deleted on {currentInvoice.deletedAt ? new Date(currentInvoice.deletedAt).toLocaleString('en-IN') : 'N/A'} by {currentInvoice.deletedBy || 'admin'}.
                {currentInvoice.deletionReason && ` Reason: "${currentInvoice.deletionReason}".`}
              </p>
            </div>
          </div>
          <button
            onClick={handleRestore}
            disabled={restoring}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{restoring ? 'Restoring...' : 'Restore Invoice'}</span>
          </button>
        </div>
      )}

      {/* Action Header (Hidden in Print or Designer Preview) */}
      {!isDesignerPreview && (
        <div className="print:hidden flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href="/sales/invoices"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{invoice.invoiceNumber}</h2>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    invoice.status === 'Cancelled'
                      ? 'bg-rose-100 text-rose-700'
                      : invoice.paymentStatus === 'Paid'
                      ? 'bg-emerald-100 text-emerald-700'
                      : invoice.paymentStatus === 'Partial'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {invoice.status === 'Cancelled' ? 'Cancelled' : invoice.paymentStatus}
                </span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  v{invoice.revisionNumber || 1}
                </span>
                {currentInvoice.invoiceType && currentInvoice.invoiceType !== 'TAX_INVOICE' && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                    {getInvoiceTypeTitle(currentInvoice.invoiceType)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Customer: <span className="font-medium text-slate-700">{customer.name || invoice.customer?.name}</span> • Date: {formatDate(invoice.date)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/sales/invoices/${currentInvoice.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition"
              title="Edit permitted invoice details"
            >
              <Edit className="w-3.5 h-3.5 text-slate-600" />
              <span>Edit</span>
            </Link>

            {!currentInvoice.isDeleted && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl shadow-xs transition"
                title="Move to Recently Deleted (7-day recovery)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete</span>
              </button>
            )}

            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl shadow-xs transition"
              title="View complete invoice change history and audit trail"
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
            </button>

            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl shadow-xs transition"
              title="Compare any two invoice versions"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Compare Versions</span>
            </button>

            {invoice.whatsappSharedAt && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Shared
              </span>
            )}
            <button
              onClick={handleViewPdf}
              disabled={viewing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl shadow-xs transition disabled:opacity-50"
              title="View Tax Invoice PDF on demand in new tab"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
              <span>{viewing ? 'Opening...' : 'View PDF'}</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-xs shadow-amber-500/20 transition disabled:opacity-50"
              title="Download Tax Invoice PDF directly"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{downloading ? 'Downloading...' : 'PDF'}</span>
            </button>
            <button
              onClick={() => setIsWhatsAppOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print</span>
            </button>
          </div>
        </div>
      )}

      {/* A4 Printable Document Container */}
      <div className="flex justify-center">
        <div
          id="printable-invoice-document"
          ref={printRef}
          style={fontStyle}
          className={`print-container bg-white w-full max-w-[210mm] min-h-[297mm] shadow-lg border border-slate-200 print:border-none print:shadow-none print:rounded-none print:p-0 print:m-0 print:w-full text-slate-900 ${radiusClass} ${paddingClass} ${fontScaleClass}`}
        >
          {/* Top Title Banner */}
          <div
            className="text-center font-bold text-base tracking-wider uppercase pb-2 border-b"
            style={
              design.headerBgStyle === 'solid-accent'
                ? { backgroundColor: design.primaryColor, color: '#ffffff', borderColor: design.primaryColor }
                : design.headerBgStyle === 'dark-slate'
                ? { backgroundColor: '#0f172a', color: '#ffffff', borderColor: '#0f172a' }
                : design.headerBgStyle === 'soft-tint'
                ? { backgroundColor: `${design.primaryColor}14`, color: design.primaryColor, borderColor: `${design.primaryColor}30` }
                : { backgroundColor: '#ffffff', color: '#1e293b', borderColor: '#e2e8f0' }
            }
          >
            {getInvoiceTypeTitle(currentInvoice.invoiceType)}
          </div>

          {/* Header Row: Logo & Business Details */}
          <div
            className={`py-4 border-b border-slate-200 items-center ${
              design.logoPosition === 'center'
                ? 'flex flex-col text-center gap-3'
                : 'grid grid-cols-12 gap-4'
            }`}
          >
            {/* Logo */}
            {design.logoPosition !== 'hidden' && (
              <div
                className={
                  design.logoPosition === 'center'
                    ? 'flex justify-center'
                    : design.logoPosition === 'right'
                    ? 'col-span-3 order-2 flex items-center justify-end'
                    : 'col-span-3 order-1 flex items-center justify-start'
                }
              >
                <div
                  className="relative rounded-2xl overflow-hidden border shadow-xs shrink-0 bg-white p-1"
                  style={{
                    width: `${design.logoSize}px`,
                    height: `${design.logoSize}px`,
                    borderColor: `${design.primaryColor}40`,
                  }}
                >
                  <img
                    src={business.logoUrl || '/brand/logo.png'}
                    crossOrigin="anonymous"
                    alt={business.companyName}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Business Contact */}
            <div
              className={
                design.logoPosition === 'center'
                  ? 'w-full text-center'
                  : design.logoPosition === 'hidden'
                  ? 'col-span-12 text-left'
                  : design.logoPosition === 'right'
                  ? 'col-span-9 order-1 text-left'
                  : 'col-span-9 order-2 text-right'
              }
            >
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                <span>{business.companyName}</span>
              </h1>
              {design.showTagline && business.tagline && (
                <p
                  className="text-xs font-bold uppercase tracking-wider mt-0.5"
                  style={{ color: design.primaryColor }}
                >
                  {business.tagline}
                </p>
              )}
              <p className="text-xs text-slate-600 mt-1 max-w-md ml-auto">
                {business.address}
              </p>
              {design.showContactInfo && (
                <div className="text-xs text-slate-600 mt-1 space-x-2">
                  <span>Phone no.: <strong className="text-slate-800">{business.phone}</strong></span>
                  <span>•</span>
                  <span>Email: <strong className="text-slate-800">{business.email}</strong></span>
                </div>
              )}
              {design.showGstinBadge && business.gstin && (
                <p className="text-xs text-slate-700 font-semibold mt-0.5">
                  GSTIN: {business.gstin}
                </p>
              )}
            </div>
          </div>

          {/* Party and Invoice Details Row */}
          <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-200 bg-slate-50/50 -mx-8 px-8 print:mx-0 print:px-0">
            {design.swapCustomerMetaPosition ? (
              <>
                {/* Swapped: Invoice Details on Left */}
                <div className="border-r border-slate-200 pr-4 space-y-1 text-left">
                  <div
                    className="text-xs font-bold uppercase tracking-wider mb-1"
                    style={{ color: design.primaryColor }}
                  >
                    {design.invoiceMetaTitle || 'Invoice Details:'}
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500">
                      {currentInvoice.invoiceType === 'QUOTATION' ? 'Quotation No.:' : currentInvoice.invoiceType === 'PROFORMA' ? 'Proforma No.:' : 'Invoice No.:'}
                    </span>{' '}
                    <strong className="text-sm text-slate-900 font-bold">{invoice.invoiceNumber}</strong>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500">Date:</span>{' '}
                    <strong className="text-slate-800">{formatDate(invoice.date)}</strong>
                  </div>
                  {invoice.dueDate && (
                    <div className="text-xs">
                      <span className="text-slate-500">Due Date:</span>{' '}
                      <span className="text-slate-700">{formatDate(invoice.dueDate)}</span>
                    </div>
                  )}
                  <div className="text-xs">
                    <span className="text-slate-500">Payment Mode:</span>{' '}
                    <span className="font-semibold text-slate-800">{invoice.paymentMode || 'Cash'}</span>
                  </div>
                </div>

                {/* Bill To on Right */}
                <div className="pl-4 text-right">
                  <div
                    className="text-xs font-bold uppercase tracking-wider mb-1"
                    style={{ color: design.primaryColor }}
                  >
                    {design.customerCardTitle || 'Bill To:'}
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {customer.name || invoice.customer?.name}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Contact No.: <strong className="text-slate-800">{customer.phone || invoice.customer?.phone}</strong>
                  </div>
                  {(customer.email || invoice.customer?.email) && (
                    <div className="text-xs text-slate-600">
                      Email: {customer.email || invoice.customer.email}
                    </div>
                  )}
                  {(customer.address || invoice.customer?.address) && (
                    <div className="text-xs text-slate-600 mt-0.5">
                      Address: {customer.address || invoice.customer.address}
                    </div>
                  )}
                  {(customer.gstin || invoice.customer?.gstin) && (
                    <div className="text-xs text-slate-700 font-medium mt-0.5">
                      GSTIN: {customer.gstin || invoice.customer.gstin}
                    </div>
                  )}
                  <div className="text-xs text-slate-500 mt-0.5">
                    State: {customer.state || invoice.customer?.state || 'Gujarat'} (Code: {customer.stateCode || invoice.customer?.stateCode || '24'})
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Normal: Bill To on Left */}
                <div className="border-r border-slate-200 pr-4">
                  <div
                    className="text-xs font-bold uppercase tracking-wider mb-1"
                    style={{ color: design.primaryColor }}
                  >
                    {design.customerCardTitle || 'Bill To:'}
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {customer.name || invoice.customer?.name}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Contact No.: <strong className="text-slate-800">{customer.phone || invoice.customer?.phone}</strong>
                  </div>
                  {(customer.email || invoice.customer?.email) && (
                    <div className="text-xs text-slate-600">
                      Email: {customer.email || invoice.customer.email}
                    </div>
                  )}
                  {(customer.address || invoice.customer?.address) && (
                    <div className="text-xs text-slate-600 mt-0.5">
                      Address: {customer.address || invoice.customer.address}
                    </div>
                  )}
                  {(customer.gstin || invoice.customer?.gstin) && (
                    <div className="text-xs text-slate-700 font-medium mt-0.5">
                      GSTIN: {customer.gstin || invoice.customer.gstin}
                    </div>
                  )}
                  <div className="text-xs text-slate-500 mt-0.5">
                    State: {customer.state || invoice.customer?.state || 'Gujarat'} (Code: {customer.stateCode || invoice.customer?.stateCode || '24'})
                  </div>
                </div>

                {/* Invoice Details on Right */}
                <div className="pl-4 space-y-1 text-right">
                  <div
                    className="text-xs font-bold uppercase tracking-wider mb-1"
                    style={{ color: design.primaryColor }}
                  >
                    {design.invoiceMetaTitle || 'Invoice Details:'}
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500">
                      {currentInvoice.invoiceType === 'QUOTATION' ? 'Quotation No.:' : currentInvoice.invoiceType === 'PROFORMA' ? 'Proforma No.:' : 'Invoice No.:'}
                    </span>{' '}
                    <strong className="text-sm text-slate-900 font-bold">{invoice.invoiceNumber}</strong>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500">Date:</span>{' '}
                    <strong className="text-slate-800">{formatDate(invoice.date)}</strong>
                  </div>
                  {invoice.dueDate && (
                    <div className="text-xs">
                      <span className="text-slate-500">Due Date:</span>{' '}
                      <span className="text-slate-700">{formatDate(invoice.dueDate)}</span>
                    </div>
                  )}
                  <div className="text-xs">
                    <span className="text-slate-500">Payment Mode:</span>{' '}
                    <span className="font-semibold text-slate-800">{invoice.paymentMode || 'Cash'}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Line Items Table */}
          <div className="py-3">
            <table className="w-full text-left border-collapse border border-slate-300">
              <thead>
                <tr style={tableHeaderStyle} className="text-xs uppercase font-semibold">
                  {design.showSerialColumn && (
                    <th className="py-2 px-2.5 w-8 text-center border-r border-slate-400">#</th>
                  )}
                  <th className="py-2 px-3 border-r border-slate-400">Item Name & Specifications</th>
                  {design.showHsnColumn && (
                    <th className="py-2 px-2 text-center w-16 border-r border-slate-400">HSN</th>
                  )}
                  <th className="py-2 px-2 text-center w-14 border-r border-slate-400">Qty</th>
                  {design.showUnitColumn && (
                    <th className="py-2 px-2 text-center w-12 border-r border-slate-400">Unit</th>
                  )}
                  {design.showDiscountColumn && (
                    <th className="py-2 px-2 text-center w-14 border-r border-slate-400">Disc</th>
                  )}
                  <th className="py-2 px-3 text-right w-24 border-r border-slate-400">Price / Unit</th>
                  <th className="py-2 px-3 text-right w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {invoice.items?.map((item: any, idx: number) => (
                  <tr
                    key={item.id || idx}
                    className={design.zebraStripes ? (idx % 2 === 1 ? 'bg-slate-50/70 hover:bg-slate-100/50' : 'bg-white hover:bg-slate-50/50') : 'hover:bg-slate-50/50'}
                  >
                    {design.showSerialColumn && (
                      <td className="py-2.5 px-2.5 text-center font-medium text-slate-500 border-r border-slate-300">
                        {idx + 1}
                      </td>
                    )}
                    <td className="py-2.5 px-3 border-r border-slate-300">
                      <div className="font-bold text-slate-900 leading-snug">
                        {item.description || item.product?.name}
                      </div>
                      {design.showWarrantyColumn && item.serialNumber && (
                        <div className="text-[11px] font-mono text-purple-700 font-semibold mt-0.5 flex items-center gap-1">
                          <span>S/N:</span> {item.serialNumber}
                        </div>
                      )}
                    </td>
                    {design.showHsnColumn && (
                      <td className="py-2.5 px-2 text-center text-slate-600 border-r border-slate-300">
                        {item.hsn || '8471'}
                      </td>
                    )}
                    <td className="py-2.5 px-2 text-center font-semibold text-slate-800 border-r border-slate-300">
                      {item.quantity}
                    </td>
                    {design.showUnitColumn && (
                      <td className="py-2.5 px-2 text-center text-slate-600 border-r border-slate-300">
                        {item.unit || 'Pcs'}
                      </td>
                    )}
                    {design.showDiscountColumn && (
                      <td className="py-2.5 px-2 text-center text-emerald-700 font-medium border-r border-slate-300">
                        {item.discountAmount ? formatCurrency(item.discountAmount) : '-'}
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-right text-slate-800 border-r border-slate-300">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold text-xs border-t-2 border-slate-300">
                  <td
                    colSpan={(design.showSerialColumn ? 1 : 0) + 1 + (design.showHsnColumn ? 1 : 0)}
                    className="py-2 px-3 text-right border-r border-slate-300"
                  >
                    Total
                  </td>
                  <td className="py-2 px-2 text-center border-r border-slate-300">
                    {totalQuantity}
                  </td>
                  {design.showUnitColumn && (
                    <td className="py-2 px-2 text-center border-r border-slate-300">
                      Pcs
                    </td>
                  )}
                  {design.showDiscountColumn && (
                    <td className="border-r border-slate-300"></td>
                  )}
                  <td className="border-r border-slate-300"></td>
                  <td className="py-2 px-3 text-right text-slate-900">
                    {formatCurrency(invoice.subtotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Amount in words and Financial summary */}
          <div className="grid grid-cols-12 gap-4 py-2 border-t border-b border-slate-200">
            {/* Amount In Words & Optional Bank Info */}
            <div className="col-span-7 pr-4">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Invoice Amount In Words:
              </div>
              <div className="font-bold text-slate-800 text-sm italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {numberToWords(grandTotal)}
              </div>

              {/* Quality Guarantee Box */}
              <div className="mt-3 p-2.5 bg-blue-50/60 rounded-lg border border-blue-200 text-xs text-slate-700">
                <span className="font-bold text-indigo-900 block mb-0.5">Description & Condition:</span>
                {invoice.notes || "Professionally refurbished, fully tested, and ready to use. Clean, reliable, and backed by quality service."}
              </div>

              {/* Bank & UPI Details (Side Position) */}
              {design.bankDetailsPosition === 'left' && (
                <div className="mt-3 flex items-start gap-4 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div className="flex-1 space-y-0.5">
                    <span
                      className="font-bold block mb-1"
                      style={{ color: design.primaryColor }}
                    >
                      Bank & Payment Details:
                    </span>
                    <div>Bank Name: <span className="font-medium text-slate-800">{business.bankName}</span></div>
                    <div>Account No.: <span className="font-mono font-medium text-slate-800">{business.accountNumber}</span></div>
                    <div>IFSC Code: <span className="font-mono font-medium text-slate-800">{business.ifscCode}</span></div>
                    <div>UPI ID: <span className="font-mono font-bold text-indigo-700">{business.upiId}</span></div>
                  </div>
                  {design.showUpiQrCode && (
                    <div className="text-center shrink-0">
                      <img
                        src={qrCodeUrl}
                        crossOrigin="anonymous"
                        alt="UPI QR Code"
                        style={{ width: `${design.qrCodeSize}px`, height: `${design.qrCodeSize}px` }}
                        className="rounded border border-slate-300 p-0.5 bg-white object-contain"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5">Scan & Pay</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="col-span-5 space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Sub Total:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-700">
                  <span>Discount {invoice.discountPercent ? `(${invoice.discountPercent}%)` : ''}:</span>
                  <span className="font-semibold">- {formatCurrency(invoice.discountAmount)}</span>
                </div>
              )}
              {(() => {
                const isNoTax = currentInvoice.invoiceType === 'BILL_OF_SUPPLY' || 
                                currentInvoice.invoiceType === 'NON_GST' || 
                                currentInvoice.taxConfiguration === 'NONE';
                const isExempt = currentInvoice.taxConfiguration === 'EXEMPT';
                const isIgst = currentInvoice.taxConfiguration === 'IGST';

                if (isNoTax) return null;

                if (isExempt) {
                  return (
                    <div className="flex justify-between py-1 border-b border-slate-100 text-slate-500">
                      <span>GST (Exempt / Nil-Rated):</span>
                      <span className="font-medium">₹0.00 (0%)</span>
                    </div>
                  );
                }

                if (isIgst) {
                  return (
                    <>
                      {invoice.taxableAmount > 0 && (
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-600">Taxable Value:</span>
                          <span className="font-medium text-slate-800">{formatCurrency(invoice.taxableAmount)}</span>
                        </div>
                      )}
                      {invoice.igst > 0 && (
                        <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                          <span>IGST (18%):</span>
                          <span>{formatCurrency(invoice.igst)}</span>
                        </div>
                      )}
                    </>
                  );
                }

                return (
                  <>
                    {invoice.taxableAmount > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">Taxable Value:</span>
                        <span className="font-medium text-slate-800">{formatCurrency(invoice.taxableAmount)}</span>
                      </div>
                    )}
                    {invoice.cgst > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                        <span>CGST (9%):</span>
                        <span>{formatCurrency(invoice.cgst)}</span>
                      </div>
                    )}
                    {invoice.sgst > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                        <span>SGST (9%):</span>
                        <span>{formatCurrency(invoice.sgst)}</span>
                      </div>
                    )}
                  </>
                );
              })()}
              <div className="flex justify-between py-1.5 border-b-2 border-slate-900 text-sm font-bold text-slate-900">
                <span>Grand Total:</span>
                <span className="text-base font-black" style={{ color: design.primaryColor }}>
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Received / Paid:</span>
                <span className="font-bold text-emerald-700">{formatCurrency(paidAmount)}</span>
              </div>
              <div className="flex justify-between py-1 text-sm font-bold">
                <span className={balanceDue > 0 ? 'text-rose-600' : 'text-slate-600'}>
                  Balance Due:
                </span>
                <span className={balanceDue > 0 ? 'text-rose-600 font-black' : 'text-slate-800'}>
                  {formatCurrency(balanceDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Full Width Bank Details Option */}
          {design.bankDetailsPosition === 'full' && (
            <div className="my-3 flex items-start gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex-1 space-y-0.5">
                <span className="font-bold block mb-1" style={{ color: design.primaryColor }}>
                  Bank & Payment Details:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>Bank Name: <span className="font-medium text-slate-800">{business.bankName}</span></div>
                  <div>Account No.: <span className="font-mono font-medium text-slate-800">{business.accountNumber}</span></div>
                  <div>IFSC Code: <span className="font-mono font-medium text-slate-800">{business.ifscCode}</span></div>
                  <div>UPI ID: <span className="font-mono font-bold text-indigo-700">{business.upiId}</span></div>
                </div>
              </div>
              {design.showUpiQrCode && (
                <div className="text-center shrink-0">
                  <img
                    src={qrCodeUrl}
                    crossOrigin="anonymous"
                    alt="UPI QR Code"
                    style={{ width: `${design.qrCodeSize}px`, height: `${design.qrCodeSize}px` }}
                    className="rounded border border-slate-300 p-0.5 bg-white object-contain"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">Scan & Pay</span>
                </div>
              )}
            </div>
          )}

          {/* Terms and Signature Footer */}
          <div className="grid grid-cols-12 gap-4 pt-4 items-end">
            {/* Terms and Conditions */}
            {design.termsPosition !== 'hidden' ? (
              <div className="col-span-8 text-[11px] text-slate-600 leading-tight pr-4">
                <div
                  className="font-bold uppercase tracking-wider mb-1"
                  style={{ color: design.primaryColor }}
                >
                  Terms and Conditions:
                </div>
                <div className="whitespace-pre-line text-slate-600 space-y-0.5">
                  {business.terms}
                </div>
              </div>
            ) : (
              <div className="col-span-8"></div>
            )}

            {/* Authorized Signatory */}
            <div
              className={`col-span-4 ${
                design.signatoryPosition === 'left'
                  ? 'text-left'
                  : design.signatoryPosition === 'center'
                  ? 'text-center'
                  : 'text-right'
              }`}
            >
              <div className="text-xs font-bold text-slate-800 mb-1">
                For: {business.companyName}
              </div>
              {design.showSignatureImage && (
                <div
                  className={`relative ${
                    design.signatoryPosition === 'left'
                      ? 'mr-auto ml-0'
                      : design.signatoryPosition === 'center'
                      ? 'mx-auto'
                      : 'ml-auto mr-0'
                  }`}
                  style={{ height: `${design.signatureHeight}px`, width: '140px' }}
                >
                  <img
                    src={business.signatureUrl || '/brand/signature.jpeg'}
                    crossOrigin="anonymous"
                    alt="Authorized Signatory"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div
                className={`text-xs font-bold text-slate-800 border-t pt-1 mt-1 ${
                  design.signatoryPosition === 'left'
                    ? 'text-left'
                    : design.signatoryPosition === 'center'
                    ? 'text-center'
                    : 'text-right'
                }`}
                style={{ borderColor: `${design.primaryColor}50` }}
              >
                {design.signatoryTitle || 'Authorized Signatory'}
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[10px] text-slate-400">
            {design.footerText || business.footer}
          </div>
        </div>
      </div>

      {/* WhatsApp Share Modal */}
      {isWhatsAppOpen && (
        <WhatsAppShareModal
          isOpen={isWhatsAppOpen}
          onClose={() => setIsWhatsAppOpen(false)}
          invoice={currentInvoice}
          settings={business}
          invoiceElementId="printable-invoice-document"
          onShared={() => {
            setCurrentInvoice({ ...currentInvoice, whatsappSharedAt: new Date().toISOString() });
          }}
        />
      )}

      {/* Invoice Change History / Audit Trail Modal */}
      <InvoiceAuditHistoryModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        invoice={currentInvoice}
      />

      {/* Invoice Version Comparison Modal */}
      <InvoiceVersionCompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        invoice={currentInvoice}
      />

      {/* Soft Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-rose-50/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Move to Recently Deleted?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Invoice: <span className="font-mono font-bold text-slate-800">{currentInvoice.invoiceNumber}</span>
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Move this invoice to Recently Deleted? It can be recovered for 7 days.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Deletion Reason (Optional)
                </label>
                <input
                  type="text"
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="e.g. Returned by customer, entered in error..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-rose-600"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSoftDelete}
                disabled={deleting}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {deleting ? 'Moving...' : 'Move to Recently Deleted'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
