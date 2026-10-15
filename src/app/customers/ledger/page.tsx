'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import {
  BookOpen,
  Users,
  Search,
  Printer,
  Calendar,
  IndianRupee,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  FileText,
  Phone,
  Mail,
  MapPin,
  MessageCircle
} from 'lucide-react';
import Link from 'next/link';
import WhatsAppShareModal from '@/components/invoice/WhatsAppShareModal';

interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
  currentBalance: number;
}

interface LedgerEntry {
  type: 'INVOICE' | 'PAYMENT';
  id: string;
  date: string;
  reference: string;
  debit: number;
  credit: number;
  balanceChange: number;
  runningBalance: number;
  paymentStatus: string;
  details: string;
}

interface CustomerDetails {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  gstin?: string | null;
  state: string;
  stateCode: string;
  openingBalance: number;
  currentBalance: number;
  notes?: string | null;
}

function CustomerLedgerContent() {
  const searchParams = useSearchParams();
  const initialCustomerId = searchParams.get('customerId') || '';

  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [shareModalInvoice, setShareModalInvoice] = useState<any | null>(null);

  // Fetch list of all customers for the dropdown
  useEffect(() => {
    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setCustomers(data.data);
          if (!selectedCustomerId && data.data.length > 0) {
            setSelectedCustomerId(data.data[0].id);
          }
        }
      })
      .catch(console.error);
  }, []);

  // Fetch ledger whenever customer changes
  useEffect(() => {
    if (!selectedCustomerId) return;
    setLoading(true);
    fetch(`/api/customers/${selectedCustomerId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setCustomer(data.data.customer);
          setLedger(data.data.ledger);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedCustomerId]);

  const handlePrint = () => {
    window.print();
  };

  const totalInvoiced = ledger.reduce((acc, curr) => acc + curr.debit, 0);
  const totalReceived = ledger.reduce((acc, curr) => acc + curr.credit, 0);

  return (
    <div className="space-y-6">
      {/* Action Header - hidden on print */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Customer Account Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Running statement of account showing all invoices, payments, and balances.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            Print / Export PDF
          </button>
        </div>
      </div>

      {/* Customer Selector Card - hidden on print */}
      <div className="print:hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Select Customer Account
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone}) — Due: ₹{c.currentBalance.toLocaleString('en-IN')}
              </option>
            ))}
          </select>
        </div>

        {customer && (
          <div className="flex items-center gap-6 text-sm">
            <div>
              <div className="text-xs text-slate-400 font-medium">Opening Balance</div>
              <div className="font-bold text-slate-700">₹{customer.openingBalance.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Total Billed</div>
              <div className="font-bold text-indigo-600">₹{totalInvoiced.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Total Paid</div>
              <div className="font-bold text-emerald-600">₹{totalReceived.toLocaleString('en-IN')}</div>
            </div>
            <div className="border-l border-slate-200 pl-6">
              <div className="text-xs text-slate-400 font-medium">Outstanding Due</div>
              <div className={`font-black text-lg ${customer.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                ₹{customer.currentBalance.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Printable Statement Document */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 md:p-8 print:border-none print:shadow-none print:p-0">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span>Loading statement data...</span>
          </div>
        ) : !customer ? (
          <div className="p-12 text-center text-slate-400">
            Please select a customer to display statement.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Business & Customer Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-amber-300/60 bg-white p-1 shrink-0 shadow-xs">
                  <img src="/brand/logo.png" alt="Ashirwad Tech Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">ASHIRWAD TECH</h2>
                  <div className="text-xs text-amber-600 font-bold uppercase tracking-wider">Repair | Upgrade | Build | Service</div>
                  <div className="text-xs text-slate-500 mt-1 max-w-sm">
                    Ashraya 10, GST compound, New Ranip, Ahmedabad 382470
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Phone: 9662278994 | Email: rajsoni2962@gmail.com
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-lg">
                  Statement of Account
                </span>
                <div className="text-xs text-slate-500 mt-2">
                  Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Customer Information
                </div>
                <div className="font-bold text-slate-900 text-base">{customer.name}</div>
                <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {customer.phone}
                  {customer.email && (
                    <span className="flex items-center gap-1 ml-2">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {customer.email}
                    </span>
                  )}
                </div>
                {customer.address && (
                  <div className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    <span>{customer.address}, {customer.state} ({customer.stateCode})</span>
                  </div>
                )}
                {customer.gstin && (
                  <div className="text-xs font-mono text-indigo-700 mt-1">
                    GSTIN: {customer.gstin}
                  </div>
                )}
              </div>

              <div className="text-right flex flex-col justify-end">
                <div className="text-xs text-slate-500">Net Outstanding Balance</div>
                <div className={`text-2xl font-black ${customer.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ₹{customer.currentBalance.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-400">
                  {customer.currentBalance > 0 ? 'Payment Overdue' : 'Account Settled'}
                </div>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 border-b border-slate-200">Date</th>
                    <th className="py-2.5 px-3 border-b border-slate-200">Type</th>
                    <th className="py-2.5 px-3 border-b border-slate-200">Reference #</th>
                    <th className="py-2.5 px-3 border-b border-slate-200">Description / Details</th>
                    <th className="py-2.5 px-3 border-b border-slate-200 text-right">Debit (+)</th>
                    <th className="py-2.5 px-3 border-b border-slate-200 text-right">Credit (-)</th>
                    <th className="py-2.5 px-3 border-b border-slate-200 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {/* Opening Balance Row */}
                  <tr className="bg-slate-50/50 font-medium">
                    <td className="py-2.5 px-3 text-slate-400">-</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-600">OPENING</td>
                    <td className="py-2.5 px-3 text-slate-400">-</td>
                    <td className="py-2.5 px-3 text-slate-500 italic">Opening Balance Carried Forward</td>
                    <td className="py-2.5 px-3 text-right">
                      {customer.openingBalance > 0 ? `₹${customer.openingBalance.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right">-</td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      ₹{customer.openingBalance.toLocaleString('en-IN')}
                    </td>
                  </tr>

                  {ledger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        No transactions recorded for this customer yet.
                      </td>
                    </tr>
                  ) : (
                    ledger.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {new Date(item.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              item.type === 'INVOICE'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {item.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold">
                          <div className="flex items-center gap-1.5">
                            {item.type === 'INVOICE' ? (
                              <>
                                <Link
                                  href={`/sales/invoices/${item.id}`}
                                  className="text-indigo-600 hover:underline print:text-black print:no-underline"
                                >
                                  {item.reference}
                                </Link>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShareModalInvoice({
                                      id: item.id,
                                      invoiceNumber: item.reference,
                                      grandTotal: item.debit,
                                      customer,
                                    })
                                  }
                                  className="print:hidden p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition"
                                  title="Share this Invoice on WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              item.reference
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                          {item.details || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-rose-600">
                          {item.debit > 0 ? `₹${item.debit.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">
                          {item.credit > 0 ? `₹${item.credit.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          ₹{item.runningBalance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={4} className="py-3 px-3 text-right text-slate-700 uppercase">
                      Total Summary
                    </td>
                    <td className="py-3 px-3 text-right text-rose-600">
                      ₹{totalInvoiced.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-600">
                      ₹{totalReceived.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-900 text-sm">
                      ₹{customer.currentBalance.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Terms and Signatory on Print */}
            <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
              <div>
                <p>This is a computer-generated statement of account.</p>
                <p>Please notify us within 7 days in case of any discrepancy.</p>
              </div>
              <div className="text-center">
                <div className="w-32 h-12 flex items-center justify-center mx-auto mb-1">
                  <img
                    src="/brand/signature.jpeg"
                    alt="Authorized Signatory"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="border-t border-slate-300 pt-1 font-semibold text-slate-700">
                  Authorized Signatory
                </div>
                <div className="text-[10px] text-slate-400">Ashirwad Tech</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {shareModalInvoice && (
        <WhatsAppShareModal
          isOpen={!!shareModalInvoice}
          onClose={() => setShareModalInvoice(null)}
          invoice={shareModalInvoice}
        />
      )}
    </div>
  );
}

export default function CustomerLedgerPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading ledger...</div>}>
        <CustomerLedgerContent />
      </Suspense>
    </AppLayout>
  );
}
