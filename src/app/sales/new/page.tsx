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
  Download,
  Wrench,
} from 'lucide-react';
import { formatCurrency, numberToWords, getInvoiceTypeTitle, getTaxConfigLabel } from '@/lib/utils';
import Link from 'next/link';
import WhatsAppShareModal from '@/components/invoice/WhatsAppShareModal';
import CustomerSearchSelect from '@/components/common/CustomerSearchSelect';
import ProductSearchSelect from '@/components/common/ProductSearchSelect';

export default function NewSalesInvoicePage() {
  const router = useRouter();

  // Reference data
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  // Document Type & Tax Configuration
  const [invoiceType, setInvoiceType] = useState('TAX_INVOICE');
  const [taxConfiguration, setTaxConfiguration] = useState('CGST_SGST');

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('Professionally refurbished, fully tested, and ready to use. Clean, reliable, and backed by quality service.');
  const [terms, setTerms] = useState('');

  const isNoTax = invoiceType === 'BILL_OF_SUPPLY' || invoiceType === 'NON_GST' || taxConfiguration === 'NONE';
  const isExempt = taxConfiguration === 'EXEMPT';
  const isIgst = taxConfiguration === 'IGST';

  const handleInvoiceTypeChange = (newType: string) => {
    setInvoiceType(newType);
    if (newType === 'BILL_OF_SUPPLY' || newType === 'NON_GST') {
      setTaxConfiguration('NONE');
    } else if (newType === 'CASH_MEMO') {
      setPaymentMode('Cash');
    } else if (taxConfiguration === 'NONE') {
      setTaxConfiguration('CGST_SGST');
    }
  };

  const handleCustomerSelect = (cust: any) => {
    setCustomerId(cust?.id || '');
    if (cust && !customers.some((c) => c.id === cust.id)) {
      setCustomers((prev) => [...prev, cust]);
    }
    // Auto-detect inter-state vs intra-state
    if (invoiceType !== 'BILL_OF_SUPPLY' && invoiceType !== 'NON_GST' && taxConfiguration !== 'NONE' && taxConfiguration !== 'EXEMPT') {
      const stateCode = cust?.stateCode?.trim();
      const stateName = cust?.state?.trim().toLowerCase();
      const isInterstate = (stateCode && stateCode !== '24') || (stateName && stateName !== 'gujarat');
      if (isInterstate) {
        setTaxConfiguration('IGST');
      } else if (taxConfiguration === 'IGST') {
        setTaxConfiguration('CGST_SGST');
      }
    }
  };

  // Items
  const [items, setItems] = useState<any[]>([
    {
      productId: '',
      product: null,
      isService: false,
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

  const handleProductSelect = (index: number, prod: any) => {
    const updated = [...items];
    const item = { ...updated[index] };

    if (!prod) {
      item.productId = '';
      item.product = null;
      item.isService = false;
      item.description = '';
      item.rate = 0;
      item.serialNumber = '';
      item.availableSerials = [];
      item.taxableAmount = 0;
      item.gstAmount = 0;
      item.total = 0;
      updated[index] = item;
      setItems(updated);
      return;
    }

    const isService = prod.productType === 'SERVICE' || prod.category?.toLowerCase() === 'service';

    item.productId = prod.id;
    item.product = prod;
    item.isService = isService;
    item.description = prod.name;
    item.hsn = prod.hsn || (isService ? '9987' : '8471');
    item.rate = prod.sellingPrice || 0;
    item.gstPercent = prod.gstPercent !== undefined ? prod.gstPercent : 18;
    item.serialNumber = '';

    // Filter available serial numbers for physical products
    item.availableSerials = isService ? [] : (prod.serialNumbers || []);

    const qty = item.quantity || 1;
    const effectiveGst = (isNoTax || isExempt) ? 0 : (item.gstPercent || 18);
    const baseAmount = Math.max(0, qty * item.rate - (item.discount || 0));
    let taxable = baseAmount;
    let gstAmt = 0;
    if (!isNoTax && !isExempt && effectiveGst > 0) {
      taxable = round2(baseAmount / (1 + effectiveGst / 100));
      gstAmt = round2(baseAmount - taxable);
    }

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
    const effectiveGst = (isNoTax || isExempt) ? 0 : (parseFloat(it.gstPercent) || 18);

    const baseAmount = Math.max(0, qty * rate - disc);
    let taxable = baseAmount;
    let gstAmt = 0;
    if (!isNoTax && !isExempt && effectiveGst > 0) {
      taxable = round2(baseAmount / (1 + effectiveGst / 100));
      gstAmt = round2(baseAmount - taxable);
    }

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

  let taxableTotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (!isNoTax && !isExempt) {
    const totalItemTaxable = items.reduce((acc, it) => acc + (it.taxableAmount || 0), 0);
    const totalItemGst = items.reduce((acc, it) => acc + (it.gstAmount || 0), 0);
    const factor = rawSubtotal > 0 ? grandTotal / rawSubtotal : 1;
    taxableTotal = round2(totalItemTaxable * factor);
    const totalGst = round2(totalItemGst * factor);

    if (isIgst) {
      igst = totalGst;
      cgst = 0;
      sgst = 0;
    } else {
      cgst = round2(totalGst / 2);
      sgst = round2(totalGst / 2);
      igst = 0;
    }
  } else if (isExempt) {
    taxableTotal = grandTotal;
  }

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
        invoiceType,
        taxConfiguration,
        subtotal: rawSubtotal,
        discountPercent: discPct,
        discountAmount: overallDiscountAmount,
        taxableAmount: taxableTotal,
        cgst,
        sgst,
        igst,
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
          gstPercent: (isNoTax || isExempt) ? 0 : it.gstPercent,
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
              <span>{getInvoiceTypeTitle(invoiceType)}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {invoiceType === 'QUOTATION'
                ? 'Create formal quotation / estimate • Does not deduct stock or affect ledger'
                : invoiceType === 'BILL_OF_SUPPLY'
                ? 'Bill of Supply • Composition / Nil-rated supply • No GST charged'
                : invoiceType === 'NON_GST'
                ? 'Non-GST Invoice • Unregistered goods & services • No tax breakdown'
                : 'Official customer invoice • Select serialized laptop • Automatic stock & tax tracking'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateInvoice}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-xs transition inline-flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Generate {invoiceType === 'QUOTATION' ? 'Quotation' : invoiceType === 'CASH_MEMO' ? 'Cash Memo' : 'Invoice'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Invoice Form Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Document Type & Tax Configuration Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Invoice Type & Tax Configuration</span>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {getInvoiceTypeTitle(invoiceType)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Invoice Document Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={invoiceType}
                  onChange={(e) => handleInvoiceTypeChange(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-indigo-600 focus:bg-white"
                >
                  <option value="TAX_INVOICE">Tax Invoice (Standard GST Invoice)</option>
                  <option value="BILL_OF_SUPPLY">Bill of Supply (Composition / Nil-rated / No Tax)</option>
                  <option value="NON_GST">Non-GST Invoice (Unregistered / Non-taxable Goods)</option>
                  <option value="PROFORMA">Proforma Invoice (Advance Estimate / Preliminary)</option>
                  <option value="QUOTATION">Quotation / Estimate (Formal Quote - No Stock Decrement)</option>
                  <option value="CASH_MEMO">Cash Memo (Direct Counter Cash Sale Receipt)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {invoiceType === 'QUOTATION'
                    ? 'Quotations provide price estimates and do NOT decrement stock or affect customer balance.'
                    : invoiceType === 'BILL_OF_SUPPLY' || invoiceType === 'NON_GST'
                    ? 'Taxes cannot be charged on Bill of Supply or Non-GST invoices under GST law.'
                    : invoiceType === 'CASH_MEMO'
                    ? 'Counter cash memo for retail counter sales.'
                    : 'Standard GST tax invoice for B2B or B2C transactions.'}
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Tax Configuration <span className="text-rose-500">*</span>
                </label>
                <select
                  value={taxConfiguration}
                  onChange={(e) => setTaxConfiguration(e.target.value)}
                  disabled={invoiceType === 'BILL_OF_SUPPLY' || invoiceType === 'NON_GST'}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-indigo-600 focus:bg-white disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="CGST_SGST">CGST + SGST (Intra-State: 50% CGST / 50% SGST)</option>
                  <option value="IGST">IGST (Inter-State: Integrated GST)</option>
                  <option value="EXEMPT">Exempt / Nil-Rated (0% GST)</option>
                  <option value="NONE">No GST / Non-Taxable</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {invoiceType === 'BILL_OF_SUPPLY' || invoiceType === 'NON_GST'
                    ? 'Locked to No GST / Non-Taxable for this invoice type.'
                    : taxConfiguration === 'IGST'
                    ? 'Inter-state transaction (outside Gujarat). 100% tax allocated to IGST.'
                    : taxConfiguration === 'EXEMPT'
                    ? 'Goods or services exempt from GST. Tax calculated as 0%.'
                    : taxConfiguration === 'NONE'
                    ? 'No tax will be applied or printed on this invoice.'
                    : 'Intra-state transaction (within Gujarat). Tax split equally between CGST and SGST.'}
                </p>
              </div>
            </div>
          </div>

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

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Select Existing Customer (Search by Name, Mobile, GSTIN, City)
                </label>
                <CustomerSearchSelect
                  selectedCustomer={selectedCustomer || null}
                  onSelectCustomer={handleCustomerSelect}
                  onAddNewCustomer={() => setShowAddCustomerModal(true)}
                />
              </div>

              {selectedCustomer && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                </div>
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

                  {/* Product Search Autocomplete */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                    <div className="sm:col-span-8">
                      <label className="block text-slate-600 font-semibold mb-1">
                        Select Product / Service (Search Name, Specs, Brand, Model, Serial...)
                      </label>
                      <ProductSearchSelect
                        selectedProduct={it.product || products.find((p) => p.id === it.productId) || null}
                        onSelectProduct={(p) => handleProductSelect(idx, p)}
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-purple-700 font-semibold mb-1 flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5" />
                        <span>Serial Number</span>
                      </label>
                      {it.isService ? (
                        <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-400 font-medium text-xs flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-blue-500" />
                          <span>N/A (Service Item)</span>
                        </div>
                      ) : (
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
                      )}
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
                  <div className={`grid grid-cols-2 ${isNoTax || isExempt ? 'sm:grid-cols-4' : 'sm:grid-cols-5'} gap-3 text-xs`}>
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

                    {!isNoTax && !isExempt && (
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
                    )}

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
                {!isNoTax && !isExempt && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Taxable Value:</span>
                      <span>{formatCurrency(taxableTotal)}</span>
                    </div>
                    {isIgst ? (
                      <div className="flex justify-between text-slate-600">
                        <span>IGST (18%):</span>
                        <span>{formatCurrency(igst)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>CGST (9%):</span>
                          <span>{formatCurrency(cgst)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>SGST (9%):</span>
                          <span>{formatCurrency(sgst)}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
                {isExempt && (
                  <div className="flex justify-between text-slate-500">
                    <span>Tax (Exempt / Nil-Rated):</span>
                    <span className="font-medium">₹0.00 (0%)</span>
                  </div>
                )}
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
                <span>Confirm & Generate {invoiceType === 'QUOTATION' ? 'Quotation' : invoiceType === 'CASH_MEMO' ? 'Cash Memo' : 'Invoice'}</span>
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
                {getInvoiceTypeTitle(createdInvoice.invoiceType)} Created Successfully
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
