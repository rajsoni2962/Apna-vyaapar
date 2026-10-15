'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Plus,
  Trash2,
  CheckCircle2,
  Users,
  Search,
  Package,
  Hash,
  ArrowLeft,
  UserPlus,
  MessageCircle,
  FileText,
  Eye,
  Download
} from 'lucide-react';
import { formatCurrency, numberToWords } from '@/lib/utils';
import Link from 'next/link';
import WhatsAppShareModal from '@/components/invoice/WhatsAppShareModal';

export default function NewSalesInvoicePage() {
  const router = useRouter();

  // Reference data
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('Professionally refurbished, fully tested, and ready to use. Clean, reliable, and backed by quality service.');
  const [terms, setTerms] = useState('');

  // Items
  const [items, setItems] = useState<any[]>([
    {
      productId: '',
      serialNumber: '',
      description: '',
      hsn: '8471',
      quantity: 1,
      unit: 'Pcs',
      rate: 0,
      discount: 0,
      gstPercent: 18,
      taxableAmount: 0,
      gstAmount: 0,
      total: 0,
      availableSerials: [],
    },
  ]);

  // Overall Discount
  const [overallDiscountPercent, setOverallDiscountPercent] = useState('0');

  // Quick Add Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustGstin, setNewCustGstin] = useState('');

  // Post-Save Invoice State
  const [createdInvoice, setCreatedInvoice] = useState<any | null>(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  useEffect(() => {
    fetch('/api/customers')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setCustomers(res.data);
      });
    fetch('/api/products')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setProducts(res.data);
      });
    fetch('/api/settings')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setSettings(res.data);
          setTerms(res.data.terms);
        }
      });
  }, []);

  const round2 = (num: number) => Math.round(num * 100) / 100;

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    const updated = [...items];
    const item = { ...updated[index] };

    item.productId = prodId;
    item.description = prod.name;
    item.hsn = prod.hsn || '8471';
    item.rate = prod.sellingPrice || 0;
    item.gstPercent = prod.gstPercent || 18;
    item.serialNumber = '';

    // Filter available serial numbers for this product
    item.availableSerials = prod.serialNumbers || [];

    const qty = item.quantity || 1;
    const baseAmount = Math.max(0, qty * item.rate - (item.discount || 0));
    const taxable = round2(baseAmount / (1 + item.gstPercent / 100));
    const gstAmt = round2(baseAmount - taxable);

    item.taxableAmount = taxable;
    item.gstAmount = gstAmt;
    item.total = round2(baseAmount);

    updated[index] = item;
    setItems(updated);
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...items];
    const it = { ...updated[index], [field]: val };

    const qty = parseFloat(it.quantity) || 1;
    const rate = parseFloat(it.rate) || 0;
    const disc = parseFloat(it.discount) || 0;
    const gstPct = parseFloat(it.gstPercent) || 18;

    const baseAmount = Math.max(0, qty * rate - disc);
    const taxable = round2(baseAmount / (1 + gstPct / 100));
    const gstAmt = round2(baseAmount - taxable);

    it.taxableAmount = taxable;
    it.gstAmount = gstAmt;
    it.total = round2(baseAmount);

    updated[index] = it;
    setItems(updated);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        productId: '',
        serialNumber: '',
        description: '',
        hsn: '8471',
        quantity: 1,
        unit: 'Pcs',
        rate: 0,
        discount: 0,
        gstPercent: 18,
        taxableAmount: 0,
        gstAmount: 0,
        total: 0,
        availableSerials: [],
      },
    ]);
  };

  const removeItem = (idx: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustName,
          phone: newCustPhone,
          address: newCustAddress,
          gstin: newCustGstin,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCustomers([...customers, json.data]);
        setCustomerId(json.data.id);
        setShowAddCustomerModal(false);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustAddress('');
        setNewCustGstin('');
      } else {
        alert(json.error || 'Failed to create customer');
      }
    } catch (err: any) {
      alert('Error creating customer');
    }
  };

  // Financial Calculations
  const rawSubtotal = round2(items.reduce((acc, it) => acc + (it.total || 0), 0));
  const discPct = parseFloat(overallDiscountPercent) || 0;
  const overallDiscountAmount = round2((rawSubtotal * discPct) / 100);
  const grandTotal = Math.max(0, round2(rawSubtotal - overallDiscountAmount));

  const taxableTotal = round2(grandTotal / 1.18);
  const totalGst = round2(grandTotal - taxableTotal);
  const cgst = round2(totalGst / 2);
  const sgst = round2(totalGst / 2);

  const numericPaid = paidAmount === '' ? grandTotal : parseFloat(paidAmount) || 0;
  const balanceDue = Math.max(0, round2(grandTotal - numericPaid));

  const handleCreateInvoice = async () => {
    if (!customerId) {
      alert('Please select or add a Customer');
      return;
    }

    const invalidItem = items.find((i) => !i.productId || i.rate <= 0);
    if (invalidItem) {
      alert('Please select a valid product and price for all item rows.');
      return;
    }

    try {
      const payload = {
        customerId,
        date: new Date(date),
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotal: rawSubtotal,
        discountPercent: discPct,
        discountAmount: overallDiscountAmount,
        taxableAmount: taxableTotal,
        cgst,
        sgst,
        igst: 0,
        grandTotal,
        paidAmount: numericPaid,
        paymentMode,
        paymentReference,
        notes,
        terms,
        items: items.map((it) => ({
          productId: it.productId,
          serialNumber: it.serialNumber || null,
          description: it.description,
          hsn: it.hsn,
          quantity: it.quantity,
          unit: it.unit,
          rate: it.rate,
          discount: it.discount,
          gstPercent: it.gstPercent,
          taxableAmount: it.taxableAmount,
          gstAmount: it.gstAmount,
          total: it.total,
        })),
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setCreatedInvoice(json.data);
      } else {
        alert(json.error || 'Failed to create invoice');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error creating invoice');
    }
  };

  const selectedCustomer = customers.find((c) => c.id === customerId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/sales/invoices"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-indigo-600" />
              <span>New Sales Tax Invoice</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Create official customer invoice • Select serialized laptop • Automatic GST & stock deduction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateInvoice}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-xs transition inline-flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Generate Tax Invoice</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Invoice Form Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Customer Selection Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Customer (Bill To)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add New Customer</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">
                  Select Existing Customer
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-indigo-600"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} • {c.phone} {c.currentBalance > 0 ? `(Due: ₹${c.currentBalance})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="text-slate-400 block text-[11px]">Phone & Email</span>
                    <strong className="text-slate-800">{selectedCustomer.phone}</strong>
                    <div className="text-slate-500">{selectedCustomer.email || 'No email registered'}</div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="text-slate-400 block text-[11px]">Address & GSTIN</span>
                    <div className="text-slate-800 font-medium truncate">{selectedCustomer.address || 'Ahmedabad, Gujarat'}</div>
                    <div className="text-slate-500 font-mono">{selectedCustomer.gstin || 'Unregistered Consumer'}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Line Items Table Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Package className="w-4 h-4 text-indigo-600" />
                <span>Invoice Line Items</span>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Row</span>
              </button>
            </div>

            <div className="space-y-4">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700"># {idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Product Dropdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                    <div className="sm:col-span-8">
                      <label className="block text-slate-600 font-semibold mb-1">
                        Select Product from Stock
                      </label>
                      <select
                        value={it.productId}
                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-indigo-600"
                      >
                        <option value="">-- Choose Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id} disabled={p.currentStock <= 0}>
                            {p.name} — [Stock: {p.currentStock} {p.currentStock <= 0 ? '(OUT OF STOCK)' : ''}] — {formatCurrency(p.sellingPrice)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-purple-700 font-semibold mb-1 flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5" />
                        <span>Serial Number</span>
                      </label>
                      <select
                        value={it.serialNumber}
                        onChange={(e) => handleItemChange(idx, 'serialNumber', e.target.value)}
                        className="w-full px-3 py-2 bg-purple-50/50 border border-purple-200 rounded-xl text-purple-900 font-mono font-semibold focus:outline-purple-600"
                      >
                        <option value="">-- Select In-Stock Serial # --</option>
                        {it.availableSerials?.map((sn: any) => (
                          <option key={sn.id} value={sn.serialNumber}>
                            {sn.serialNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description Input */}
                  <div>
                    <label className="block text-slate-600 text-xs font-semibold mb-1">
                      Item Description / Specs for Invoice Print
                    </label>
                    <input
                      type="text"
                      value={it.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      placeholder="e.g. Dell Latitude 5490 | i5 7th Gen | 8GB DDR4 | 256GB SSD"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs"
                    />
                  </div>

                  {/* Quantity, Rate, Discount & Total */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1">Selling Rate (₹)</label>
                      <input
                        type="number"
                        step="any"
                        value={it.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1">Discount (₹)</label>
                      <input
                        type="number"
                        step="any"
                        value={it.discount}
                        onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1">GST %</label>
                      <select
                        value={it.gstPercent}
                        onChange={(e) => handleItemChange(idx, 'gstPercent', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800"
                      >
                        <option value="18">18%</option>
                        <option value="12">12%</option>
                        <option value="28">28%</option>
                        <option value="5">5%</option>
                        <option value="0">0%</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1">Line Total</label>
                      <input
                        type="text"
                        readOnly
                        value={formatCurrency(it.total)}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-900 font-black"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Summary Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Invoice Metadata & Settlement Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Invoice Summary & Payment
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Overall Discount (%)</label>
                <input
                  type="number"
                  step="any"
                  value={overallDiscountPercent}
                  onChange={(e) => setOverallDiscountPercent(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              {/* Breakdown */}
              <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(rawSubtotal)}</span>
                </div>
                {overallDiscountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount ({overallDiscountPercent}%):</span>
                    <span>- {formatCurrency(overallDiscountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Value:</span>
                  <span>{formatCurrency(taxableTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST (9%):</span>
                  <span>{formatCurrency(cgst)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST (9%):</span>
                  <span>{formatCurrency(sgst)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t-2 border-slate-900">
                  <span>Grand Total:</span>
                  <span className="text-indigo-700">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {/* Payment Section */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <label className="block text-slate-700 font-bold">Payment Collection</label>

                <div>
                  <label className="block text-slate-500 mb-1">Amount Received (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder={`e.g. ${grandTotal} (Full)`}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold"
                  />
                  <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                    <button
                      type="button"
                      onClick={() => setPaidAmount(String(grandTotal))}
                      className="text-indigo-600 hover:underline font-semibold"
                    >
                      Collect Full
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaidAmount('0')}
                      className="text-slate-500 hover:underline"
                    >
                      Credit (0)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Card">Card</option>
                    <option value="Credit">Credit / Due</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-slate-100 flex items-center justify-between text-xs font-bold">
                  <span className={balanceDue > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    Balance Outstanding:
                  </span>
                  <span className={balanceDue > 0 ? 'text-rose-600 font-black' : 'text-emerald-700 font-black'}>
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleCreateInvoice}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-4"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Confirm & Generate Invoice</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">Add New Customer</h3>
            <form onSubmit={handleQuickAddCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Ronak Jain"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. 9825012345"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Address</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="e.g. Ahmedabad, Gujarat"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={newCustGstin}
                  onChange={(e) => setNewCustGstin(e.target.value)}
                  placeholder="e.g. 24AAAPL1234M1Z1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post-Save Invoice Screen */}
      {createdInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 text-center space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Invoice Created Successfully
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-3">
                {createdInvoice.invoiceNumber}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Customer: <span className="font-semibold text-slate-700">{selectedCustomer?.name || 'Client'}</span>
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-left">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Invoice Amount:</span>
                <span className="font-black text-slate-900 text-base">₹{createdInvoice.grandTotal?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Paid:</span>
                <span className="font-bold text-emerald-600">₹{createdInvoice.paidAmount?.toLocaleString('en-IN')}</span>
              </div>
              {createdInvoice.balanceDue > 0 && (
                <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-1">
                  <span className="text-rose-600 font-semibold">Balance Due:</span>
                  <span className="font-black text-rose-600">₹{createdInvoice.balanceDue?.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            {/* Actions matching prompt */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setIsWhatsAppOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2.5 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition"
              >
                <MessageCircle className="w-5 h-5" />
                Share on WhatsApp
              </button>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/sales/invoices/${createdInvoice.id}`}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  <Eye className="w-4 h-4 text-indigo-600" />
                  View PDF
                </Link>
                <a
                  href={`/api/invoices/${createdInvoice.id}/pdf`}
                  download
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  Download PDF
                </a>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCreatedInvoice(null);
                  router.push('/sales/invoices');
                }}
                className="w-full text-xs text-slate-400 hover:text-slate-600 py-1 transition"
              >
                Done / Back to Invoices
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Share Modal */}
      {isWhatsAppOpen && createdInvoice && (
        <WhatsAppShareModal
          isOpen={isWhatsAppOpen}
          onClose={() => setIsWhatsAppOpen(false)}
          invoice={{
            ...createdInvoice,
            customer: selectedCustomer,
          }}
        />
      )}
    </div>
  );
}
