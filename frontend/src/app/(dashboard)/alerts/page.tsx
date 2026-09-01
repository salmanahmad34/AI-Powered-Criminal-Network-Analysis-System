'use client';

import React from 'react';

export default function AlertsPage() {
  const alerts = [
    {
      type: 'DUPLICATE_IDENTITY',
      title: 'Masked Aadhaar Mismatch',
      desc: 'Aadhaar XXXX-XXXX-4921 matches two different fullName entities.',
      severity: 'CRITICAL',
      status: 'NEW',
    },
    {
      type: 'SHARED_IDENTIFIER',
      title: 'Multiple Devices on IP',
      desc: 'Suspect devices connected concurrently using single remote address.',
      severity: 'HIGH',
      status: 'UNDER_REVIEW',
    },
    {
      type: 'UNUSUAL_TRANSACTION',
      title: 'Rapid Money Transits',
      desc: 'Successive transactional transfers under 120 seconds.',
      severity: 'MEDIUM',
      status: 'NEW',
    },
  ];

  const severityStyles: Record<string, string> = {
    CRITICAL: 'bg-red-50 border-red-200 text-red-700',
    HIGH: 'bg-amber-50 border-amber-200 text-amber-800',
    MEDIUM: 'bg-blue-50 border-blue-200 text-blue-700',
    LOW: 'bg-stone-50 border-stone-200 text-stone-600',
  };

  const statusStyles: Record<string, string> = {
    NEW: 'bg-[var(--teal-muted)] border-blue-200 text-[var(--teal-accent)]',
    UNDER_REVIEW: 'bg-amber-50 border-amber-200 text-amber-700',
    RESOLVED: 'bg-stone-50 border-stone-200 text-stone-500',
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">Alerts Queue</h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
          Review system alerts triggered by link analysis rules and ML processing pipelines.
        </p>
      </div>

      {/* Alert count summary */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {[
          { label: 'Critical', count: 1, style: 'text-red-700 bg-red-50 border-red-200' },
          { label: 'High', count: 1, style: 'text-amber-700 bg-amber-50 border-amber-200' },
          { label: 'Medium', count: 1, style: 'text-blue-700 bg-blue-50 border-blue-200' },
        ].map((s) => (
          <div key={s.label} className={`p-3 sm:p-4 rounded-xl border text-center ${s.style}`}>
            <p className="text-xl sm:text-2xl font-bold">{s.count}</p>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Alerts list */}
      <div className="space-y-3">
        {alerts.map((al, i) => (
          <div
            key={i}
            className="bg-white border border-[var(--card-border)] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row justify-between gap-4 sm:gap-5 hover:border-[var(--text-tertiary)]/40 transition-all"
          >
            <div className="space-y-1.5 sm:space-y-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${severityStyles[al.severity] || 'bg-stone-50 border-stone-200 text-stone-600'}`}>
                  {al.severity}
                </span>
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{(al.type || '').replace(/_/g, ' ')}</span>
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{al.title}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{al.desc}</p>
            </div>

            <div className="flex flex-row md:flex-row items-center justify-between md:justify-end gap-3 self-stretch md:self-center shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[var(--border-subtle)]">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusStyles[al.status] || ''}`}>
                {(al.status || '').replace(/_/g, ' ')}
              </span>
              <button
                id={`alert-investigate-btn-${i}`}
                className="btn-primary text-xs px-4 py-2 rounded-lg"
              >
                Investigate
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
