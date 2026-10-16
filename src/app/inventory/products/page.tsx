'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  SlidersHorizontal,
  Edit,
  Trash2,
  AlertTriangle,
  Laptop,
  CheckCircle2,
  X
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);

  // Form
  const [formData, setFormData] = useState<any>({
    name: '',
    productType: 'PHYSICAL', // PHYSICAL or SERVICE
    brand: '',
    model: '',
    category: 'Accessories',
    cpu: '',
    generation: '',
    ram: '',
    ramType: '',
    storage: '',
    storageType: '',
    gpu: '',
    displaySize: '',
    condition: 'Brand New',
    hsn: '8471',
    gstPercent: 18,
    purchasePrice: 0,
    sellingPrice: 0,
    minStock: 1,
    initialStock: 1,
    warranty: '1 Year',
    notes: '',
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/products?search=${encodeURIComponent(search)}&category=${categoryFilter}&brand=${brandFilter}`
      );
      const json = await res.json();
      if (json.success) setProducts(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, categoryFilter, brandFilter]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editProduct ? `/api/products/${editProduct.id}` : '/api/products';
      const method = editProduct ? 'PUT' : 'POST';

      const isAcc = formData.category === 'Accessories';
      const payload = {
        ...formData,
        ...(isAcc
          ? {
              cpu: null,
              generation: null,
              ram: null,
              ramType: null,
              storage: null,
              storageType: null,
              gpu: null,
              displaySize: null,
              condition: formData.condition || 'Brand New',
            }
          : {}),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        alert(editProduct ? 'Product updated successfully!' : 'Product created successfully!');
        setShowAddModal(false);
        setEditProduct(null);
        fetchProducts();
      } else {
        alert(json.error || 'Failed to save product');
      }
    } catch (err) {
      alert('Error saving product');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchProducts();
      } else {
        alert(json.error || 'Failed to delete');
      }
    } catch (err) {
      alert('Error deleting product');
    }
  };

  const openEdit = (p: any) => {
    setEditProduct(p);
    const isService = p.productType === 'SERVICE' || p.category?.toLowerCase() === 'service';
    const isAcc = p.category === 'Accessories';
    setFormData({
      name: p.name,
      productType: isService ? 'SERVICE' : (p.productType || 'PHYSICAL'),
      brand: p.brand || '',
      model: p.model || '',
      category: p.category || (isService ? 'Repair Service' : 'Accessories'),
      cpu: isAcc ? '' : (p.cpu || ''),
      generation: isAcc ? '' : (p.generation || ''),
      ram: isAcc ? '' : (p.ram || ''),
      ramType: isAcc ? '' : (p.ramType || ''),
      storage: isAcc ? '' : (p.storage || ''),
      storageType: isAcc ? '' : (p.storageType || ''),
      gpu: isAcc ? '' : (p.gpu || ''),
      displaySize: isAcc ? '' : (p.displaySize || ''),
      condition: p.condition || (isService ? 'Service' : isAcc ? 'Brand New' : 'Refurbished Grade A'),
      hsn: p.hsn || (isService ? '9987' : '8471'),
      gstPercent: p.gstPercent || 18,
      purchasePrice: p.purchasePrice || 0,
      sellingPrice: p.sellingPrice || 0,
      minStock: isService ? 0 : (p.minStock || 1),
      initialStock: isService ? 0 : (p.currentStock || 0),
      warranty: p.warranty || (isService ? '30 Days Service Warranty' : '1 Year'),
      notes: p.notes || '',
    });
    setShowAddModal(true);
  };

  const categories = [
    'All',
    'Laptop',
    'Desktop',
    'SSD',
    'RAM',
    'Accessories',
    'Repair Service',
    'Custom PC',
    'GPU',
    'Motherboard',
    'Other',
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-500" />
            <span>Product Catalog & Hardware Inventory</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Total {products.length} catalog items • Laptops, SSDs, RAM, components, and serialized refurbished machines.
          </p>
        </div>

        <button
          onClick={() => {
            setEditProduct(null);
            setFormData({
              name: '',
              brand: '',
              model: '',
              category: 'Accessories',
              cpu: '',
              generation: '',
              ram: '',
              ramType: '',
              storage: '',
              storageType: '',
              gpu: '',
              displaySize: '',
              condition: 'Brand New',
              hsn: '8471',
              gstPercent: 18,
              purchasePrice: 0,
              sellingPrice: 0,
              minStock: 1,
              initialStock: 1,
              warranty: '1 Year',
              notes: '',
            });
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Product</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Dell, HP, ThinkPad, SSD, i5, i7..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-indigo-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400 font-medium">Brand:</span>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold"
            >
              <option value="All">All Brands</option>
              <option value="Dell">Dell</option>
              <option value="HP">HP</option>
              <option value="Lenovo">Lenovo</option>
              <option value="Apple">Apple</option>
              <option value="Crucial">Crucial</option>
              <option value="Kingston">Kingston</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Product Details & Specs</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Condition</th>
                <th className="py-3 px-4 text-center">Stock Units</th>
                <th className="py-3 px-4 text-right">Purchase Cost</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center">Serials</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading product inventory...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No products found matching filters.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 space-x-1.5">
                        {p.brand && <span className="font-semibold text-slate-700">{p.brand}</span>}
                        {p.cpu && <span>• {p.cpu}</span>}
                        {p.ram && <span>• {p.ram}</span>}
                        {p.storage && <span>• {p.storage}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{p.category}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                        {p.condition}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {p.productType === 'SERVICE' || p.category?.toLowerCase() === 'service' ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Service
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-full ${
                            p.currentStock <= 0
                              ? 'bg-rose-100 text-rose-700'
                              : p.currentStock <= p.minStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.currentStock} in stock
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 font-medium">
                      {formatCurrency(p.purchasePrice)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-indigo-700 text-sm">
                      {formatCurrency(p.sellingPrice)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {p.productType === 'SERVICE' || p.category?.toLowerCase() === 'service' ? (
                        <span className="text-slate-400 font-mono text-xs">-</span>
                      ) : (
                        <span className="text-purple-700 font-mono font-bold text-xs bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                          {p._count?.serialNumbers || 0}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                        title="Edit Product"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-black text-slate-900">
                {editProduct ? 'Edit Product Details' : 'Add New Hardware / Laptop Product'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* Item Type Selector */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Item Type *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        productType: 'PHYSICAL',
                        category: formData.category === 'Repair Service' ? 'Laptop' : formData.category,
                        hsn: formData.hsn === '9987' ? '8471' : formData.hsn,
                      })
                    }
                    className={`py-2 px-3 rounded-xl border text-left font-bold transition flex items-center justify-between ${
                      formData.productType !== 'SERVICE'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>Physical Product</span>
                    <span className="text-[10px] font-semibold text-slate-400">Inventory Tracked</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        productType: 'SERVICE',
                        category: 'Repair Service',
                        hsn: '9987',
                        initialStock: 0,
                        minStock: 0,
                      })
                    }
                    className={`py-2 px-3 rounded-xl border text-left font-bold transition flex items-center justify-between ${
                      formData.productType === 'SERVICE'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-600/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>Service</span>
                    <span className="text-[10px] font-semibold text-blue-600">No Stock Units</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {formData.productType === 'SERVICE' ? 'Service Title *' : 'Product Title *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={
                    formData.productType === 'SERVICE'
                      ? 'e.g. Laptop Deep Cleaning & Thermal Paste Replacement'
                      : 'e.g. Dell Latitude 5410 | i5 10th Gen | 16GB RAM | 256GB SSD'
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      const isComputer = newCat === 'Laptop' || newCat === 'Desktop' || newCat === 'Custom PC';
                      const isAcc = newCat === 'Accessories';
                      setFormData((prev: any) => ({
                        ...prev,
                        category: newCat,
                        ...(isAcc || !isComputer
                          ? {
                              cpu: '',
                              generation: '',
                              ram: '',
                              ramType: '',
                              storage: '',
                              storageType: '',
                              gpu: '',
                              displaySize: '',
                            }
                          : {}),
                        ...(isAcc && (!prev.condition || prev.condition === 'Refurbished Grade A')
                          ? { condition: 'Brand New' }
                          : {}),
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    {formData.productType === 'SERVICE' ? (
                      <>
                        <option value="Repair Service">Repair Service</option>
                        <option value="Installation">Installation & Setup</option>
                        <option value="Maintenance">Cleaning & Maintenance</option>
                        <option value="Data Recovery">Data Recovery</option>
                        <option value="Other Service">Other Service</option>
                      </>
                    ) : (
                      <>
                        <option value="Accessories">Accessories</option>
                        <option value="Laptop">Laptop</option>
                        <option value="Desktop">Desktop</option>
                        <option value="SSD">SSD</option>
                        <option value="RAM">RAM</option>
                        <option value="Custom PC">Custom PC</option>
                        <option value="Motherboard">Motherboard</option>
                        <option value="GPU">GPU</option>
                        <option value="Other">Other</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {formData.productType === 'SERVICE' ? 'Service Code / Brand' : 'Brand'}
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder={formData.productType === 'SERVICE' ? 'e.g. In-Store / On-Site' : 'e.g. Dell, HP, Lenovo, Hammok'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {formData.productType === 'SERVICE' ? 'Sub-Type / Model' : 'Model'}
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder={formData.productType === 'SERVICE' ? 'e.g. All Laptops / General' : 'e.g. Wireless Combo / Latitude 5410'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    {formData.productType === 'SERVICE' ? (
                      <option value="Service">Service</option>
                    ) : (
                      <>
                        <option value="Brand New">Brand New</option>
                        <option value="Refurbished Grade A">Refurbished Grade A</option>
                        <option value="Refurbished Grade B">Refurbished Grade B</option>
                        <option value="Open Box">Open Box</option>
                        <option value="Used">Used</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Hardware Specs - Only for Complete Computer Systems (Laptop, Desktop, Custom PC) - NEVER for Accessories */}
              {formData.productType !== 'SERVICE' && (formData.category === 'Laptop' || formData.category === 'Desktop' || formData.category === 'Custom PC') && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-slate-700 font-bold block text-[11px] uppercase tracking-wider">
                    Detailed {formData.category} Specifications
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-slate-500 mb-0.5">CPU / Processor</label>
                      <input
                        type="text"
                        value={formData.cpu}
                        onChange={(e) => setFormData({ ...formData, cpu: e.target.value })}
                        placeholder="i5-10210U"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-0.5">Generation</label>
                      <input
                        type="text"
                        value={formData.generation}
                        onChange={(e) => setFormData({ ...formData, generation: e.target.value })}
                        placeholder="10th Gen"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-0.5">RAM</label>
                      <input
                        type="text"
                        value={formData.ram}
                        onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                        placeholder="16GB DDR4"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-0.5">Storage</label>
                      <input
                        type="text"
                        value={formData.storage}
                        onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                        placeholder="256GB NVMe"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing & Stock */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {formData.productType === 'SERVICE' ? 'Internal Cost (₹)' : 'Purchase Price (₹)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {formData.productType === 'SERVICE' ? 'Service Rate (₹) *' : 'Selling Price (₹) *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-indigo-700"
                  />
                </div>

                {formData.productType !== 'SERVICE' && !editProduct && (
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Opening Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.initialStock}
                      onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>
                )}

                {formData.productType !== 'SERVICE' && (
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Min Stock Alert</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.minStock}
                      onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                )}

                {formData.productType === 'SERVICE' && (
                  <div className="col-span-2 p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center gap-2 text-blue-800">
                    <span className="font-bold">Service Mode:</span>
                    <span className="text-[11px]">No inventory units tracked. Unlimited service capacity.</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {editProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
