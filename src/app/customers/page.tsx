'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  FileText,
  IndianRupee,
  Eye,
  Edit2,
  Trash2,
  BookOpen,
  ArrowUpRight,
  RefreshCw,
  X
} from 'lucide-react';

interface Customer {
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
  _count?: {
    invoices: number;
    payments: number;
  };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBalance, setFilterBalance] = useState<'all' | 'due' | 'clear'>('all');
  
  // Modal for Edit or Quick Add
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
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

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
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

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      gstin: customer.gstin || '',
      state: customer.state || 'Gujarat',
      stateCode: customer.stateCode || '24',
      openingBalance: customer.openingBalance.toString(),
      notes: customer.notes || '',
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchCustomers();
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
    if (!confirm(`Are you sure you want to delete customer "${name}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchCustomers();
      } else {
        alert(data.error || 'Failed to delete customer');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (filterBalance === 'due') return c.currentBalance > 0;
    if (filterBalance === 'clear') return c.currentBalance <= 0;
    return true;
  });

  const totalReceivables = customers.reduce((acc, c) => acc + (c.currentBalance > 0 ? c.currentBalance : 0), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <Users className="w-6 h-6 text-indigo-600" />
              Customer Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage client accounts, track outstanding dues, credit balances, and transaction history.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/customers/ledger"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition"
            >
              <BookOpen className="w-4 h-4 text-indigo-600" />
              View Ledgers
            </Link>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Add Customer
            </button>
          </div>
        </div>

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Customers</div>
            <div className="text-2xl font-black text-slate-900 mt-2">{customers.length}</div>
            <div className="text-xs text-slate-400 mt-1">Active customer accounts in database</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Total Receivables (Dues)</div>
            <div className="text-2xl font-black text-rose-600 mt-2">₹{totalReceivables.toLocaleString('en-IN')}</div>
            <div className="text-xs text-slate-400 mt-1">Outstanding from customers</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Accounts with Dues</div>
            <div className="text-2xl font-black text-emerald-600 mt-2">
              {customers.filter((c) => c.currentBalance > 0).length}
            </div>
            <div className="text-xs text-slate-400 mt-1">Pending payments to collect</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, phone, email, GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setFilterBalance('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                filterBalance === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({customers.length})
            </button>
            <button
              onClick={() => setFilterBalance('due')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                filterBalance === 'due'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pending Dues ({customers.filter((c) => c.currentBalance > 0).length})
            </button>
            <button
              onClick={() => setFilterBalance('clear')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                filterBalance === 'clear'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Settled / Clear ({customers.filter((c) => c.currentBalance <= 0).length})
            </button>
          </div>
        </div>

        {/* Customer Cards & Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span>Loading customer records...</span>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <div className="font-semibold text-slate-700">No customers found</div>
              <p className="text-sm text-slate-500 mt-1">Try adjusting your search criteria or add a new customer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Customer Name & Contact</th>
                    <th className="py-3.5 px-4">Location & GSTIN</th>
                    <th className="py-3.5 px-4">Invoices</th>
                    <th className="py-3.5 px-4 text-right">Current Balance</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {c.phone}
                          </span>
                          {c.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {c.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs">
                        {c.address ? (
                          <div className="flex items-start gap-1 text-slate-600 max-w-xs truncate">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span>{c.address}, {c.state} ({c.stateCode})</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">{c.state} ({c.stateCode})</span>
                        )}
                        {c.gstin && (
                          <div className="mt-1 font-mono text-[11px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded w-fit">
                            GST: {c.gstin}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-xs font-semibold text-slate-700">
                          {c._count?.invoices || 0} Invoices
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {c._count?.payments || 0} Payments recorded
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div
                          className={`font-black text-sm ${
                            c.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          ₹{c.currentBalance.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {c.currentBalance > 0 ? 'Due to collect' : 'No balance due'}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/customers/ledger?customerId=${c.id}`}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="View Customer Ledger"
                          >
                            <BookOpen className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/sales/new?customerId=${c.id}`}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Create Sales Invoice"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Customer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Customer"
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
                  {editingCustomer ? 'Edit Customer Details' : 'Add New Customer'}
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
                      Customer Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ronak Jain"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. customer@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 24AAAAA0000A1Z5"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                      className="w-full px-3 py-2 text-sm uppercase bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
                  <textarea
                    rows={2}
                    placeholder="Full address, shop / flat number..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State Code</label>
                    <input
                      type="text"
                      value={formData.stateCode}
                      onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance (₹)</label>
                    <input
                      type="number"
                      disabled={!!editingCustomer}
                      value={formData.openingBalance}
                      onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Notes</label>
                  <input
                    type="text"
                    placeholder="Credit terms, reference contact, etc."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
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
                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Create Customer'}
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
