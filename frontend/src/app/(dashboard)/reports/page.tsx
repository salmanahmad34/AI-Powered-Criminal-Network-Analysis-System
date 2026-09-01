'use client';

import React from 'react';

export default function ReportsPage() {
  const reports = [
    { title: 'Intelligence Digest — Operation Blue Sky', date: '2026-08-30 08:00', size: '240 KB', status: 'READY' },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">Intelligence Reports</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">Compile and export comprehensive case summaries and link graphs for official prosecution.</p>
        </div>
        <button className="btn-primary text-xs px-4 py-2.5 rounded-lg w-full sm:w-auto justify-center shrink-0">
          Compile Report
        </button>
      </div>

      {/* Desktop & Tablet Table View */}
      <div className="hidden sm:block table-container bg-white border border-[var(--card-border)] rounded-xl">
        <table className="data-table">
          <thead>
            <tr>
              <th>Report Name</th>
              <th>Generated At</th>
              <th>Size</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((rep, i) => (
              <tr key={i}>
                <td className="font-bold text-[var(--text-primary)]">{rep.title}</td>
                <td className="text-[var(--text-tertiary)]">{rep.date}</td>
                <td className="text-[var(--text-secondary)]">{rep.size}</td>
                <td>
                  <span className="badge badge-success">
                    {rep.status}
                  </span>
                </td>
                <td>
                  <button className="text-xs font-semibold text-[var(--teal-accent)] hover:underline cursor-pointer">
                    Export PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Representation (< 640px) */}
      <div className="sm:hidden space-y-3">
        {reports.map((rep, i) => (
          <div key={i} className="bg-white border border-[var(--card-border)] rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">{rep.title}</h3>
              <span className="badge badge-success shrink-0">{rep.status}</span>
            </div>

            <div className="flex justify-between text-xs text-[var(--text-secondary)] pt-1 border-t border-[var(--border-subtle)]">
              <span>Date: {rep.date}</span>
              <span>Size: {rep.size}</span>
            </div>

            <button className="btn-secondary w-full text-center text-xs py-2 rounded-lg justify-center">
              Export PDF Report →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
