'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import {
  Truck,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  ArrowUpRight,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  Camera
} from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gstin?: string | null;
  state: string;
  stateCode: string;
  openingBalance: number;
  currentBalance: number;
  notes?: string | null;
  _count?: {
    purchases: number;
    payments: number;
  };
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBalance, setFilterBalance] = useState<'all' | 'payable' | 'clear'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    state: 'Gujarat',
    stateCode: '24',
    openingBalance: '0',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      gstin: '',
      state: 'Gujarat',
      stateCode: '24',
      openingBalance: '0',
      notes: '',
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || '',
      gstin: sup.gstin || '',
      state: sup.state || 'Gujarat',
      stateCode: sup.stateCode || '24',
      openingBalance: sup.openingBalance.toString(),
      notes: sup.notes || '',
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const url = editingSupplier ? `/api/suppliers/${editingSupplier.id}` : '/api/suppliers';
      const method = editingSupplier ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchSuppliers();
      } else {
        setErrorMsg(data.error || 'Operation failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete supplier "${name}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchSuppliers();
      } else {
        alert(data.error || 'Failed to delete supplier');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    if (filterBalance === 'payable') return s.currentBalance > 0;
    if (filterBalance === 'clear') return s.currentBalance <= 0;
    return true;
  });

  const totalPayables = suppliers.reduce((acc, s) => acc + (s.currentBalance > 0 ? s.currentBalance : 0), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <Truck className="w-6 h-6 text-orange-600" />
              Supplier Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Vendors, distributors, purchase history, and outstanding payables.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/purchases/import-bill"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 shadow-xs transition"
            >
              <Camera className="w-4 h-4 text-purple-600" />
              Import Bill (OCR)
            </Link>
            <Link
              href="/suppliers/ledger"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition"
            >
              <BookOpen className="w-4 h-4 text-orange-600" />
              Supplier Ledgers
            </Link>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-orange-600 rounded-xl hover:bg-orange-700 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Add Supplier
            </button>
          </div>
        </div>

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Suppliers</div>
            <div className="text-2xl font-black text-slate-900 mt-2">{suppliers.length}</div>
            <div className="text-xs text-slate-400 mt-1">Dealers and component vendors</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Total Payables</div>
            <div className="text-2xl font-black text-rose-600 mt-2">₹{totalPayables.toLocaleString('en-IN')}</div>
            <div className="text-xs text-slate-400 mt-1">Pending payments to clear</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Vendors to Pay</div>
            <div className="text-2xl font-black text-orange-600 mt-2">
              {suppliers.filter((s) => s.currentBalance > 0).length}
            </div>
            <div className="text-xs text-slate-400 mt-1">Suppliers with non-zero balances</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by vendor name, GSTIN, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setFilterBalance('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                filterBalance === 'all'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({suppliers.length})
            </button>
            <button
              onClick={() => setFilterBalance('payable')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                filterBalance === 'payable'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pending Payables ({suppliers.filter((s) => s.currentBalance > 0).length})
            </button>
            <button
              onClick={() => setFilterBalance('clear')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                filterBalance === 'clear'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Settled ({suppliers.filter((s) => s.currentBalance <= 0).length})
            </button>
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-orange-600" />
              <span>Loading supplier records...</span>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <div className="font-semibold text-slate-700">No suppliers found</div>
              <p className="text-sm text-slate-500 mt-1">Add your parts and laptop dealers to start tracking bills.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Supplier / Vendor</th>
                    <th className="py-3.5 px-4">Location & GSTIN</th>
                    <th className="py-3.5 px-4">Purchase Bills</th>
                    <th className="py-3.5 px-4 text-right">Payable Balance</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          {s.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {s.phone}
                            </span>
                          )}
                          {s.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {s.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs">
                        {s.address ? (
                          <div className="flex items-start gap-1 text-slate-600 max-w-xs truncate">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span>{s.address}, {s.state} ({s.stateCode})</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">{s.state} ({s.stateCode})</span>
                        )}
                        {s.gstin && (
                          <div className="mt-1 font-mono text-[11px] text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded w-fit">
                            GST: {s.gstin}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-xs font-semibold text-slate-700">
                          {s._count?.purchases || 0} Purchase Bills
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {s._count?.payments || 0} Payments recorded
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div
                          className={`font-black text-sm ${
                            s.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          ₹{s.currentBalance.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {s.currentBalance > 0 ? 'Payment pending' : 'Zero balance'}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/suppliers/ledger?supplierId=${s.id}`}
                            className="p-1.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                            title="View Supplier Ledger"
                          >
                            <BookOpen className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/purchases/new?supplierId=${s.id}`}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Record Purchase Bill"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Supplier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Supplier"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal for Add / Edit */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-900 text-base">
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier / Vendor'}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Supplier / Agency Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Navkar Computers"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="e.g. dealer@domain.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier GSTIN</label>
                    <input
                      type="text"
                      placeholder="e.g. 24ABCDE1234F1Z5"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                      className="w-full px-3 py-2 text-sm uppercase bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Office / Shop Address</label>
                  <textarea
                    rows={2}
                    placeholder="Complex, Market, Road..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State Code</label>
                    <input
                      type="text"
                      value={formData.stateCode}
                      onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Payable (₹)</label>
                    <input
                      type="number"
                      disabled={!!editingSupplier}
                      value={formData.openingBalance}
                      onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Terms</label>
                  <input
                    type="text"
                    placeholder="e.g. Refurbished laptops supplier, 30 days credit"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white"
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
                    className="px-5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Register Supplier'}
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
