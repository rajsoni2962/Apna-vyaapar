'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import {
  RotateCcw,
  Search,
  ShoppingCart,
  Calendar,
  AlertCircle,
  RefreshCw,
  Eye,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  grandTotal: number;
  paymentStatus: string;
  customer?: {
    name: string;
    phone: string;
  };
  items: Array<{
    description?: string | null;
    quantity: number;
  }>;
}

export default function SalesReturnsPage() {
  const [cancelledInvoices, setCancelledInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCancelled = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/invoices');
      const data = await res.json();
      if (data.success && data.data) {
        // Cancelled sales are recorded as returns
        const returns = data.data.filter((inv: any) => inv.paymentStatus === 'Cancelled');
        setCancelledInvoices(returns);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCancelled();
  }, []);

  const filtered = cancelledInvoices.filter((inv) => {
    const q = search.toLowerCase();
    const cust = inv.customer?.name.toLowerCase() || '';
    const num = inv.invoiceNumber.toLowerCase();
    return cust.includes(q) || num.includes(q);
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <RotateCcw className="w-6 h-6 text-rose-600" />
              Sales Returns & Credit Reversals
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Audit log of returned merchandise, cancelled invoices, and restored inventory items.
            </p>
          </div>
          <Link
            href="/sales/invoices"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            <ShoppingCart className="w-4 h-4 text-indigo-600" />
            View Active Invoices
          </Link>
        </div>

        {/* Info Banner */}
        <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Automated Inventory Restoration Policy</div>
            <div className="text-rose-600 mt-0.5">
              Whenever a customer sales invoice is cancelled or marked as returned, all product quantities are automatically restored to stock, assigned serial numbers revert to &apos;In Stock&apos;, and the customer ledger balance is reversed.
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search cancelled / returned invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
            />
          </div>
          <div className="text-xs font-semibold text-slate-500">
            Total Returns: <span className="font-bold text-rose-600">{cancelledInvoices.length}</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-rose-600" />
              <span>Checking sales returns...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <RotateCcw className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <div className="font-semibold text-slate-700">No sales returns recorded</div>
              <p className="text-xs text-slate-500 mt-1">
                Cancelled customer invoices and returned merchandise will show up here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Invoice # & Date</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Returned Items</th>
                    <th className="py-3.5 px-4 text-right">Reversed Amount</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(inv.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{inv.customer?.name || 'Walk-in'}</div>
                        <div className="text-xs text-slate-400">{inv.customer?.phone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {inv.items.map((i) => i.description).join(', ')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-rose-600">
                        ₹{inv.grandTotal.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                          Cancelled & Restored
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href={`/sales/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
