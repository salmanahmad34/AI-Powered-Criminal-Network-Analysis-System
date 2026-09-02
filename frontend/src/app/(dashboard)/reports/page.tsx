'use client';

import React from 'react';

export default function ReportsPage() {
  const reports = [
    { title: 'Intelligence Digest — Operation Blue Sky', date: '2026-08-30 08:00', size: '240 KB', status: 'READY' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Intelligence Reports</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">Export comprehensive case summaries and network link diagrams.</p>
        </div>
        <button className="btn-primary text-xs px-4 py-2 shrink-0">
          Compile Report
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="hidden sm:block table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Report Title</th>
                <th>Generated At</th>
                <th>File Size</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((rep, i) => (
                <tr key={i}>
                  <td className="font-semibold text-black">{rep.title}</td>
                  <td className="text-zinc-400 text-[11px] font-mono">{rep.date}</td>
                  <td className="text-zinc-500 text-xs font-mono">{rep.size}</td>
                  <td>
                    <span className="badge badge-success">
                      {rep.status}
                    </span>
                  </td>
                  <td>
                    <button className="text-xs font-medium text-black hover:underline cursor-pointer">
                      Export PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="sm:hidden p-4 space-y-3">
          {reports.map((rep, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-xs text-black">{rep.title}</h3>
                <span className="badge badge-success shrink-0">{rep.status}</span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">{rep.date} ({rep.size})</p>
              <button className="btn-secondary w-full text-xs py-1.5 mt-2">Export PDF</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
