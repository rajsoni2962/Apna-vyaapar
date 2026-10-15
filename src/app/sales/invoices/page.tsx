'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Plus,
  Eye,
  XCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Printer,
  Download,
  MessageCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import WhatsAppShareModal from '@/components/invoice/WhatsAppShareModal';

export default function AllInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [shareModalInvoice, setShareModalInvoice] = useState<any | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices?search=${encodeURIComponent(search)}&status=${statusFilter}`);
      const json = await res.json();
      if (json.success) setInvoices(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter]);

  const handleCancelInvoice = async (id: string, invoiceNumber: string) => {
    if (!confirm(`Are you sure you want to cancel Invoice ${invoiceNumber}? This will automatically restore product stock and deduct the customer balance.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`Invoice ${invoiceNumber} cancelled and inventory stock restored!`);
        fetchInvoices();
      } else {
        alert(json.error || 'Failed to cancel invoice');
      }
    } catch (err) {
      alert('Error cancelling invoice');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            <span>Customer Sales Invoices</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage tax invoices, print A4 PDFs, track customer dues, and handle invoice cancellations.
          </p>
        </div>

        <Link
          href="/sales/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Invoice</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice number, customer..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-indigo-600"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {['All', 'Paid', 'Partial', 'Unpaid', 'Cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items / Serials</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No sales invoices found matching criteria.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <Link
                        href={`/sales/invoices/${inv.id}`}
                        className="text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(inv.date)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{inv.customer?.name}</div>
                      <div className="text-[11px] text-slate-400">{inv.customer?.phone}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate">
                      {inv.items?.map((it: any) => it.description || it.product?.name).join(', ')}
                      {inv.items?.some((i: any) => i.serialNumber) && (
                        <div className="text-[10px] font-mono text-purple-600 font-semibold truncate">
                          SN: {inv.items.filter((i: any) => i.serialNumber).map((i: any) => i.serialNumber).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      {formatCurrency(inv.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                      {formatCurrency(inv.paidAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600">
                      {formatCurrency(inv.balanceDue)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            inv.status === 'Cancelled'
                              ? 'bg-rose-100 text-rose-700'
                              : inv.paymentStatus === 'Paid'
                              ? 'bg-emerald-100 text-emerald-700'
                              : inv.paymentStatus === 'Partial'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {inv.status === 'Cancelled' ? 'Cancelled' : inv.paymentStatus}
                        </span>
                        {inv.whatsappSharedAt && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            WhatsApp Shared ✓
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                      <a
                        href={`/api/invoices/${inv.id}/pdf?inline=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition"
                        title="View Tax Invoice PDF in new tab"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>View</span>
                      </a>

                      <a
                        href={`/api/invoices/${inv.id}/pdf`}
                        download
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition"
                        title="Download Bill PDF directly"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600" />
                        <span>PDF</span>
                      </a>

                      <button
                        onClick={() => setShareModalInvoice(inv)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                        title="Share on WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </button>

                      <Link
                        href={`/sales/invoices/${inv.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        title="Print / View Invoice"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        <span>Print</span>
                      </Link>

                      {inv.status !== 'Cancelled' && (
                        <button
                          onClick={() => handleCancelInvoice(inv.id, inv.invoiceNumber)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Cancel Invoice & Restore Stock"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* WhatsApp Share Modal */}
      {shareModalInvoice && (
        <WhatsAppShareModal
          isOpen={!!shareModalInvoice}
          onClose={() => setShareModalInvoice(null)}
          invoice={shareModalInvoice}
          onShared={() => {
            fetchInvoices();
          }}
        />
      )}
    </div>
  );
}
