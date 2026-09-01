'use client';

import React from 'react';

export default function NetworkAnalysisPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Network Link Analysis</h1>
          <p className="text-sm text-gray-400 mt-1">Interactive graph visualization of interconnected suspect nodes, communications, and money trails.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-[#0b0d13] border border-[#1a1e27] hover:border-white/10 text-white text-sm font-medium rounded-xl transition-all cursor-pointer">
            Export Graph (JSON)
          </button>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all cursor-pointer">
            Run Centrality Check
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        {/* Canvas Pane */}
        <div className="flex-1 glass-panel rounded-2xl border border-white/5 relative overflow-hidden bg-black/40 flex items-center justify-center">
          {/* Cyber graph nodes mock UI */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
          
          {/* Draw a gorgeous mock SVG graph */}
          <svg className="w-full h-full max-w-2xl max-h-96 relative z-10" viewBox="0 0 800 400">
            {/* Connection lines */}
            <line x1="200" y1="200" x2="400" y2="100" stroke="#6366f1" strokeWidth="2" strokeDasharray="5,5" />
            <line x1="200" y1="200" x2="400" y2="300" stroke="#06b6d4" strokeWidth="1.5" />
            <line x1="400" y1="100" x2="600" y2="150" stroke="#06b6d4" strokeWidth="2.5" />
            <line x1="400" y1="300" x2="600" y2="250" stroke="#ef4444" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="600" y1="150" x2="600" y2="250" stroke="#10b981" strokeWidth="2" />
            
            {/* Suspect Node 1 */}
            <circle cx="200" cy="200" r="30" fill="#1e1b4b" stroke="#6366f1" strokeWidth="2" />
            <text x="200" y="245" fill="#f3f4f6" fontSize="11" textAnchor="middle" fontWeight="bold">Rohan Sharma</text>
            <text x="200" y="260" fill="#9ca3af" fontSize="9" textAnchor="middle">(Suspect)</text>
            
            {/* Phone Node */}
            <circle cx="400" cy="100" r="25" fill="#083344" stroke="#06b6d4" strokeWidth="2" />
            <text x="400" y="145" fill="#f3f4f6" fontSize="11" textAnchor="middle" fontWeight="bold">+91 98765...</text>
            
            {/* Bank Account Node */}
            <circle cx="400" cy="300" r="25" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
            <text x="400" y="345" fill="#f3f4f6" fontSize="11" textAnchor="middle" fontWeight="bold">HDFC-9842</text>
            
            {/* Suspect Node 2 */}
            <circle cx="600" cy="150" r="30" fill="#1e1b4b" stroke="#6366f1" strokeWidth="2" />
            <text x="600" y="195" fill="#f3f4f6" fontSize="11" textAnchor="middle" fontWeight="bold">Vikram Malhotra</text>
            
            {/* IP Node */}
            <circle cx="600" cy="250" r="25" fill="#450a0a" stroke="#ef4444" strokeWidth="2" />
            <text x="600" y="295" fill="#f3f4f6" fontSize="11" textAnchor="middle" fontWeight="bold">192.168.42.1</text>
          </svg>
          
          <div className="absolute bottom-6 left-6 bg-[#0b0d13]/90 border border-white/5 rounded-xl p-4 text-xs space-y-2 z-20">
            <p className="font-bold text-white mb-1">Graph Legend</p>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-indigo-500"></span> Suspect Person</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-cyan-500"></span> Communication Node</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-teal-500"></span> Ledger Account</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> Threat Indicator</div>
          </div>
        </div>

        {/* Details Sidebar Pane */}
        <div className="w-80 glass-panel p-6 rounded-2xl border border-white/5 space-y-6 overflow-y-auto shrink-0">
          <h2 className="text-lg font-bold text-white">Centrality Details</h2>
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
              <span className="text-xs text-gray-500 font-semibold uppercase">Highest Degree</span>
              <p className="text-white font-bold">Rohan Sharma (Degree: 5)</p>
              <p className="text-[11px] text-gray-400">Controls most devices and coordinates money transfers.</p>
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
              <span className="text-xs text-gray-500 font-semibold uppercase">Betweenness Centrality</span>
              <p className="text-white font-bold">HDFC-9842 (Bridge Node)</p>
              <p className="text-[11px] text-gray-400">Connects the primary suspect network to multiple remote bank transfers.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
