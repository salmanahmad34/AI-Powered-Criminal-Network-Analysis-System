'use client';

import React from 'react';

export default function EntitiesPage() {
  const entities = [
    { type: 'PERSON', name: 'Rohan Sharma', details: 'Aadhaar Masked: XXXX-XXXX-4921', status: 'RESOLVED', confidence: '98%' },
    { type: 'PHONE', name: '+91 98765 43210', details: 'Registered to Rohan Sharma', status: 'RESOLVED', confidence: '100%' },
    { type: 'BANK_ACCOUNT', name: '5010048123984', details: 'HDFC Bank, Mumbai Branch', status: 'PENDING_MERGE', confidence: '82%' },
    { type: 'DEVICE_IDENTIFIER', name: 'IMEI-358941092841294', details: 'OnePlus 11R', status: 'RESOLVED', confidence: '94%' },
  ];

  const typeStyles: Record<string, string> = {
    PERSON: 'bg-[var(--accent-muted)] border-[var(--card-border)] text-[var(--accent-color)]',
    PHONE: 'bg-blue-50 border-blue-200 text-blue-700',
    BANK_ACCOUNT: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    DEVICE_IDENTIFIER: 'bg-amber-50 border-amber-200 text-amber-700',
  };

  const statusStyles: Record<string, string> = {
    RESOLVED: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    PENDING_MERGE: 'bg-amber-50 border-amber-200 text-amber-700',
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">Entity Database</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">Search, update, and resolve extracted intelligence entities.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <input
            id="entities-search-input"
            type="text"
            placeholder="Search entity name, phone, account…"
            className="form-input text-xs w-full sm:w-64"
          />
          <button id="entities-search-btn" className="btn-primary text-xs px-4 py-2 rounded-lg whitespace-nowrap shrink-0">
            Search
          </button>
        </div>
      </div>

      {/* Desktop & Tablet Table View */}
      <div className="hidden sm:block table-container bg-white border border-[var(--card-border)] rounded-xl">
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Value / Primary Name</th>
              <th>Context / Attribute</th>
              <th>Resolution</th>
              <th>Confidence</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entities.map((ent, i) => (
              <tr key={i}>
                <td>
                  <span className={`badge ${typeStyles[ent.type] || 'bg-stone-50 border-stone-200 text-stone-600'}`}>
                    {(ent.type || '').replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="font-semibold text-[var(--text-primary)]">{ent.name}</td>
                <td className="text-[var(--text-secondary)]">{ent.details}</td>
                <td>
                  <span className={`badge ${statusStyles[ent.status] || 'bg-stone-50 border-stone-200 text-stone-500'}`}>
                    {(ent.status || '').replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="font-mono font-semibold text-[var(--text-primary)]">{ent.confidence}</td>
                <td>
                  <button
                    id={`entity-audit-btn-${i}`}
                    className="text-xs font-semibold text-[var(--teal-accent)] hover:underline cursor-pointer"
                  >
                    Audit Links
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (<640px) */}
      <div className="sm:hidden space-y-3">
        {entities.map((ent, i) => (
          <div key={i} className="bg-white border border-[var(--card-border)] rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className={`badge ${typeStyles[ent.type] || 'bg-stone-50 border-stone-200 text-stone-600'} mb-1`}>
                  {(ent.type || '').replace(/_/g, ' ')}
                </span>
                <p className="font-bold text-sm text-[var(--text-primary)] mt-1">{ent.name}</p>
              </div>
              <span className={`badge shrink-0 ${statusStyles[ent.status] || 'bg-stone-50 border-stone-200 text-stone-500'}`}>
                {(ent.status || '').replace(/_/g, ' ')}
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">{ent.details}</p>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-xs">
              <span className="text-[var(--text-tertiary)]">Confidence: <strong className="text-[var(--text-primary)]">{ent.confidence}</strong></span>
              <button
                id={`entity-audit-btn-mobile-${i}`}
                className="text-xs font-semibold text-[var(--teal-accent)] hover:underline cursor-pointer"
              >
                Audit Links →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
