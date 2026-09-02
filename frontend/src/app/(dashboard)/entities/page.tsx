'use client';

import React from 'react';

export default function EntitiesPage() {
  const entities = [
    { type: 'PERSON', name: 'Rohan Sharma', details: 'Aadhaar Masked: XXXX-XXXX-4921', status: 'RESOLVED', confidence: '98%' },
    { type: 'PHONE', name: '+91 98765 43210', details: 'Registered to Rohan Sharma', status: 'RESOLVED', confidence: '100%' },
    { type: 'BANK_ACCOUNT', name: '5010048123984', details: 'HDFC Bank, Mumbai Branch', status: 'PENDING_MERGE', confidence: '82%' },
    { type: 'DEVICE_IDENTIFIER', name: 'IMEI-358941092841294', details: 'OnePlus 11R', status: 'RESOLVED', confidence: '94%' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Entities Database</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">Search, resolve, and audit extracted intelligence entity profiles.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <input
            id="entities-search-input"
            type="text"
            placeholder="Search entity name, phone, account…"
            className="form-input text-xs w-full sm:w-64"
          />
          <button id="entities-search-btn" className="btn-primary text-xs px-4 py-2 shrink-0">
            Search
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="card overflow-hidden">
        <div className="hidden sm:block table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Value / Primary Identifier</th>
                <th>Context / Attributes</th>
                <th>Resolution Status</th>
                <th>AI Confidence</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {entities.map((ent, i) => (
                <tr key={i}>
                  <td>
                    <span className="badge bg-zinc-100 border-zinc-200 text-zinc-800 font-mono">
                      {(ent.type || '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="font-semibold text-black">{ent.name}</td>
                  <td className="text-zinc-600 text-xs">{ent.details}</td>
                  <td>
                    <span className={`badge ${ent.status === 'RESOLVED' ? 'badge-success' : 'badge-high'}`}>
                      {(ent.status || '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="font-mono font-semibold text-black text-xs">{ent.confidence}</td>
                  <td>
                    <button
                      id={`entity-audit-btn-${i}`}
                      className="text-xs font-medium text-black hover:underline cursor-pointer"
                    >
                      Audit Links
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="sm:hidden divide-y divide-zinc-100">
          {entities.map((ent, i) => (
            <div key={i} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="badge bg-zinc-100 border-zinc-200 text-zinc-800 font-mono mb-1">
                    {(ent.type || '').replace(/_/g, ' ')}
                  </span>
                  <p className="font-semibold text-xs text-black mt-1">{ent.name}</p>
                </div>
                <span className={`badge ${ent.status === 'RESOLVED' ? 'badge-success' : 'badge-high'}`}>
                  {ent.status}
                </span>
              </div>
              <p className="text-xs text-zinc-500">{ent.details}</p>
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs">
                <span className="text-zinc-400 font-mono text-[10px]">Confidence: {ent.confidence}</span>
                <button className="text-xs font-medium text-black hover:underline">Audit Links →</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
