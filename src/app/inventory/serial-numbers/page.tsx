'use client';

import React, { useState, useEffect, Suspense } from 'react';
import {
  Hash,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Shield,
  Laptop,
  ArrowRight,
  Edit,
  X
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

function SerialNumbersContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const [serials, setSerials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState('All');

  // Edit / Add Modal
  const [selectedSerial, setSelectedSerial] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('In Stock');
  const [newNotes, setNewNotes] = useState('');

  // Add Serial Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [addForm, setAddForm] = useState({
    serialNumber: '',
    productId: '',
    purchasePrice: 0,
    sellingPrice: 0,
    status: 'In Stock',
    notes: '',
  });

  const fetchSerials = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/serial-numbers?search=${encodeURIComponent(search)}&status=${statusFilter}`);
      const json = await res.json();
      if (json.success) setSerials(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSerials();
    fetch('/api/products')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setProducts(res.data);
      });
  }, [search, statusFilter]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSerial) return;

    try {
      const res = await fetch('/api/serial-numbers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedSerial.id,
          status: newStatus,
          notes: newNotes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedSerial(null);
        fetchSerials();
      } else {
        alert(json.error || 'Failed to update serial');
      }
    } catch (err) {
      alert('Error updating serial');
    }
  };

  const handleAddNewSerial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.serialNumber || !addForm.productId) {
      alert('Please fill serial number and choose product');
      return;
    }

    try {
      const res = await fetch('/api/serial-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const json = await res.json();
      if (json.success) {
        alert(`Serial number ${addForm.serialNumber} added to stock!`);
        setShowAddModal(false);
        setAddForm({
          serialNumber: '',
          productId: '',
          purchasePrice: 0,
          sellingPrice: 0,
          status: 'In Stock',
          notes: '',
        });
        fetchSerials();
      } else {
        alert(json.error || 'Failed to add serial');
      }
    } catch (err) {
      alert('Error adding serial number');
    }
  };

  const statuses = [
    'All',
    'In Stock',
    'Sold',
    'Reserved',
    'Under Repair',
    'Returned',
    'Warranty Claim',
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Hash className="w-6 h-6 text-purple-600" />
            <span>Serial Number Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track refurbished laptops individually from purchase to sale, warranty periods, and repair status.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Serial Number</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search serial number, product, customer..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-purple-600"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Serials Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Serial Number</th>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Customer & Sale Date</th>
                <th className="py-3 px-4">Sales Invoice</th>
                <th className="py-3 px-4">Warranty Period</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading serial numbers...
                  </td>
                </tr>
              ) : serials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No serial numbers found.
                  </td>
                </tr>
              ) : (
                serials.map((sn) => (
                  <tr key={sn.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">
                      {sn.serialNumber}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800 truncate">
                        {sn.product?.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Cost: {formatCurrency(sn.purchasePrice)} • Selling: {formatCurrency(sn.sellingPrice)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          sn.status === 'In Stock'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sn.status === 'Sold'
                            ? 'bg-blue-100 text-blue-800'
                            : sn.status === 'Under Repair'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {sn.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {sn.customer ? (
                        <div>
                          <div className="font-semibold text-slate-800">{sn.customer.name}</div>
                          <div className="text-[11px] text-slate-400">{formatDate(sn.saleDate)}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not sold yet</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {sn.salesInvoice ? (
                        <span className="font-semibold text-indigo-600">
                          {sn.salesInvoice.invoiceNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600">
                      {sn.warrantyEnd ? (
                        <span>Valid till {formatDate(sn.warrantyEnd)}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedSerial(sn);
                          setNewStatus(sn.status);
                          setNewNotes(sn.notes || '');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg font-semibold transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Status</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Status Modal */}
      {selectedSerial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Update Status for {selectedSerial.serialNumber}
            </h3>
            <p className="text-xs text-slate-500 mb-4">{selectedSerial.product?.name}</p>

            <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="In Stock">In Stock</option>
                  <option value="Sold">Sold</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Under Repair">Under Repair</option>
                  <option value="Returned">Returned</option>
                  <option value="Warranty Claim">Warranty Claim</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Remarks / Diagnostics</label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Screen replaced, thermal paste updated..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSerial(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Serial Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">Add Serialized Product</h3>
            <form onSubmit={handleAddNewSerial} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Serial Number *</label>
                <input
                  type="text"
                  required
                  value={addForm.serialNumber}
                  onChange={(e) => setAddForm({ ...addForm, serialNumber: e.target.value })}
                  placeholder="e.g. LAT5410-99210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Choose Product *</label>
                <select
                  required
                  value={addForm.productId}
                  onChange={(e) => {
                    const p = products.find((x) => x.id === e.target.value);
                    setAddForm({
                      ...addForm,
                      productId: e.target.value,
                      purchasePrice: p?.purchasePrice || 0,
                      sellingPrice: p?.sellingPrice || 0,
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Cost (₹)</label>
                  <input
                    type="number"
                    value={addForm.purchasePrice}
                    onChange={(e) => setAddForm({ ...addForm, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={addForm.sellingPrice}
                    onChange={(e) => setAddForm({ ...addForm, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
                >
                  Save Serial Number
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SerialNumbersPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading serial numbers...</div>}>
      <SerialNumbersContent />
    </Suspense>
  );
}

