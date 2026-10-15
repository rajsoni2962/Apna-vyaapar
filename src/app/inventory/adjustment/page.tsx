'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import {
  SlidersHorizontal,
  History,
  Plus,
  Minus,
  Save,
  RefreshCw,
  AlertCircle,
  Package,
  Calendar,
  CheckCircle2,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  currentStock: number;
  purchasePrice: number;
}

interface StockMovement {
  id: string;
  date: string;
  type: string;
  referenceType: string;
  referenceNumber?: string | null;
  quantityChange: number;
  balanceAfter: number;
  unitPrice?: number | null;
  notes?: string | null;
  product?: {
    name: string;
    brand: string;
  };
}

export default function StockAdjustmentPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(true);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'ADD' | 'REMOVE'>('ADD');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('Physical Stock Count');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success && data.data) {
        setProducts(data.data);
        if (!selectedProductId && data.data.length > 0) {
          setSelectedProductId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchMovements = async () => {
    setLoadingMovements(true);
    try {
      const res = await fetch('/api/stock-adjustments');
      const data = await res.json();
      if (data.success && data.data) {
        setMovements(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchMovements();
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;
    setErrorMsg('');
    setSuccessMsg('');

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Please enter a valid positive quantity.');
      return;
    }

    const change = adjustmentType === 'ADD' ? qty : -qty;

    if (adjustmentType === 'REMOVE' && selectedProduct && selectedProduct.currentStock < qty) {
      setErrorMsg(`Cannot remove ${qty} units. Current stock is only ${selectedProduct.currentStock}.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/stock-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          quantityChange: change,
          reason: `${reason}: ${notes}`,
          unitPrice: selectedProduct?.purchasePrice || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Successfully adjusted stock for ${selectedProduct?.name}.`);
        setQuantity('1');
        setNotes('');
        fetchProducts();
        fetchMovements();
      } else {
        setErrorMsg(data.error || 'Failed to adjust stock');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <SlidersHorizontal className="w-6 h-6 text-amber-600" />
            Stock Adjustment & Audit Movement Log
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Perform physical count reconciliations, record write-offs, and inspect complete immutable inventory history.
          </p>
        </div>

        {/* Top: Adjustment Form + Product Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Adjustment Input Box */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              Adjust Inventory Units
            </h2>

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Product / Laptop <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.brand}) — Stock: {p.currentStock} units
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Action Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('ADD')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition border ${
                        adjustmentType === 'ADD'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Stock (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('REMOVE')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition border ${
                        adjustmentType === 'REMOVE'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                      Reduce Stock (-)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity to Adjust <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Adjustment Reason
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  >
                    <option value="Physical Stock Count Reconciliation">Physical Stock Count Reconciliation</option>
                    <option value="Damaged / Dead on Arrival">Damaged / Dead on Arrival</option>
                    <option value="Demo Unit Dispatched">Demo Unit Dispatched</option>
                    <option value="Internal Repair Usage">Internal Repair Usage</option>
                    <option value="Supplier Return Replacement">Supplier Return Replacement</option>
                    <option value="Other Correction">Other Correction</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Specific Remarks / Serial Number Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Found extra 1 unit in display rack"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {submitting ? 'Applying Adjustment...' : 'Confirm Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>

          {/* Product Realtime Snapshot */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-2">
                Active Product Selected
              </div>
              {selectedProduct ? (
                <div>
                  <div className="text-lg font-bold">{selectedProduct.name}</div>
                  <div className="text-xs text-slate-400 mt-1">Brand: {selectedProduct.brand} | {selectedProduct.category}</div>
                  
                  <div className="mt-6 p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <div className="text-xs text-slate-400">Current Stock Balance</div>
                    <div className="text-3xl font-black text-white mt-1">
                      {selectedProduct.currentStock} <span className="text-sm font-normal text-slate-400">Units</span>
                    </div>

                    <div className="border-t border-slate-700/60 mt-4 pt-3 flex justify-between text-xs text-slate-400">
                      <span>After adjustment:</span>
                      <span className="font-bold text-amber-400">
                        {adjustmentType === 'ADD'
                          ? selectedProduct.currentStock + (parseInt(quantity) || 0)
                          : Math.max(0, selectedProduct.currentStock - (parseInt(quantity) || 0))}{' '}
                        Units
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-400">Select a product to view stock</div>
              )}
            </div>

            <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-4 mt-6">
              ⚠️ All stock alterations are permanently logged in the audit ledger with timestamp and user attribution.
            </div>
          </div>
        </div>

        {/* Complete Movement History Log */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Comprehensive Inventory Movement Audit Trail
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every purchase, sale, return, and manual adjustment ever executed.
              </p>
            </div>
            <button
              onClick={fetchMovements}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
              title="Refresh Logs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loadingMovements ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
              <span>Loading audit logs...</span>
            </div>
          ) : movements.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No stock movements recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Movement Type</th>
                    <th className="py-3 px-4">Reference #</th>
                    <th className="py-3 px-4 text-center">Change</th>
                    <th className="py-3 px-4 text-right">Balance After</th>
                    <th className="py-3 px-4">Audit Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {movements.map((m) => {
                    const isPositive = m.quantityChange > 0;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 font-sans">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-xs">
                          {new Date(m.date).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {m.product?.name || 'Unknown Product'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.type === 'PURCHASE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : m.type === 'SALE'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {m.referenceNumber || m.referenceType}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`font-black text-xs px-2 py-0.5 rounded ${
                              isPositive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isPositive ? `+${m.quantityChange}` : m.quantityChange}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {m.balanceAfter} units
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs max-w-xs truncate">
                          {m.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
