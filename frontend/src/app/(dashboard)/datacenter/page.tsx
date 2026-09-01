'use client';

import React from 'react';

export default function DataCenterPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Data Center</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Upload raw synthetic datasets — CDRs, transaction ledgers, incident reports — for automated extraction.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Pane */}
        <div className="lg:col-span-2 upload-zone flex flex-col items-center justify-center min-h-[320px] p-10 text-center">
          <div className="p-4 bg-[var(--teal-muted)] border border-blue-200 rounded-xl text-[var(--teal-accent)] mb-5">
            <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          <p className="text-base font-bold text-[var(--text-primary)] mb-1">Upload Investigation Data</p>
          <p className="text-xs text-[var(--text-secondary)] mb-5 max-w-xs">
            Drag files here or click browse. Accepts PDF, CSV, XLSX, JSON, TXT — max 50 MB per file.
          </p>

          {/* File type badges */}
          <div className="flex items-center gap-2 mb-6 flex-wrap justify-center">
            {['PDF', 'CSV', 'XLSX', 'JSON', 'TXT'].map((ext) => (
              <span
                key={ext}
                className="px-2.5 py-1 bg-[var(--surface-muted)] border border-[var(--card-border)] text-[10px] font-bold text-[var(--text-secondary)] rounded-md tracking-wider"
              >
                {ext}
              </span>
            ))}
          </div>

          <button
            id="datacenter-browse-btn"
            className="btn-primary text-xs px-5 py-2.5 rounded-lg"
          >
            Browse Files
          </button>
        </div>

        {/* Configurations Pane */}
        <div className="bg-white border border-[var(--card-border)] rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Ingestion Settings</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Configure how this dataset will be processed.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Target Case</label>
              <select className="form-select text-sm" id="datacenter-target-case">
                <option>CASE-2026-001 — Operation Blue Sky</option>
                <option>CASE-2026-002 — Operation Golden Treasury</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Data Classification</label>
              <select className="form-select text-sm" id="datacenter-data-classification">
                <option>Call Detail Record (CDR)</option>
                <option>Financial Transaction Log</option>
                <option>FIR / Police Incident Report</option>
                <option>Suspect Device Dump</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Entity Resolution Mode</label>
              <select className="form-select text-sm" id="datacenter-resolution-mode">
                <option>Deterministic (Exact Matching)</option>
                <option>Probabilistic (AI Threshold 85%+)</option>
                <option>Manual Review Only</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button id="datacenter-start-btn" className="btn-primary w-full justify-center py-2.5">
              Start Ingestion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
