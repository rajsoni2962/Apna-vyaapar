'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import {
  AlertTriangle,
  Package,
  ShoppingCart,
  Plus,
  ArrowUpRight,
  RefreshCw,
  Search,
  Camera
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  condition: string;
  currentStock: number;
  minimumStock: number;
  purchasePrice: number;
  sellingPrice: number;
}

export default function LowStockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLowStock = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success && data.data) {
        // filter for low stock: physical products only where currentStock <= minStock
        const low = data.data.filter(
          (p: any) =>
            p.productType !== 'SERVICE' &&
            p.category?.toLowerCase() !== 'service' &&
            p.currentStock <= (p.minStock ?? p.minimumStock ?? 1)
        );
        setProducts(low);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLowStock();
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              Low Stock & Reorder Alerts
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Products that have breached minimum inventory thresholds and need replenishment.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/purchases/import-bill"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition"
            >
              <Camera className="w-4 h-4 text-purple-600" />
              Import Supplier Bill (OCR)
            </Link>
            <Link
              href="/purchases/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              New Purchase Entry
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search low stock items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
          </div>
          <div className="text-xs font-semibold text-slate-500">
            Total Critical Items: <span className="text-rose-600 font-bold">{products.length}</span>
          </div>
        </div>

        {/* Low Stock Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
              <span>Scanning inventory levels...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Package className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <div className="font-bold text-slate-900 text-base">All Inventory Levels are Healthy!</div>
              <p className="text-xs text-slate-500 mt-1">
                No products are currently at or below their configured minimum threshold.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Item Name & Specs</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-center">Current Stock</th>
                    <th className="py-3.5 px-4 text-center">Minimum Threshold</th>
                    <th className="py-3.5 px-4 text-right">Last Purchase Rate</th>
                    <th className="py-3.5 px-4 text-center">Replenishment Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p) => {
                    const isZero = p.currentStock === 0;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="text-xs text-slate-400">Brand: {p.brand} | {p.condition}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-md font-medium">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`font-black text-xs px-2.5 py-1 rounded-lg ${
                              isZero
                                ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {p.currentStock} units {isZero ? '(OUT)' : ''}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-semibold text-slate-700">
                          {p.minimumStock} units
                        </td>
                        <td className="py-4 px-4 text-right font-medium text-slate-700">
                          ₹{p.purchasePrice.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Link
                            href={`/purchases/new?productId=${p.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            Order Now
                          </Link>
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
