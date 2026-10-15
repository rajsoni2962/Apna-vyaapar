'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import {
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Hash,
  PenTool
} from 'lucide-react';

export default function InvoiceSettingsPage() {
  const [formData, setFormData] = useState({
    invoicePrefix: 'AT/2026/',
    nextInvoiceNumber: 110,
    purchasePrefix: 'PO/2026/',
    nextPurchaseNumber: 201,
    terms: '',
    footer: '',
    authorizedSignatory: 'Ashirwad Tech\nRaj Soni\nProprietor',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setFormData((prev) => ({
            ...prev,
            invoicePrefix: data.data.invoicePrefix || 'AT/2026/',
            nextInvoiceNumber: data.data.nextInvoiceNumber || 110,
            purchasePrefix: data.data.purchasePrefix || 'PO/2026/',
            nextPurchaseNumber: data.data.nextPurchaseNumber || 201,
            terms: data.data.terms || '',
            footer: data.data.footer || '',
            authorizedSignatory: data.data.authorizedSignatory || '',
          }));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Invoice & Terms settings updated successfully.');
      } else {
        setErrorMsg(data.error || 'Failed to update settings');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-600" />
            Invoice & Purchase Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Customize auto-numbering prefixes, warranty terms, invoice disclosures, and signatory text.
          </p>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-2xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-xs text-center flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-sm text-slate-500">Loading settings...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 md:p-8 space-y-8">
            {/* Auto Numbering */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900">Document Auto-Numbering Series</h2>
                <p className="text-xs text-slate-400">Controls how sequential bill and PO numbers are generated.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-indigo-600" />
                    Customer Tax Invoice Series
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Prefix</label>
                      <input
                        type="text"
                        value={formData.invoicePrefix}
                        onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                        className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Next Serial Number</label>
                      <input
                        type="number"
                        value={formData.nextInvoiceNumber}
                        onChange={(e) => setFormData({ ...formData, nextInvoiceNumber: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Sample next: <span className="font-mono font-bold text-indigo-600">{formData.invoicePrefix}{formData.nextInvoiceNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-orange-600" />
                    Supplier Purchase Order Series
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Prefix</label>
                      <input
                        type="text"
                        value={formData.purchasePrefix}
                        onChange={(e) => setFormData({ ...formData, purchasePrefix: e.target.value })}
                        className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Next Serial Number</label>
                      <input
                        type="number"
                        value={formData.nextPurchaseNumber}
                        onChange={(e) => setFormData({ ...formData, nextPurchaseNumber: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Sample next: <span className="font-mono font-bold text-orange-600">{formData.purchasePrefix}{formData.nextPurchaseNumber}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900">Terms & Conditions (Tax Invoice)</h2>
                <p className="text-xs text-slate-400">Printed on the bottom-left of every generated A4 Tax Invoice.</p>
              </div>

              <div>
                <textarea
                  rows={6}
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  placeholder="Enter warranty policies, inspection guidelines, return rules..."
                  className="w-full p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono leading-relaxed"
                />
              </div>
            </div>

            {/* Footer & Signatory */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Footer Greeting</label>
                <input
                  type="text"
                  value={formData.footer}
                  onChange={(e) => setFormData({ ...formData, footer: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Authorized Signatory Label</label>
                <textarea
                  rows={2}
                  value={formData.authorizedSignatory}
                  onChange={(e) => setFormData({ ...formData, authorizedSignatory: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-slate-950 gold-gradient-bg hover:opacity-95 rounded-xl shadow-md gold-glow transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Invoice Configuration'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
