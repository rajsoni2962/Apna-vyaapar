'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  X,
  Phone,
  Copy,
  Download,
  Share2,
  Check,
  AlertCircle,
  FileText,
  ExternalLink,
  RefreshCw,
  Plus
} from 'lucide-react';
import {
  normalizePhoneNumber,
  getSanitizedInvoiceFilename,
  generateInvoicePdf,
  downloadPdfBlob
} from '@/lib/invoicePdfGenerator';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  settings?: any;
  invoiceElementId?: string; // ID of DOM element to capture for PDF (kept for backward compatibility)
  onShared?: () => void;
}

export default function WhatsAppShareModal({
  isOpen,
  onClose,
  invoice,
  settings,
  invoiceElementId = 'printable-invoice-document',
  onShared,
}: WhatsAppShareModalProps) {
  let custSnapshot: any = null;
  if (invoice?.customerSnapshot) {
    try {
      custSnapshot = typeof invoice.customerSnapshot === 'string'
        ? JSON.parse(invoice.customerSnapshot)
        : invoice.customerSnapshot;
    } catch {}
  }
  const customerName = custSnapshot?.name || invoice.customer?.name || 'Customer';
  const initialPhone = custSnapshot?.phone || invoice.customer?.phone || '';

  const [phoneInput, setPhoneInput] = useState(initialPhone);
  const [isEditingPhone, setIsEditingPhone] = useState(!initialPhone);
  const [updatingPhone, setUpdatingPhone] = useState(false);

  const phoneDetails = normalizePhoneNumber(phoneInput);

  // Default pre-filled message
  const defaultMessage = `Hello ${customerName},

Thank you for choosing Ashirwad Tech.

Please find attached your invoice ${invoice.invoiceNumber} for ₹${(invoice.grandTotal || 0).toLocaleString('en-IN')}.

Thank you for your business.

ASHIRWAD TECH
Repair | Upgrade | Build | Service`;

  const [message, setMessage] = useState(defaultMessage);
  const [copied, setCopied] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [desktopModalNotice, setDesktopModalNotice] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);

  useEffect(() => {
    // Check if Web Share API with files is supported
    if (typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator) {
      try {
        const dummyFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
        if (navigator.canShare({ files: [dummyFile] })) {
          setCanShareFiles(true);
        }
      } catch (e) {
        setCanShareFiles(false);
      }
    }
  }, []);

  if (!isOpen) return null;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSavePhone = async () => {
    if (!phoneDetails.isValid) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    setUpdatingPhone(true);
    try {
      if (invoice.customer?.id) {
        await fetch(`/api/customers/${invoice.customer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: customerName,
            phone: phoneInput,
          }),
        });
      }
      setIsEditingPhone(false);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingPhone(false);
    }
  };

  const recordShareLog = async () => {
    try {
      await fetch(`/api/invoices/${invoice.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: phoneDetails.normalized || phoneInput,
          customerName,
          customerPhone: phoneInput,
          updateCustomerPhone: isEditingPhone,
        }),
      });
      if (onShared) onShared();
    } catch (e) {
      console.error('Failed to log share action', e);
    }
  };

  // Helper to fetch full invoice if items are missing
  const getFullInvoiceData = async () => {
    if (invoice.items && invoice.items.length > 0 && invoice.subtotal !== undefined) {
      return invoice;
    }
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    } catch (e) {
      console.error('Failed to load full invoice', e);
    }
    return invoice;
  };

  const handleDirectDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      const fullData = await getFullInvoiceData();
      const { blob, filename } = await generateInvoicePdf(fullData, settings);
      downloadPdfBlob(blob, filename);
    } catch (err: any) {
      console.error('Direct PDF generation error, using server fallback:', err);
      // Fallback: direct download link via API route
      window.location.href = `/api/invoices/${invoice.id}/pdf`;
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleShare = async () => {
    if (!phoneDetails.isValid) {
      setIsEditingPhone(true);
      return;
    }

    setGeneratingPdf(true);

    try {
      const fullData = await getFullInvoiceData();
      const result = await generateInvoicePdf(fullData, settings);
      const pdfFile = result.file;
      const pdfBlob = result.blob;
      const filename = result.filename;

      // Method A: Native Web Share API (Mobile / supported devices)
      if (canShareFiles && pdfFile && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber} - Ashirwad Tech`,
          text: message,
          files: [pdfFile],
        });
        await recordShareLog();
        onClose();
        return;
      }

      // Method B: Desktop / WhatsApp Web Fallback
      // 1. Download PDF so user has it immediately
      if (pdfBlob) {
        downloadPdfBlob(pdfBlob, filename);
      }

      // 2. Open WhatsApp Web with normalized phone number and pre-filled message
      const encodedMsg = encodeURIComponent(message);
      const waUrl = `https://web.whatsapp.com/send?phone=${phoneDetails.normalized}&text=${encodedMsg}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');

      // 3. Record share log
      await recordShareLog();

      // 4. Show clear desktop guidance notice
      setDesktopModalNotice(true);
    } catch (err: any) {
      console.error('Sharing failed:', err);
      // Fallback: If user cancelled native share, do not error out
      if (err.name !== 'AbortError') {
        const encodedMsg = encodeURIComponent(message);
        const waUrl = `https://wa.me/${phoneDetails.normalized}?text=${encodedMsg}`;
        window.open(waUrl, '_blank');
      }
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-100">
        {/* Modal Header */}
        <div className="bg-emerald-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Share Invoice on WhatsApp</h3>
              <p className="text-xs text-emerald-100 mt-0.5">Share Tax Invoice PDF directly with customer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Desktop Fallback Instruction Banner */}
          {desktopModalNotice && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>PDF Downloaded & WhatsApp Web Opened</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                We generated and downloaded <span className="font-mono font-semibold">{getSanitizedInvoiceFilename(invoice.invoiceNumber)}</span> to your computer and opened WhatsApp Web with {customerName}. <strong>Please attach the downloaded PDF file into the chat manually</strong> before sending.
              </p>
              <div className="pt-1 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-3 py-1 bg-emerald-600 text-white font-semibold text-xs rounded-lg hover:bg-emerald-700"
                >
                  Done / Close
                </button>
              </div>
            </div>
          )}

          {/* Customer & Invoice Snapshot */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Customer</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{customerName}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Invoice Amount</div>
                <div className="text-sm font-black text-emerald-600 mt-0.5">
                  ₹{invoice.grandTotal.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Mobile Number Section */}
            <div className="pt-2 border-t border-slate-200/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  WhatsApp Mobile Number:
                </span>
                {!isEditingPhone && (
                  <button
                    type="button"
                    onClick={() => setIsEditingPhone(true)}
                    className="text-[11px] font-semibold text-indigo-600 hover:underline"
                  >
                    Change
                  </button>
                )}
              </div>

              {!isEditingPhone && phoneDetails.isValid ? (
                <div className="font-mono text-sm font-bold text-slate-900 mt-1">
                  {phoneDetails.display}
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  {!phoneDetails.isValid && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Customer mobile number is required to share on WhatsApp.</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="e.g. 9876543210"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSavePhone}
                      disabled={updatingPhone || !phoneDetails.isValid}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50"
                    >
                      {updatingPhone ? 'Saving...' : 'Set Number'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Editable Message Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                WhatsApp Message Preview (Editable)
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Message</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white font-sans leading-relaxed text-slate-800"
            />
          </div>

          {/* PDF Attachment Notice */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="font-mono text-slate-700 truncate">
                {getSanitizedInvoiceFilename(invoice.invoiceNumber)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleDirectDownloadPdf}
              disabled={generatingPdf}
              className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline shrink-0 ml-2"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition text-center"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleShare}
              disabled={generatingPdf || (!phoneDetails.isValid && isEditingPhone)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition disabled:opacity-50"
            >
              {generatingPdf ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating & Preparing PDF...
                </>
              ) : canShareFiles ? (
                <>
                  <Share2 className="w-4 h-4" />
                  Share PDF on WhatsApp
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  Open WhatsApp & Download PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
