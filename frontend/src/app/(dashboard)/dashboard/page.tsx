'use client';

import React from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome Header */}
      <div className="pb-5 sm:pb-6 border-b border-[var(--border)]">
        <span className="text-[10px] font-bold text-[var(--teal-accent)] tracking-widest uppercase block mb-1.5 sm:mb-2">CRIMEGRAPH AI</span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Investigation Intelligence Platform
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 max-w-2xl leading-relaxed">
          Analyze authorized synthetic investigation data, structure entity profiles from unstructured records, and discover potential relationship pathways across intelligence envelopes.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {[
          {
            name: 'Active Cases',
            value: '47',
            change: '+3 this week',
            icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
            href: '/cases',
          },
          {
            name: 'Entities Extracted',
            value: '2,941',
            change: '+142 last 24h',
            icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
            href: '/entities',
          },
          {
            name: 'Relationships',
            value: '5,812',
            change: '+240 last 24h',
            icon: 'M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
            href: '/network',
          },
          {
            name: 'Processing Jobs',
            value: '2',
            change: 'CDR and FIR parsing',
            icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
            href: '/processing',
          },
          {
            name: 'Alerts Pending',
            value: '12',
            change: '5 require review',
            icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
            href: '/alerts',
          },
        ].map((stat, idx) => (
          <Link
            key={stat.name}
            href={stat.href}
            className={`bg-white border border-[var(--card-border)] rounded-xl p-4 sm:p-5 hover:border-[var(--teal-accent)]/40 hover:shadow-sm transition-all group ${
              idx === 4 ? 'col-span-2 sm:col-span-1' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-[var(--surface-muted)] rounded-lg group-hover:bg-[var(--teal-muted)] transition-colors">
                <svg className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--teal-accent)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                </svg>
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
            <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mt-1 truncate">{stat.name}</p>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1 truncate">{stat.change}</p>
          </Link>
        ))}
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Left Column: Alerts feed */}
        <div className="lg:col-span-2 bg-white border border-[var(--card-border)] rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Active Alerts</h2>
            <Link href="/alerts" className="text-xs font-semibold text-[var(--teal-accent)] hover:underline">
              View all →
            </Link>
          </div>

          <div className="space-y-3">
            {[
              { title: 'Shared Device Across Cases', case: 'CASE-2026-004', time: '12m ago', severity: 'CRITICAL', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
              { title: 'Suspicious Ledger Transaction Pattern', case: 'CASE-2026-012', time: '1h ago', severity: 'HIGH', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
              { title: 'New Network Node Identified', case: 'CASE-2026-001', time: '3h ago', severity: 'MEDIUM', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
            ].map((alert, i) => (
              <div key={i} className="p-3.5 sm:p-4 bg-[var(--surface-muted)] border border-[var(--border-subtle)] rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4 hover:border-[var(--card-border)] transition-all">
                <div className="min-w-0 w-full sm:w-auto">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{alert.title}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                    Case: <span className="text-[var(--accent-color)] font-bold">{alert.case}</span> · {alert.time}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold border tracking-wider uppercase shrink-0 self-start sm:self-center ${alert.bg} ${alert.border} ${alert.text}`}>
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Extraction Pipeline */}
        <div className="bg-white border border-[var(--card-border)] rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-5">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Extraction Pipeline</h2>

          <div className="space-y-4 sm:space-y-5">
            {[
              { file: 'CDR_Mumbai_May.csv', progress: 87, status: 'Parsing records' },
              { file: 'FIR_Report_349.pdf', progress: 42, status: 'Resolving entities' },
            ].map((job, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-[var(--text-primary)] truncate max-w-[160px] sm:max-w-[200px]">{job.file}</span>
                  <span className="text-[var(--teal-accent)] font-bold">{job.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                  <div
                    className="h-full bg-[var(--teal-accent)] transition-all duration-500 rounded-full"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-[var(--text-tertiary)]">{job.status}…</p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <Link href="/processing" className="text-xs font-semibold text-[var(--teal-accent)] hover:underline">
              View all jobs →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
