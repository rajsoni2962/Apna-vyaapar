'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import {
  IndianRupee,
  Plus,
  Search,
  Users,
  FileText,
  Calendar,
  CreditCard,
  RefreshCw,
  X,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

interface Payment {
  id: string;
  paymentNumber: string;
  date: string;
  amount: number;
  paymentMode: string;
  referenceNumber?: string | null;
  notes?: string | null;
  customer?: {
    id: string;
    name: string;
    phone: string;
    currentBalance: number;
  };
  invoice?: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
  };
}

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  currentBalance: number;
}

export default function CustomerPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    amount: '',
    paymentMode: 'UPI',
    referenceNumber: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments?type=CUSTOMER_PAYMENT');
      const data = await res.json();
      if (data.success && data.data) {
        setPayments(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data.success && data.data) {
        setCustomers(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchCustomers();
  }, []);

  const handleOpenModal = () => {
    setFormData({
      customerId: customers.length > 0 ? customers[0].id : '',
      amount: '',
      paymentMode: 'UPI',
      referenceNumber: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          type: 'CUSTOMER_PAYMENT',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchPayments();
        fetchCustomers();
      } else {
        setErrorMsg(data.error || 'Failed to record payment');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = payments.filter((p) => {
    const custName = p.customer?.name || '';
    const num = p.paymentNumber || '';
    const ref = p.referenceNumber || '';
    const q = search.toLowerCase();
    return custName.toLowerCase().includes(q) || num.toLowerCase().includes(q) || ref.toLowerCase().includes(q);
  });

  const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <IndianRupee className="w-6 h-6 text-emerald-600" />
              Customer Payments Received
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Track incoming settlements from clients via UPI, Cash, Cheque, and Bank Transfer.
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Record Payment Received
          </button>
        </div>

        {/* Total Summary Banner */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recorded Receipts</div>
            <div className="text-3xl font-black text-emerald-600 mt-1">₹{totalCollected.toLocaleString('en-IN')}</div>
          </div>
          <div className="text-xs text-slate-500 text-right">
            Total Transactions: <span className="font-bold text-slate-800">{payments.length}</span>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer, receipt # or reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
              <span>Loading payment history...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <div className="font-semibold text-slate-700">No payment receipts found</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Receipt # & Date</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Payment Mode</th>
                    <th className="py-3.5 px-4">Ref / Txn ID</th>
                    <th className="py-3.5 px-4 text-right">Amount Received</th>
                    <th className="py-3.5 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">{p.paymentNumber}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(p.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {p.customer ? (
                          <Link
                            href={`/customers/ledger?customerId=${p.customer.id}`}
                            className="font-bold text-indigo-600 hover:underline"
                          >
                            {p.customer.name}
                          </Link>
                        ) : (
                          <span className="text-slate-400">Walk-in / Anonymous</span>
                        )}
                        {p.invoice && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            Inv: {p.invoice.invoiceNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {p.paymentMode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {p.referenceNumber || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-600 text-base">
                        ₹{p.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 max-w-xs truncate">
                        {p.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal for Recording Customer Payment */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  Record Customer Payment
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {errorMsg && (
                  <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Customer <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone}) — Due: ₹{c.currentBalance.toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Amount Received (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 5000"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={formData.paymentMode}
                      onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    >
                      <option value="UPI">UPI / QR Code</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer / NEFT / IMPS</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      UTR / Transaction Ref
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UPI/1234567890"
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Advance payment for laptop order"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition disabled:opacity-50"
                  >
                    {submitting ? 'Recording...' : 'Save Payment Receipt'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
