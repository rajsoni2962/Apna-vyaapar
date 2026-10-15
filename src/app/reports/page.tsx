'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  ShoppingCart,
  Truck,
  Layers,
  IndianRupee,
  Users,
  FileSpreadsheet,
  RefreshCw,
  Percent,
  Receipt
} from 'lucide-react';
import Link from 'next/link';

type TabKey =
  | 'sales'
  | 'purchases'
  | 'stock'
  | 'profit'
  | 'customer_outstanding'
  | 'supplier_outstanding'
  | 'gst';

function ReportsContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabKey) || 'sales';

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Calculate from & to dates based on preset
  const getDateRange = () => {
    const now = new Date();
    if (dateFilter === 'today') {
      const from = now.toISOString().split('T')[0];
      return { from, to: from };
    }
    if (dateFilter === 'week') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      return { from: past.toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
    }
    if (dateFilter === 'month') {
      const past = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: past.toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
    }
    return { from: '', to: '' };
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange();
      const params = new URLSearchParams({ type: activeTab });
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const res = await fetch(`/api/reports?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setReportData(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, dateFilter]);

  const handlePrint = () => {
    window.print();
  };

  const tabs = [
    { key: 'sales', label: 'Sales Report', icon: ShoppingCart },
    { key: 'purchases', label: 'Purchase Report', icon: Truck },
    { key: 'stock', label: 'Stock Valuation', icon: Layers },
    { key: 'profit', label: 'Profit & Margins', icon: TrendingUp },
    { key: 'customer_outstanding', label: 'Customer Dues', icon: Users },
    { key: 'supplier_outstanding', label: 'Supplier Payables', icon: Truck },
    { key: 'gst', label: 'GST & HSN Report', icon: FileSpreadsheet },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Financial & Operations Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time business intelligence, taxation summaries, and P&L tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateFilter === 'today' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateFilter === 'week' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateFilter === 'month' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateFilter === 'all' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            Print Report
          </button>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="print:hidden flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as TabKey)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Printable Business Header */}
      <div className="hidden print:flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">ASHIRWAD TECH</h2>
          <div className="text-xs text-amber-600 font-bold uppercase tracking-wider">Repair | Upgrade | Build | Service</div>
          <div className="text-xs text-slate-500 mt-1">
            Ashraya 10, GST compound, New Ranip, Ahmedabad 382470 | Ph: 9662278994
          </div>
        </div>
        <div className="text-right">
          <div className="text-base font-bold text-slate-900 uppercase">
            {tabs.find((t) => t.key === activeTab)?.label}
          </div>
          <div className="text-xs text-slate-400">
            Generated: {new Date().toLocaleDateString('en-IN')}
          </div>
        </div>
      </div>

      {/* Report Dynamic Content */}
      {loading ? (
        <div className="bg-white p-16 rounded-2xl border border-slate-200/80 shadow-xs text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="text-sm font-medium text-slate-500">Aggregating report dataset...</span>
        </div>
      ) : !reportData ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-xs text-center text-slate-400">
          No data available for this criteria.
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: SALES REPORT */}
          {activeTab === 'sales' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Total Sales Billed</div>
                  <div className="text-2xl font-black text-indigo-600 mt-1">
                    ₹{reportData.summary?.totalSales?.toLocaleString('en-IN') || 0}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{reportData.summary?.count || 0} Invoices generated</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Taxable Sales</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    ₹{reportData.summary?.totalTaxable?.toLocaleString('en-IN') || 0}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Pre-tax sales amount</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-emerald-600 uppercase">Payments Collected</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    ₹{reportData.summary?.totalReceived?.toLocaleString('en-IN') || 0}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Cash / UPI / Bank receipts</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-rose-600 uppercase">Pending Collection</div>
                  <div className="text-2xl font-black text-rose-600 mt-1">
                    ₹{reportData.summary?.totalBalance?.toLocaleString('en-IN') || 0}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Outstanding customer dues</div>
                </div>
              </div>

              {/* Invoices List */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                  Sales Transactions List
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200/80 font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3 px-4">Invoice # & Date</th>
                        <th className="py-3 px-4">Customer Name</th>
                        <th className="py-3 px-4">Taxable Amt</th>
                        <th className="py-3 px-4">GST (CGST+SGST+IGST)</th>
                        <th className="py-3 px-4 text-right">Invoice Total</th>
                        <th className="py-3 px-4 text-right">Received</th>
                        <th className="py-3 px-4 text-right">Balance Due</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.invoices?.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <Link href={`/sales/invoices/${inv.id}`} className="font-mono font-bold text-indigo-600 hover:underline">
                              {inv.invoiceNumber}
                            </Link>
                            <div className="text-[10px] text-slate-400">
                              {new Date(inv.date).toLocaleDateString('en-IN')}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{inv.customer?.name}</td>
                          <td className="py-3 px-4">₹{inv.taxableAmount?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4">₹{(inv.cgst + inv.sgst + inv.igst)?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">₹{inv.grandTotal?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right text-emerald-600 font-semibold">₹{inv.paidAmount?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right text-rose-600 font-bold">₹{inv.balanceDue?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {inv.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: PURCHASES REPORT */}
          {activeTab === 'purchases' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Total Purchases</div>
                  <div className="text-2xl font-black text-orange-600 mt-1">
                    ₹{reportData.summary?.totalPurchases?.toLocaleString('en-IN') || 0}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{reportData.summary?.count || 0} Bills registered</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Taxable Purchase Value</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    ₹{reportData.summary?.totalTaxable?.toLocaleString('en-IN') || 0}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-emerald-600 uppercase">Disbursed to Vendors</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    ₹{reportData.summary?.totalPaid?.toLocaleString('en-IN') || 0}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-rose-600 uppercase">Payable Balance</div>
                  <div className="text-2xl font-black text-rose-600 mt-1">
                    ₹{reportData.summary?.totalPayable?.toLocaleString('en-IN') || 0}
                  </div>
                </div>
              </div>

              {/* Purchases List */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                  Supplier Purchase Bills
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200/80 font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3 px-4">PO # & Bill #</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Supplier</th>
                        <th className="py-3 px-4">Taxable Value</th>
                        <th className="py-3 px-4 text-right">Bill Total</th>
                        <th className="py-3 px-4 text-right">Paid</th>
                        <th className="py-3 px-4 text-right">Balance Due</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.purchases?.map((po: any) => (
                        <tr key={po.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-slate-900">{po.purchaseNumber}</span>
                            {po.supplierInvoiceNumber && (
                              <div className="text-[10px] text-slate-400">Bill: {po.supplierInvoiceNumber}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">{new Date(po.date).toLocaleDateString('en-IN')}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{po.supplier?.name}</td>
                          <td className="py-3 px-4">₹{po.taxableAmount?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">₹{po.grandTotal?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right text-emerald-600 font-semibold">₹{po.paidAmount?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right text-rose-600 font-bold">₹{po.balanceDue?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {po.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 3: STOCK VALUATION */}
          {activeTab === 'stock' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Total Units in Stock</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {reportData.summary?.totalStockUnits || 0} Units
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-indigo-600 uppercase">Valuation at Cost</div>
                  <div className="text-2xl font-black text-indigo-600 mt-1">
                    ₹{reportData.summary?.totalPurchaseValue?.toLocaleString('en-IN') || 0}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-emerald-600 uppercase">Potential Retail Value</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    ₹{reportData.summary?.totalSalesValue?.toLocaleString('en-IN') || 0}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-amber-600 uppercase">Potential Gross Margin</div>
                  <div className="text-2xl font-black text-amber-600 mt-1">
                    ₹{reportData.summary?.potentialMargin?.toLocaleString('en-IN') || 0}
                  </div>
                </div>
              </div>

              {/* Products Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                  Inventory Items Breakdown
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200/80 font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3 px-4">Product Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-center">In Stock</th>
                        <th className="py-3 px-4 text-right">Cost Rate</th>
                        <th className="py-3 px-4 text-right">Selling Rate</th>
                        <th className="py-3 px-4 text-right">Total Cost Value</th>
                        <th className="py-3 px-4 text-right">Total Retail Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.products?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                          <td className="py-3 px-4">{p.category}</td>
                          <td className="py-3 px-4 text-center font-bold">{p.currentStock}</td>
                          <td className="py-3 px-4 text-right">₹{p.purchasePrice?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right">₹{p.sellingPrice?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right font-bold text-indigo-600">
                            ₹{(p.currentStock * p.purchasePrice)?.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">
                            ₹{(p.currentStock * p.sellingPrice)?.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 4: PROFIT & MARGINS */}
          {activeTab === 'profit' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Sales Revenue</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    ₹{reportData.summary?.totalRevenue?.toLocaleString('en-IN') || 0}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Cost of Goods Sold (COGS)</div>
                  <div className="text-2xl font-black text-slate-700 mt-1">
                    ₹{reportData.summary?.totalCost?.toLocaleString('en-IN') || 0}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-emerald-600 uppercase">Gross Profit</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    ₹{reportData.summary?.grossProfit?.toLocaleString('en-IN') || 0}
                  </div>
                  <div className="text-xs text-emerald-700 font-semibold mt-1">
                    {reportData.summary?.marginPercent?.toFixed(1) || 0}% Gross Margin
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-indigo-600 uppercase">Net Profit (After Expenses)</div>
                  <div className="text-2xl font-black text-indigo-600 mt-1">
                    ₹{reportData.summary?.netProfit?.toLocaleString('en-IN') || 0}
                  </div>
                  <div className="text-xs text-rose-500 mt-1">
                    -₹{reportData.summary?.totalExpenses?.toLocaleString('en-IN') || 0} Operating Expenses
                  </div>
                </div>
              </div>

              {/* Item Margins Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                  Itemized Profit Margins
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200/80 font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3 px-4">Invoice #</th>
                        <th className="py-3 px-4">Product Name</th>
                        <th className="py-3 px-4 text-center">Qty</th>
                        <th className="py-3 px-4 text-right">Cost</th>
                        <th className="py-3 px-4 text-right">Revenue</th>
                        <th className="py-3 px-4 text-right">Gross Profit</th>
                        <th className="py-3 px-4 text-right">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.itemsProfit?.map((it: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-indigo-600">{it.invoiceNumber}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{it.productName}</td>
                          <td className="py-3 px-4 text-center">{it.quantity}</td>
                          <td className="py-3 px-4 text-right">₹{it.cost?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">₹{it.revenue?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">₹{it.profit?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-700">{it.marginPercent?.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 5: CUSTOMER OUTSTANDING */}
          {activeTab === 'customer_outstanding' && (
            <>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-rose-600 uppercase">Total Receivables (Customer Dues)</div>
                  <div className="text-3xl font-black text-rose-600 mt-1">
                    ₹{reportData.summary?.totalOutstanding?.toLocaleString('en-IN') || 0}
                  </div>
                </div>
                <div className="text-xs text-slate-500 text-right">
                  Accounts with Outstanding Balance: <span className="font-bold text-slate-800">{reportData.summary?.count || 0}</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200/80 font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3 px-4">Customer Name & Phone</th>
                        <th className="py-3 px-4">Unpaid Invoices</th>
                        <th className="py-3 px-4 text-right">Outstanding Amount</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.customers?.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{c.name}</div>
                            <div className="text-[11px] text-slate-400">{c.phone}</div>
                          </td>
                          <td className="py-3 px-4">
                            {c.invoices?.map((inv: any) => (
                              <div key={inv.id} className="text-xs text-slate-600">
                                {inv.invoiceNumber} (Due: ₹{inv.balanceDue?.toLocaleString('en-IN')})
                              </div>
                            ))}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-rose-600 text-sm">
                            ₹{c.currentBalance?.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link
                              href={`/customers/ledger?customerId=${c.id}`}
                              className="px-3 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100"
                            >
                              Ledger Statement
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 6: SUPPLIER OUTSTANDING */}
          {activeTab === 'supplier_outstanding' && (
            <>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-rose-600 uppercase">Total Payables to Suppliers</div>
                  <div className="text-3xl font-black text-rose-600 mt-1">
                    ₹{reportData.summary?.totalPayable?.toLocaleString('en-IN') || 0}
                  </div>
                </div>
                <div className="text-xs text-slate-500 text-right">
                  Suppliers to Settle: <span className="font-bold text-slate-800">{reportData.summary?.count || 0}</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200/80 font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3 px-4">Supplier Name</th>
                        <th className="py-3 px-4">Pending Purchase Bills</th>
                        <th className="py-3 px-4 text-right">Payable Balance</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.suppliers?.map((s: any) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                          <td className="py-3 px-4">
                            {s.purchases?.map((po: any) => (
                              <div key={po.id} className="text-xs text-slate-600">
                                {po.purchaseNumber} (Due: ₹{po.balanceDue?.toLocaleString('en-IN')})
                              </div>
                            ))}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-rose-600 text-sm">
                            ₹{s.currentBalance?.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link
                              href={`/suppliers/ledger?supplierId=${s.id}`}
                              className="px-3 py-1 bg-orange-50 text-orange-700 font-semibold rounded-lg hover:bg-orange-100"
                            >
                              Ledger Statement
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 7: GST & HSN REPORT */}
          {activeTab === 'gst' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Taxable Turnover</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    ₹{reportData.summary?.totalTaxable?.toLocaleString('en-IN') || 0}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-indigo-600 uppercase">CGST Collected</div>
                  <div className="text-2xl font-black text-indigo-600 mt-1">
                    ₹{reportData.summary?.totalCgst?.toLocaleString('en-IN') || 0}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-indigo-600 uppercase">SGST Collected</div>
                  <div className="text-2xl font-black text-indigo-600 mt-1">
                    ₹{reportData.summary?.totalSgst?.toLocaleString('en-IN') || 0}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-semibold text-emerald-600 uppercase">Total GST Output Tax</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    ₹{reportData.summary?.totalGst?.toLocaleString('en-IN') || 0}
                  </div>
                </div>
              </div>

              {/* HSN Summary Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
                  HSN / SAC Summary (GSTR-1 Format)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200/80 font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3 px-4">HSN / SAC Code</th>
                        <th className="py-3 px-4 text-center">Total Quantity</th>
                        <th className="py-3 px-4 text-right">Taxable Value</th>
                        <th className="py-3 px-4 text-right">Total GST Amount</th>
                        <th className="py-3 px-4 text-right">Total Invoice Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {reportData.hsnTable?.map((h: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-indigo-600">{h.hsn}</td>
                          <td className="py-3 px-4 text-center font-sans">{h.count} Pcs</td>
                          <td className="py-3 px-4 text-right">₹{h.taxable?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">₹{h.gst?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">₹{h.total?.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading reports hub...</div>}>
        <ReportsContent />
      </Suspense>
    </AppLayout>
  );
}
