'use client';

import React, { useState } from 'react';

export default function NetworkAnalysisPage() {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedNode, setSelectedNode] = useState<string | null>('Rohan Sharma');
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.2, 0.6));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 sm:gap-4 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">Network Link Analysis</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">Interactive graph visualization of interconnected suspect nodes, communications, and money trails.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
          <button className="btn-secondary text-xs px-3.5 py-2 rounded-lg flex-1 sm:flex-none justify-center">
            Export JSON
          </button>
          <button className="btn-primary text-xs px-4 py-2 rounded-lg flex-1 sm:flex-none justify-center">
            Run Centrality Check
          </button>
        </div>
      </div>

      {/* Main Graph Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 sm:gap-6 overflow-hidden min-h-[450px]">
        {/* Canvas Pane */}
        <div className="flex-1 bg-white border border-[var(--card-border)] rounded-xl relative overflow-hidden flex items-center justify-center min-h-[350px] sm:min-h-[450px]">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-60"></div>
          
          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 z-20 flex items-center bg-white border border-[var(--card-border)] rounded-lg shadow-sm p-1 gap-1">
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-[var(--surface-muted)] text-[var(--text-primary)] rounded-md transition-colors"
              title="Zoom In"
              aria-label="Zoom in"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-[var(--surface-muted)] text-[var(--text-primary)] rounded-md transition-colors"
              title="Zoom Out"
              aria-label="Zoom out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"/></svg>
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 hover:bg-[var(--surface-muted)] text-[10px] font-bold text-[var(--text-secondary)] rounded-md transition-colors"
              title="Reset Zoom"
            >
              Reset
            </button>
          </div>

          {/* Interactive SVG Network Graph */}
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-200 touch-scroll"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <svg className="w-full h-full max-w-2xl max-h-[400px] relative z-10 p-4" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
              {/* Connection lines */}
              <line x1="200" y1="200" x2="400" y2="100" stroke="#2563eb" strokeWidth="2" strokeDasharray="5,5" />
              <line x1="200" y1="200" x2="400" y2="300" stroke="#0284c7" strokeWidth="1.5" />
              <line x1="400" y1="100" x2="600" y2="150" stroke="#0284c7" strokeWidth="2.5" />
              <line x1="400" y1="300" x2="600" y2="250" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="3,3" />
              <line x1="600" y1="150" x2="600" y2="250" stroke="#16a34a" strokeWidth="2" />
              
              {/* Suspect Node 1 */}
              <g className="cursor-pointer" onClick={() => setSelectedNode('Rohan Sharma')}>
                <circle cx="200" cy="200" r="28" fill="#1a2744" stroke="#ffffff" strokeWidth="3" />
                <text x="200" y="245" fill="#18181b" fontSize="12" textAnchor="middle" fontWeight="bold">Rohan Sharma</text>
                <text x="200" y="260" fill="#52525b" fontSize="10" textAnchor="middle">(Suspect Target)</text>
              </g>
              
              {/* Phone Node */}
              <g className="cursor-pointer" onClick={() => setSelectedNode('+91 98765 43210')}>
                <circle cx="400" cy="100" r="24" fill="#2563eb" stroke="#ffffff" strokeWidth="3" />
                <text x="400" y="142" fill="#18181b" fontSize="11" textAnchor="middle" fontWeight="bold">+91 98765...</text>
              </g>
              
              {/* Bank Account Node */}
              <g className="cursor-pointer" onClick={() => setSelectedNode('HDFC-9842')}>
                <circle cx="400" cy="300" r="24" fill="#16a34a" stroke="#ffffff" strokeWidth="3" />
                <text x="400" y="342" fill="#18181b" fontSize="11" textAnchor="middle" fontWeight="bold">HDFC-9842</text>
              </g>
              
              {/* Suspect Node 2 */}
              <g className="cursor-pointer" onClick={() => setSelectedNode('Vikram Malhotra')}>
                <circle cx="600" cy="150" r="28" fill="#1a2744" stroke="#ffffff" strokeWidth="3" />
                <text x="600" y="195" fill="#18181b" fontSize="12" textAnchor="middle" fontWeight="bold">Vikram Malhotra</text>
              </g>
              
              {/* IP Threat Node */}
              <g className="cursor-pointer" onClick={() => setSelectedNode('192.168.42.1')}>
                <circle cx="600" cy="250" r="24" fill="#dc2626" stroke="#ffffff" strokeWidth="3" />
                <text x="600" y="292" fill="#18181b" fontSize="11" textAnchor="middle" fontWeight="bold">192.168.42.1</text>
              </g>
            </svg>
          </div>
          
          {/* Graph Legend Overlay */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-xs border border-[var(--card-border)] rounded-xl p-3 sm:p-4 text-xs space-y-1.5 shadow-sm z-20">
            <p className="font-bold text-[var(--text-primary)] mb-1">Graph Legend</p>
            <div className="flex items-center gap-2 text-[var(--text-secondary)]"><span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-color)]"></span> Suspect Person</div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)]"><span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Communication Node</div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)]"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Ledger Account</div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)]"><span className="w-2.5 h-2.5 rounded-full bg-red-600"></span> Threat Indicator</div>
          </div>
        </div>

        {/* Details Sidebar Pane */}
        <div className="w-full lg:w-80 bg-white border border-[var(--card-border)] rounded-xl p-4 sm:p-6 space-y-5 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Centrality Details</h2>
            {selectedNode && (
              <span className="badge bg-blue-50 border-blue-200 text-blue-700">Selected Node</span>
            )}
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 bg-[var(--surface-muted)] border border-[var(--border-subtle)] rounded-lg space-y-1">
              <span className="text-[10px] text-[var(--text-tertiary)] font-semibold uppercase">Highest Degree Centrality</span>
              <p className="text-[var(--text-primary)] font-bold text-sm">Rohan Sharma (Degree: 5)</p>
              <p className="text-[var(--text-secondary)] leading-relaxed mt-0.5">Controls primary suspect device pool and coordinates money transfer operations.</p>
            </div>

            <div className="p-3.5 bg-[var(--surface-muted)] border border-[var(--border-subtle)] rounded-lg space-y-1">
              <span className="text-[10px] text-[var(--text-tertiary)] font-semibold uppercase">Betweenness Centrality</span>
              <p className="text-[var(--text-primary)] font-bold text-sm">HDFC-9842 (Bridge Node)</p>
              <p className="text-[var(--text-secondary)] leading-relaxed mt-0.5">Connects primary suspect network to multiple remote bank transfers.</p>
            </div>

            {selectedNode && (
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-lg space-y-1">
                <span className="text-[10px] text-blue-700 font-bold uppercase">Selected Node Details</span>
                <p className="text-[var(--text-primary)] font-bold text-xs">{selectedNode}</p>
                <p className="text-[var(--text-secondary)]">Associated with 3 active investigation cases.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
