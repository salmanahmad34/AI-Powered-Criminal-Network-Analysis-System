'use client';

import React from 'react';

export default function AlertsPage() {
  const alerts = [
    {
      type: 'DUPLICATE_IDENTITY',
      title: 'Masked Aadhaar Mismatch',
      desc: 'Aadhaar XXXX-XXXX-4921 matches two different fullName entities across cases.',
      severity: 'CRITICAL',
      status: 'NEW',
    },
    {
      type: 'SHARED_IDENTIFIER',
      title: 'Multiple Devices on IP Address',
      desc: 'Suspect devices connected concurrently using single remote network endpoint.',
      severity: 'HIGH',
      status: 'UNDER_REVIEW',
    },
    {
      type: 'UNUSUAL_TRANSACTION',
      title: 'Rapid Money Transits',
      desc: 'Successive transactional transfers under 120 seconds detected in bank ledger.',
      severity: 'MEDIUM',
      status: 'NEW',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Alerts Queue</h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
          Review system alerts triggered by link analysis rules and AI extraction pipelines.
        </p>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Critical', count: 1, badgeClass: 'badge-critical' },
          { label: 'High', count: 1, badgeClass: 'badge-high' },
          { label: 'Medium', count: 1, badgeClass: 'badge-medium' },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className="text-xl font-semibold font-mono text-black">{s.count}</p>
            <p className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Alerts list */}
      <div className="space-y-3">
        {alerts.map((al, i) => (
          <div
            key={i}
            className="card p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${
                  al.severity === 'CRITICAL' ? 'badge-critical' :
                  al.severity === 'HIGH' ? 'badge-high' : 'badge-medium'
                }`}>
                  {al.severity}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">{(al.type || '').replace(/_/g, ' ')}</span>
              </div>
              <h3 className="text-xs font-semibold text-black">{al.title}</h3>
              <p className="text-xs text-zinc-500">{al.desc}</p>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              <span className="badge bg-zinc-100 text-zinc-700 font-mono">
                {(al.status || '').replace(/_/g, ' ')}
              </span>
              <button
                id={`alert-investigate-btn-${i}`}
                className="btn-primary text-xs px-3.5 py-1.5"
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
