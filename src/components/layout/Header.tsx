'use client';

import React, { useState, useEffect } from 'react';
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
  LogOut,
  ChevronDown,
  Check,
  Store,
  Users,
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
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeProfile, setActiveProfile] = useState<any>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    fetch('/api/business-profiles')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.length > 0) {
          setProfiles(json.data);
          const savedId = typeof window !== 'undefined' ? localStorage.getItem('activeProfileId') : null;
          const match = json.data.find((p: any) => p.id === savedId) || json.data.find((p: any) => p.isDefault) || json.data[0];
          setActiveProfile(match);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectProfile = (p: any) => {
    setActiveProfile(p);
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeProfileId', p.id);
      window.dispatchEvent(new Event('businessProfileChanged'));
    }
    setProfileDropdownOpen(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      window.location.href = '/login';
    }
  };

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
            className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs text-slate-500 bg-slate-100/80 hover:bg-slate-100 hover:text-slate-800 rounded-xl border border-slate-200 transition sm:w-72 justify-between"
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

        {/* Right: Business Profile Switcher & Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Active Business Profile Switcher */}
          {profiles.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/90 hover:bg-slate-200/80 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 transition max-w-[200px] sm:max-w-xs"
                title="Active Business Branch / Profile"
              >
                <Store className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate text-left">{activeProfile?.name || 'Ashirwad Technologies'}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Switch Business Profile</span>
                      <Link
                        href="/settings/profiles"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="text-[11px] font-bold text-indigo-600 hover:underline"
                      >
                        Manage
                      </Link>
                    </div>

                    <div className="py-1 max-h-56 overflow-y-auto">
                      {profiles.map((p) => {
                        const isCurrent = activeProfile?.id === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => handleSelectProfile(p)}
                            className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition ${
                              isCurrent ? 'bg-indigo-50/80 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <div className="truncate">{p.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">{p.companyName}</div>
                            </div>
                            {isCurrent && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 px-3">
                      <Link
                        href="/settings/profiles"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="block w-full text-center py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      >
                        + Add Another Business Branch
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

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
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
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
                      href="/settings/profiles"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                    >
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span>Business Profiles & Branches</span>
                    </Link>
                    <Link
                      href="/settings/users"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                    >
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>Team & User Accounts</span>
                    </Link>
                    <Link
                      href="/settings/invoice"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                    >
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>Visual Invoice Designer</span>
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

                    <button
                      id="btn-header-signout"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
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
