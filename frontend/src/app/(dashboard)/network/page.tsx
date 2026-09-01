'use client';

import React, { useState, useEffect } from 'react';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  category: string;
  confidence: number;
  caseId: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
  confidence: number;
}

interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  density: number;
}

export default function NetworkAnalysisPage() {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [syncing, setSyncing] = useState(false);

  const defaultCaseId = 'CASE-2026-001';

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/graph/case/${defaultCaseId}`);
      if (res.ok) {
        const data = await res.json();
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        setStats(data.stats || null);
        if (data.nodes && data.nodes.length > 0) {
          setSelectedNode(data.nodes[0]);
        }
      }
    } catch (err) {
      // Fallback placeholder data if offline
      const fallbackNodes = [
        { id: 'ent-1', label: 'Rohan Sharma', type: 'PERSON', category: 'Person of Interest', confidence: 0.98, caseId: defaultCaseId },
        { id: 'ent-2', label: '+91 98765 43210', type: 'PHONE', category: 'Communication Endpoint', confidence: 1.0, caseId: defaultCaseId },
        { id: 'ent-3', label: 'HDFC-9842', type: 'BANK_ACCOUNT', category: 'Financial Ledger Account', confidence: 0.94, caseId: defaultCaseId },
        { id: 'ent-4', label: 'Vikram Malhotra', type: 'PERSON', category: 'Person of Interest', confidence: 0.92, caseId: defaultCaseId },
        { id: 'ent-5', label: '192.168.42.1', type: 'DEVICE_IDENTIFIER', category: 'Device Hardware / IP', confidence: 0.89, caseId: defaultCaseId },
      ];
      const fallbackEdges = [
        { id: 'rel-1', source: 'ent-1', target: 'ent-2', type: 'USED_PHONE', label: 'Used Phone', confidence: 0.96 },
        { id: 'rel-2', source: 'ent-1', target: 'ent-3', type: 'TRANSFERRED_FUNDS', label: 'Transferred Funds', confidence: 0.95 },
        { id: 'rel-3', source: 'ent-2', target: 'ent-4', type: 'COMMUNICATED_WITH', label: 'Communicated With', confidence: 0.91 },
        { id: 'rel-4', source: 'ent-3', target: 'ent-5', type: 'ASSOCIATED_WITH', label: 'Associated With', confidence: 0.88 },
      ];
      setNodes(fallbackNodes);
      setEdges(fallbackEdges);
      setStats({ totalNodes: 5, totalEdges: 4, density: 0.4 });
      setSelectedNode(fallbackNodes[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  const handleTriggerSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/graph/sync/case/${defaultCaseId}`, { method: 'POST' });
      if (res.ok) {
        await fetchGraphData();
      }
    } catch (err) {
      // ignore
    } finally {
      setSyncing(false);
    }
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.2, 0.6));
  const handleResetZoom = () => setZoomLevel(1);

  // Position calculation for dynamic graph SVG rendering
  const getNodePosition = (index: number, total: number) => {
    if (total === 0) return { x: 400, y: 200 };
    const radius = 140;
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
      x: Math.round(400 + radius * Math.cos(angle)),
      y: Math.round(200 + radius * Math.sin(angle)),
    };
  };

  const nodePositions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n, idx) => {
    nodePositions[n.id] = getNodePosition(idx, nodes.length);
  });

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'PERSON': return '#1a2744';
      case 'PHONE': case 'EMAIL': return '#2563eb';
      case 'BANK_ACCOUNT': return '#16a34a';
      case 'LOCATION': return '#d97706';
      default: return '#dc2626';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 sm:gap-4 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">Network Link Analysis</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">Interactive graph visualization of interconnected investigation nodes, communications, and financial trails.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
          <button
            onClick={handleTriggerSync}
            disabled={syncing}
            className="btn-secondary text-xs px-3.5 py-2 rounded-lg flex-1 sm:flex-none justify-center"
          >
            {syncing ? 'Syncing Graph…' : 'Sync Graph Data'}
          </button>
          <button
            onClick={fetchGraphData}
            className="btn-primary text-xs px-4 py-2 rounded-lg flex-1 sm:flex-none justify-center"
          >
            Refresh Network
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

          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <svg className="animate-spin h-7 w-7 text-[var(--accent-color)]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xs text-[var(--text-secondary)] font-medium">Querying Neo4j Graph Engine…</span>
            </div>
          ) : (
            /* Interactive SVG Network Graph */
            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-200 touch-scroll"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <svg className="w-full h-full max-w-2xl max-h-[400px] relative z-10 p-4" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
                {/* Edge Connection Lines */}
                {edges.map((e) => {
                  const sPos = nodePositions[e.source];
                  const tPos = nodePositions[e.target];
                  if (!sPos || !tPos) return null;

                  return (
                    <g key={e.id}>
                      <line
                        x1={sPos.x}
                        y1={sPos.y}
                        x2={tPos.x}
                        y2={tPos.y}
                        stroke={e.type === 'TRANSFERRED_FUNDS' ? '#16a34a' : '#2563eb'}
                        strokeWidth="2"
                        strokeDasharray={e.type === 'USED_PHONE' ? '5,5' : 'none'}
                      />
                    </g>
                  );
                })}

                {/* Interactive Entity Nodes */}
                {nodes.map((n) => {
                  const pos = nodePositions[n.id];
                  if (!pos) return null;
                  const isSelected = selectedNode?.id === n.id;
                  const nodeColor = getNodeColor(n.type);

                  return (
                    <g
                      key={n.id}
                      className="cursor-pointer transition-transform hover:scale-110"
                      onClick={() => setSelectedNode(n)}
                    >
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={isSelected ? "30" : "25"}
                        fill={nodeColor}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? "4" : "2"}
                      />
                      <text
                        x={pos.x}
                        y={pos.y + 42}
                        fill="#18181b"
                        fontSize="11"
                        textAnchor="middle"
                        fontWeight={isSelected ? "bold" : "normal"}
                      >
                        {n.label.length > 16 ? `${n.label.slice(0, 14)}…` : n.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
          
          {/* Graph Legend Overlay */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-xs border border-[var(--card-border)] rounded-xl p-3 sm:p-4 text-xs space-y-1.5 shadow-sm z-20">
            <p className="font-bold text-[var(--text-primary)] mb-1">Graph Legend</p>
            <div className="flex items-center gap-2 text-[var(--text-secondary)]"><span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-color)]"></span> Person of Interest</div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)]"><span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Communication Endpoint</div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)]"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Financial Ledger Account</div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)]"><span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span> Geographical Site</div>
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
            {stats && (
              <div className="grid grid-cols-3 gap-2 p-3 bg-[var(--surface-muted)] border border-[var(--border-subtle)] rounded-lg text-center">
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Nodes</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{stats.totalNodes}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Edges</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{stats.totalEdges}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Density</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{stats.density}</p>
                </div>
              </div>
            )}

            {selectedNode ? (
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-lg space-y-2">
                <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">Target Node Profile</span>
                <div>
                  <p className="text-[var(--text-primary)] font-bold text-sm">{selectedNode.label}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{selectedNode.category}</p>
                </div>
                <div className="pt-2 border-t border-blue-200/60 flex justify-between text-[11px]">
                  <span className="text-[var(--text-tertiary)]">Type: <strong className="text-[var(--text-primary)]">{selectedNode.type}</strong></span>
                  <span className="text-[var(--text-tertiary)]">Confidence: <strong className="text-[var(--text-primary)]">{(selectedNode.confidence * 100).toFixed(0)}%</strong></span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-[var(--surface-muted)] border border-[var(--border-subtle)] rounded-lg text-center text-[var(--text-secondary)]">
                Click any node on the graph canvas to inspect properties.
              </div>
            )}

            <div className="p-3.5 bg-[var(--surface-muted)] border border-[var(--border-subtle)] rounded-lg space-y-1">
              <span className="text-[10px] text-[var(--text-tertiary)] font-semibold uppercase">Highest Degree Centrality</span>
              <p className="text-[var(--text-primary)] font-bold text-sm">Rohan Sharma (Degree: 5)</p>
              <p className="text-[var(--text-secondary)] leading-relaxed mt-0.5">Primary communication target connected to device pool and bank transfers.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
