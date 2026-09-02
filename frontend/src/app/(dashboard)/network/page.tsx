'use client';

import React, { useState, useEffect } from 'react';
import CrimeGraphLoader from '@/components/CrimeGraphLoader';

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
      case 'PERSON': return '#000000';
      case 'PHONE': case 'EMAIL': return '#27272a';
      case 'BANK_ACCOUNT': return '#166534';
      default: return '#52525b';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-140px)] pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Network Link Analysis</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">Interactive graph topology of suspect nodes, communication vectors, and financial paths.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleTriggerSync}
            disabled={syncing}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            {syncing ? 'Syncing…' : 'Sync Graph Data'}
          </button>
          <button
            onClick={fetchGraphData}
            className="btn-primary text-xs px-3.5 py-1.5"
          >
            Refresh Graph
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[450px]">
        {/* Canvas Pane */}
        <div className="flex-1 card relative overflow-hidden flex items-center justify-center min-h-[400px]">
          <div className="absolute inset-0 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] [background-size:16px_16px] opacity-70"></div>
          
          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 z-20 flex items-center bg-white border border-zinc-200 rounded-md p-1 gap-1">
            <button onClick={handleZoomIn} className="p-1 hover:bg-zinc-100 text-black rounded" title="Zoom In">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
            </button>
            <button onClick={handleZoomOut} className="p-1 hover:bg-zinc-100 text-black rounded" title="Zoom Out">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"/></svg>
            </button>
            <button onClick={handleResetZoom} className="px-2 py-0.5 hover:bg-zinc-100 text-[10px] font-mono font-medium text-zinc-600 rounded">
              100%
            </button>
          </div>

          {loading ? (
            <CrimeGraphLoader size={28} text="Querying Neo4j link graph…" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-200 touch-scroll"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <svg className="w-full h-full max-w-2xl max-h-[400px] relative z-10 p-4" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
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
                        stroke="#18181b"
                        strokeWidth="1.5"
                        strokeDasharray={e.type === 'USED_PHONE' ? '4,4' : 'none'}
                      />
                    </g>
                  );
                })}

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
                        r={isSelected ? "26" : "22"}
                        fill={nodeColor}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? "3" : "1.5"}
                      />
                      <text
                        x={pos.x}
                        y={pos.y + 36}
                        fill="#09090b"
                        fontSize="10"
                        fontFamily="monospace"
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

          {/* Node Type Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-xs border border-zinc-200 rounded-md p-2 flex items-center gap-3 text-[10px] font-mono text-zinc-700">
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>PERSON</div>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>PHONE</div>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>BANK A/C</div>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>LOCATION</div>
          </div>
        </div>

        {/* Details Sidebar */}
        <div className="w-full lg:w-80 card p-5 space-y-4 shrink-0">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <h2 className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Graph Metrics</h2>
            {selectedNode && (
              <span className="badge badge-medium">Node Selected</span>
            )}
          </div>

          <div className="space-y-4 text-xs">
            {stats && (
              <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-md text-center">
                <div>
                  <p className="text-[9px] font-mono text-zinc-400 uppercase">Nodes</p>
                  <p className="text-sm font-semibold font-mono text-black">{stats.totalNodes}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-zinc-400 uppercase">Edges</p>
                  <p className="text-sm font-semibold font-mono text-black">{stats.totalEdges}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-zinc-400 uppercase">Density</p>
                  <p className="text-sm font-semibold font-mono text-black">{stats.density}</p>
                </div>
              </div>
            )}

            {selectedNode ? (
              <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-md space-y-2">
                <span className="text-[10px] font-mono font-semibold text-black uppercase tracking-wider block">Target Node Profile</span>
                <div>
                  <p className="text-black font-semibold text-xs">{selectedNode.label}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{selectedNode.category}</p>
                </div>
                <div className="pt-2 border-t border-zinc-200 flex justify-between text-[11px]">
                  <span className="text-zinc-500">Type: <strong className="font-mono text-black">{selectedNode.type}</strong></span>
                  <span className="text-zinc-500">Confidence: <strong className="font-mono text-black">{(selectedNode.confidence * 100).toFixed(0)}%</strong></span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-md text-center text-zinc-500 text-xs">
                Select a node on the canvas to inspect entity parameters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
