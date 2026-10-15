'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import {
  RotateCcw,
  Search,
  Truck,
  Calendar,
  AlertCircle,
  RefreshCw,
  Eye
} from 'lucide-react';
import Link from 'next/link';

interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierInvoiceNumber?: string | null;
  date: string;
  grandTotal: number;
  paymentStatus: string;
  supplier?: {
    name: string;
    phone?: string | null;
  };
  items: Array<{
    description?: string | null;
    quantity: number;
  }>;
}

export default function PurchaseReturnsPage() {
  const [cancelledPurchases, setCancelledPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCancelled = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/purchases');
      const data = await res.json();
      if (data.success && data.data) {
        const returns = data.data.filter((po: any) => po.paymentStatus === 'Cancelled');
        setCancelledPurchases(returns);
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

  const filtered = cancelledPurchases.filter((po) => {
    const q = search.toLowerCase();
    const sup = po.supplier?.name.toLowerCase() || '';
    const num = po.purchaseNumber.toLowerCase();
    const invNum = po.supplierInvoiceNumber?.toLowerCase() || '';
    return sup.includes(q) || num.includes(q) || invNum.includes(q);
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <RotateCcw className="w-6 h-6 text-orange-600" />
              Purchase Returns & Vendor Reversals
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Audit trail of goods returned to distributors, defective stock send-backs, and cancelled bills.
            </p>
          </div>
          <Link
            href="/purchases/all"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            <Truck className="w-4 h-4 text-orange-600" />
            View All Purchases
          </Link>
        </div>

        {/* Info Banner */}
        <div className="bg-orange-50 border border-orange-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-orange-800">
          <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Automated Stock Reversal Policy</div>
            <div className="text-orange-600 mt-0.5">
              When a purchase order is cancelled or marked as returned to vendor, added product inventory is automatically deducted, supplier payable balance is cancelled, and an audit movement log is created.
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search cancelled purchase bills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>
          <div className="text-xs font-semibold text-slate-500">
            Total Vendor Returns: <span className="font-bold text-orange-600">{cancelledPurchases.length}</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-orange-600" />
              <span>Loading purchase returns...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <RotateCcw className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <div className="font-semibold text-slate-700">No purchase returns recorded</div>
              <p className="text-xs text-slate-500 mt-1">
                Cancelled vendor purchase bills will appear in this audit log.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">PO # & Bill #</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Supplier / Vendor</th>
                    <th className="py-3.5 px-4">Returned Items</th>
                    <th className="py-3.5 px-4 text-right">Reversed Value</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">{po.purchaseNumber}</div>
                        {po.supplierInvoiceNumber && (
                          <div className="text-xs text-slate-400">Bill: {po.supplierInvoiceNumber}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                        {new Date(po.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {po.supplier?.name || 'Vendor'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {po.items.map((i) => i.description).join(', ')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-rose-600">
                        ₹{po.grandTotal.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                          Cancelled & Deducted
                        </span>
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
