'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import {
  Package,
  Layers,
  Search,
  SlidersHorizontal,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Tag,
  Plus
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

export default function StockOverviewPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    setLoading(true);
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setProducts(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const physicalProducts = products.filter(
    (p: any) => p.productType !== 'SERVICE' && p.category?.toLowerCase() !== 'service'
  );
  const totalStockUnits = physicalProducts.reduce((acc, p) => acc + p.currentStock, 0);
  const totalCostValuation = physicalProducts.reduce((acc, p) => acc + p.currentStock * p.purchasePrice, 0);
  const totalRetailValuation = physicalProducts.reduce((acc, p) => acc + p.currentStock * p.sellingPrice, 0);
  const lowStockCount = physicalProducts.filter(
    (p: any) => p.currentStock <= (p.minStock ?? p.minimumStock ?? 1)
  ).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-amber-600" />
              Stock Overview & Valuation
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Live inventory levels, asset valuation, and stock health across categories.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/inventory/adjustment"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition"
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-600" />
              Stock Adjustment
            </Link>
            <Link
              href="/inventory/products"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Manage Products
            </Link>
          </div>
        </div>

        {/* Valuation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total In-Stock Units</div>
            <div className="text-2xl font-black text-slate-900 mt-2">{totalStockUnits} Units</div>
            <div className="text-xs text-slate-400 mt-1">Across {products.length} product SKUs</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Stock Valuation (Cost)</div>
            <div className="text-2xl font-black text-indigo-600 mt-2">₹{totalCostValuation.toLocaleString('en-IN')}</div>
            <div className="text-xs text-slate-400 mt-1">Total capital locked in inventory</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Potential Sales Value</div>
            <div className="text-2xl font-black text-emerald-600 mt-2">₹{totalRetailValuation.toLocaleString('en-IN')}</div>
            <div className="text-xs text-slate-400 mt-1">Projected revenue at retail price</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Low Stock Alerts</div>
            <div className="text-2xl font-black text-rose-600 mt-2">{lowStockCount} Items</div>
            <Link href="/inventory/low-stock" className="text-xs font-semibold text-indigo-600 hover:underline mt-1 inline-block">
              View reorder items &rarr;
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product name or brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Stock Inventory Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
              <span>Calculating stock values...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <div className="font-semibold text-slate-700">No stock items match filters</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Item Details</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-center">Available Stock</th>
                    <th className="py-3.5 px-4 text-right">Cost Price</th>
                    <th className="py-3.5 px-4 text-right">Selling Price</th>
                    <th className="py-3.5 px-4 text-right">Stock Cost Value</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p: any) => {
                    const threshold = p.minStock ?? p.minimumStock ?? 1;
                    const isLow = p.currentStock <= threshold;
                    const isOut = p.currentStock === 0;
                    const costVal = p.currentStock * p.purchasePrice;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="text-xs text-slate-400">Brand: {p.brand} | {p.condition}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-md font-medium">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {p.productType === 'SERVICE' || p.category?.toLowerCase() === 'service' ? (
                            <span className="font-bold text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                              Service
                            </span>
                          ) : (
                            <>
                              <span
                                className={`font-black text-sm px-2.5 py-1 rounded-lg ${
                                  isOut
                                    ? 'bg-rose-100 text-rose-700'
                                    : isLow
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {p.currentStock}
                              </span>
                              <div className="text-[10px] text-slate-400 mt-1">Min: {threshold}</div>
                            </>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                          ₹{p.purchasePrice.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                          ₹{p.sellingPrice.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-indigo-600">
                          {p.productType === 'SERVICE' || p.category?.toLowerCase() === 'service' ? (
                            <span className="text-slate-400 font-mono text-xs">-</span>
                          ) : (
                            `₹${costVal.toLocaleString('en-IN')}`
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {p.productType === 'SERVICE' || p.category?.toLowerCase() === 'service' ? (
                            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                              Service
                            </span>
                          ) : isOut ? (
                            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              Low Stock
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Normal
                            </span>
                          )}
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
