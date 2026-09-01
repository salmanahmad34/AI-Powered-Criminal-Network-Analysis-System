'use client';

import React from 'react';

export default function ReportsPage() {
  const reports = [
    { title: 'Intelligence Digest — Operation Blue Sky', date: '2026-08-30 08:00', size: '240 KB', status: 'READY' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Intelligence Reports</h1>
          <p className="text-sm text-gray-400 mt-1">Compile and export comprehensive case summaries and link graphs for official prosecution.</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all cursor-pointer">
          Compile Report
        </button>
      </div>

      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1a1e27] bg-white/[0.01]">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Report Name</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Generated At</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Size</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1e27]">
            {reports.map((rep, i) => (
              <tr key={i} className="hover:bg-white/[0.01] transition-all">
                <td className="px-6 py-4 text-sm font-bold text-white">{rep.title}</td>
                <td className="px-6 py-4 text-sm text-gray-500 font-medium">{rep.date}</td>
                <td className="px-6 py-4 text-sm text-gray-400">{rep.size}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider bg-green-500/10 border-green-500/20 text-green-400">
                    {rep.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer">
                  Export PDF
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
