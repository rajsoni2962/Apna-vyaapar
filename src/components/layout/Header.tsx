'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Camera, Menu, Bell, ShieldCheck } from 'lucide-react';
import GlobalSearchModal from '../common/GlobalSearchModal';

interface HeaderProps {
  onToggleMobile?: () => void;
}

export default function Header({ onToggleMobile }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200/80 shadow-xs">
        {/* Left: Mobile Toggle & Search Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobile}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Trigger Button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs text-slate-500 bg-slate-100/80 hover:bg-slate-100 hover:text-slate-800 rounded-xl border border-slate-200 transition sm:w-80 justify-between"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <span className="truncate">Search invoice, laptop, serial, customer...</span>
            </div>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white rounded border border-slate-200 shadow-2xs">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/purchases/import-bill"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition"
          >
            <Camera className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">Import Bill</span>
          </Link>

          <Link
            href="/sales/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-xs shadow-amber-500/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Invoice</span>
          </Link>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Secure Admin Badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-900 font-semibold bg-amber-50/80 px-2.5 py-1 rounded-xl border border-amber-200/80">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Ashirwad Tech</span>
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
