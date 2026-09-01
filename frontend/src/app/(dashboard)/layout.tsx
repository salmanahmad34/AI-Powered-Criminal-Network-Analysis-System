'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'INVESTIGATOR' | 'SENIOR_OFFICER' | 'VIEWER';
  fullName: string;
}

// Security: Mask email to protect user privacy in UI
function maskEmail(email: string): string {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const [local, domain] = parts;
  const visible = local.length > 3 ? local.slice(0, 3) : local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Desktop sidebar state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Mobile drawer state
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [router]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-7 w-7 text-[var(--accent-color)]" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xs text-[var(--text-secondary)] font-medium tracking-wide">Verifying credentials…</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // RBAC Menu configuration
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z', roles: ['ADMIN', 'INVESTIGATOR', 'SENIOR_OFFICER', 'VIEWER'] },
    { name: 'Cases', path: '/cases', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', roles: ['ADMIN', 'INVESTIGATOR', 'SENIOR_OFFICER', 'VIEWER'] },
    { name: 'Data Center', path: '/datacenter', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', roles: ['INVESTIGATOR'] },
    { name: 'Processing', path: '/processing', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', roles: ['INVESTIGATOR'] },
    { name: 'Entities Database', path: '/entities', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', roles: ['ADMIN', 'INVESTIGATOR', 'SENIOR_OFFICER', 'VIEWER'] },
    { name: 'Network Analysis', path: '/network', icon: 'M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z', roles: ['ADMIN', 'INVESTIGATOR', 'SENIOR_OFFICER', 'VIEWER'] },
    { name: 'Alerts Queue', path: '/alerts', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', roles: ['ADMIN', 'INVESTIGATOR', 'SENIOR_OFFICER', 'VIEWER'] },
    { name: 'AI Assistant', path: '/ai', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', roles: ['INVESTIGATOR', 'SENIOR_OFFICER'] },
    { name: 'Documents', path: '/documents', icon: 'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2', roles: ['ADMIN', 'INVESTIGATOR', 'SENIOR_OFFICER', 'VIEWER'] },
    { name: 'Intelligence Reports', path: '/reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', roles: ['ADMIN', 'INVESTIGATOR', 'SENIOR_OFFICER', 'VIEWER'] },
    { name: 'Audit Logs', path: '/logs', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', roles: ['ADMIN', 'SENIOR_OFFICER'] },
    { name: 'Admin Panel', path: '/admin', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', roles: ['ADMIN'] },
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  const renderNavContent = () => (
    <>
      {/* Brand */}
      <div className="h-14 lg:h-16 flex items-center justify-between px-5 lg:px-6 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[var(--accent-muted)] border border-[var(--card-border)] rounded-lg text-[var(--accent-color)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <span className="font-bold text-sm text-[var(--text-primary)] tracking-tight">CrimeGraph AI</span>
        </div>

        {/* Mobile close button */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-lg"
          aria-label="Close navigation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 lg:px-4 py-5 space-y-6 overflow-y-auto touch-scroll">
        {/* Main Intelligence Section */}
        <div className="space-y-1">
          <span className="px-3 lg:px-4 text-[10px] font-extrabold text-stone-400 tracking-wider uppercase block mb-2">Intelligence</span>
          {visibleMenuItems
            .filter(item => !['Admin Panel', 'Audit Logs'].includes(item.name))
            .map((item) => {
              const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
              let displayName = item.name;
              if (item.name === 'Dashboard') displayName = 'Overview';
              if (item.name === 'Entities Database') displayName = 'Entities';
              if (item.name === 'Alerts Queue') displayName = 'Alerts';
              if (item.name === 'Intelligence Reports') displayName = 'Reports';

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 lg:px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[var(--accent-color)] text-white shadow-sm'
                      : 'text-stone-500 hover:bg-stone-50 hover:text-foreground'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  <span className="truncate">{displayName}</span>
                </Link>
              );
            })}
        </div>

        {/* Administration Section */}
        {visibleMenuItems.some(item => ['Admin Panel', 'Audit Logs'].includes(item.name)) && (
          <div className="space-y-1">
            <span className="px-3 lg:px-4 text-[10px] font-extrabold text-stone-400 tracking-wider uppercase block mb-2">Administration</span>
            {visibleMenuItems
              .filter(item => ['Admin Panel', 'Audit Logs'].includes(item.name))
              .map((item) => {
                const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
                let displayName = item.name;
                if (item.name === 'Admin Panel') displayName = 'Admin';

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 lg:px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[var(--accent-color)] text-white shadow-sm'
                        : 'text-stone-500 hover:bg-stone-50 hover:text-foreground'
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75">
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                    <span className="truncate">{displayName}</span>
                  </Link>
                );
              })}
            
            <div className="flex items-center gap-3 px-3.5 lg:px-4 py-2.5 rounded-lg text-xs font-semibold text-stone-400 cursor-not-allowed opacity-50">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              <span>Settings</span>
            </div>
          </div>
        )}
      </nav>

      {/* User Info footer */}
      <div className="p-4 border-t border-border bg-stone-50 flex items-center justify-between shrink-0">
        <div className="min-w-0 pr-2">
          <p className="text-xs font-bold text-foreground truncate">{user.fullName}</p>
          <p className="text-[10px] text-stone-400 font-medium truncate">{maskEmail(user.email)}</p>
          <span className="inline-flex mt-1.5 px-2 py-0.5 text-[9px] font-extrabold tracking-wider rounded bg-stone-200 border border-stone-300 text-stone-600 uppercase">
            {user.role}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="p-2.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
          title="Log Out"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer (Slide-over) */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[var(--sidebar-bg)] border-r border-border flex flex-col z-50 lg:hidden transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderNavContent()}
      </aside>

      {/* Desktop Sidebar (Collapsible) */}
      <aside
        className={`hidden lg:flex ${
          sidebarOpen ? 'w-64' : 'w-0 -translate-x-full border-r-0'
        } transition-all duration-300 ease-in-out bg-[var(--sidebar-bg)] border-r border-border flex-col z-20 shrink-0 overflow-hidden`}
      >
        {renderNavContent()}
      </aside>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden relative w-full">
        {/* Responsive Header */}
        <header className="h-14 bg-white border-b border-[var(--border)] flex items-center justify-between px-4 sm:px-6 z-10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] rounded-lg cursor-pointer transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Open mobile menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Desktop Sidebar Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] rounded-md cursor-pointer transition-all"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Current Page Title */}
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {visibleMenuItems.find(item => pathname === item.path || pathname?.startsWith(item.path + '/'))?.name || 'System'}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-700 tracking-wide whitespace-nowrap">DEMO DATABASE</span>
            </div>
            <span className="hidden sm:inline-block text-[10px] font-bold text-[var(--text-tertiary)] tracking-widest uppercase">DEV PORTAL</span>
          </div>
        </header>

        {/* Main Content Pane */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background touch-scroll">
          {children}
        </main>
      </div>
    </div>
  );
}
