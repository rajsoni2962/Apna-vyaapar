'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Camera,
  Menu,
  Bell,
  ShieldCheck,
  User,
  Building2,
  FileText,
  ExternalLink,
} from 'lucide-react';
import GlobalSearchModal from '../common/GlobalSearchModal';

function GithubIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

interface HeaderProps {
  onToggleMobile?: () => void;
}

export default function Header({ onToggleMobile }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 sm:pr-2.5 bg-slate-100 hover:bg-slate-200/80 rounded-2xl transition border border-slate-200/80"
              title="User Profile & Account"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-200 text-slate-950 font-bold text-xs flex items-center justify-center shadow-xs">
                RS
              </div>
              <div className="hidden md:block text-left text-xs leading-tight">
                <div className="font-bold text-slate-800">Raj Soni</div>
                <div className="text-[10px] text-slate-400">Admin</div>
              </div>
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="font-bold text-sm text-slate-900">Raj Soni</div>
                    <div className="text-xs text-slate-400 truncate">rajsoni2962@gmail.com</div>
                    <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                      Owner & Administrator
                    </span>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>My Profile</span>
                    </Link>
                    <Link
                      href="/settings/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                    >
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span>Business Settings</span>
                    </Link>
                    <Link
                      href="/settings/invoice"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                    >
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>Invoice Settings</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <a
                      href="https://github.com/rajsoni2962/Apna-vyaapar"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                      <span className="flex items-center gap-2">
                        <GithubIcon className="w-4 h-4 text-slate-500" />
                        GitHub Repo
                      </span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
