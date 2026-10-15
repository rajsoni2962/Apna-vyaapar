'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import {
  Download,
  Upload,
  Database,
  ShieldCheck,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive
} from 'lucide-react';

export default function BackupPage() {
  const [downloading, setDownloading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState('');

  const handleExportAll = async () => {
    setDownloading(true);
    setExportSuccess('');
    try {
      const res = await fetch('/api/backup?table=all');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ashirwad_tech_full_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setExportSuccess('Complete database JSON archive successfully downloaded.');
    } catch (err: any) {
      alert(err.message || 'Export failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleExportTable = async (table: string, filename: string) => {
    try {
      const res = await fetch(`/api/backup?table=${table}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Database className="w-6 h-6 text-indigo-600" />
            Database Backup & Data Portability
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Safeguard your commercial data with 1-click comprehensive JSON exports and audit dumps.
          </p>
        </div>

        {exportSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-2xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{exportSuccess}</span>
          </div>
        )}

        {/* Full Backup Card */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Zero-Loss Relational Archive
              </div>
              <h2 className="text-xl font-black">Complete System Snapshot (JSON)</h2>
              <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
                Exports all customers, suppliers, inventory catalog, serial numbers, sales invoices, supplier purchase bills, payment ledger vouchers, and stock movement logs into a unified, encrypted-ready JSON document.
              </p>
            </div>

            <button
              onClick={handleExportAll}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50 shrink-0"
            >
              {downloading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating Archive...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Full Backup (.json)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Granular Table Exports */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Granular Table Downloads</h2>
            <p className="text-xs text-slate-400">Download specific data tables for Excel import or accounting audits.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 text-sm">Products & Laptops Catalog</div>
                <div className="text-xs text-slate-400">Specs, pricing, and current stock</div>
              </div>
              <button
                onClick={() => handleExportTable('products', 'ashirwad_products')}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
              >
                Export JSON
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 text-sm">Customer Directory</div>
                <div className="text-xs text-slate-400">Names, contact numbers, and balances</div>
              </div>
              <button
                onClick={() => handleExportTable('customers', 'ashirwad_customers')}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
              >
                Export JSON
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 text-sm">Supplier Accounts</div>
                <div className="text-xs text-slate-400">Vendor directory and pending payables</div>
              </div>
              <button
                onClick={() => handleExportTable('suppliers', 'ashirwad_suppliers')}
                className="px-3 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition"
              >
                Export JSON
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 text-sm">Sales Invoices & Items</div>
                <div className="text-xs text-slate-400">Full billing and item breakdown history</div>
              </div>
              <button
                onClick={() => handleExportTable('invoices', 'ashirwad_invoices')}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
              >
                Export JSON
              </button>
            </div>
          </div>
        </div>

        {/* Security & Persistence Notice */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 flex items-start gap-3 text-xs text-slate-600">
          <HardDrive className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-slate-900">Database Engine: SQLite (Local ACID Relational Persistence)</div>
            <p>
              Your database file is locally stored at <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">prisma/dev.db</code> with atomic transactions. We recommend downloading weekly JSON backups or backing up the <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">dev.db</code> file.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
