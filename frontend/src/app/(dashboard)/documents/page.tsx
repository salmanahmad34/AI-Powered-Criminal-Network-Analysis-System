'use client';

import React from 'react';

export default function DocumentsPage() {
  const docs = [
    { name: 'FIR_Report_349_Cyber.pdf', size: '1.2 MB', uploadedBy: 'investigator@crimegraph.demo', date: '2026-08-30 10:20', hash: 'e3b0c442...' },
    { name: 'CDR_Raw_Mumbai_May.csv', size: '14.5 MB', uploadedBy: 'investigator@crimegraph.demo', date: '2026-08-30 09:15', hash: 'da39a3ee...' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Investigative Documents</h1>
          <p className="text-sm text-gray-400 mt-1">Audit trail of uploaded raw datasets, CSV extracts and PDF files.</p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1a1e27] bg-white/[0.01]">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">File Name</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">File Size</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Uploaded By</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Timestamp</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">SHA-256 Hash</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1e27]">
            {docs.map((doc, i) => (
              <tr key={i} className="hover:bg-white/[0.01] transition-all">
                <td className="px-6 py-4 text-sm font-bold text-white">{doc.name}</td>
                <td className="px-6 py-4 text-sm text-gray-400">{doc.size}</td>
                <td className="px-6 py-4 text-sm text-indigo-300 font-semibold">{doc.uploadedBy}</td>
                <td className="px-6 py-4 text-sm text-gray-500 font-medium">{doc.date}</td>
                <td className="px-6 py-4 text-sm text-gray-500 font-mono">{doc.hash}</td>
                <td className="px-6 py-4 text-sm font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer">
                  Download
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
