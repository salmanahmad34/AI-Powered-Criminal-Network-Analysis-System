'use client';

import React from 'react';

export default function DocumentsPage() {
  const docs = [
    { name: 'FIR_Report_349_Cyber.pdf', size: '1.2 MB', uploadedBy: 'investigator@crimegraph.demo', date: '2026-08-30 10:20', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
    { name: 'CDR_Raw_Mumbai_May.csv', size: '14.5 MB', uploadedBy: 'investigator@crimegraph.demo', date: '2026-08-30 09:15', hash: 'da39a3ee5e6b4b0d3255bfef95601890afd80709' },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">Investigative Documents</h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">Audit trail of uploaded raw datasets, CSV extracts and PDF files.</p>
      </div>

      {/* Desktop & Tablet Table View */}
      <div className="hidden sm:block table-container bg-white border border-[var(--card-border)] rounded-xl">
        <table className="data-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>File Size</th>
              <th>Uploaded By</th>
              <th>Timestamp</th>
              <th>SHA-256 Hash</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc, i) => (
              <tr key={i}>
                <td className="font-bold text-[var(--text-primary)]">{doc.name}</td>
                <td className="text-[var(--text-secondary)]">{doc.size}</td>
                <td className="text-[var(--teal-accent)] font-semibold">{doc.uploadedBy}</td>
                <td className="text-[var(--text-tertiary)]">{doc.date}</td>
                <td className="text-[var(--text-tertiary)] font-mono text-[11px] truncate max-w-[140px]">{doc.hash.slice(0, 16)}…</td>
                <td>
                  <button className="text-xs font-semibold text-[var(--teal-accent)] hover:underline cursor-pointer">
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Representation (< 640px) */}
      <div className="sm:hidden space-y-3">
        {docs.map((doc, i) => (
          <div key={i} className="bg-white border border-[var(--card-border)] rounded-xl p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-sm text-[var(--text-primary)] truncate max-w-[200px]">{doc.name}</h3>
              <span className="badge bg-stone-50 border-stone-200 text-stone-600 shrink-0">{doc.size}</span>
            </div>

            <div className="text-xs text-[var(--text-secondary)] space-y-1">
              <p>Uploaded by: <strong className="text-[var(--teal-accent)]">{doc.uploadedBy}</strong></p>
              <p className="text-[10px] text-[var(--text-tertiary)]">Date: {doc.date}</p>
              <p className="text-[10px] font-mono text-[var(--text-tertiary)] truncate">Hash: {doc.hash}</p>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] flex justify-end">
              <button className="btn-secondary text-xs py-1.5 px-3 rounded-lg">
                Download File
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
