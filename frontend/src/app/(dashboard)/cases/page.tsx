'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CrimeGraphLoader from '@/components/CrimeGraphLoader';

interface User {
  id: string;
  fullName: string;
  role: string;
}

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  caseType: string;
  priority: string;
  status: string;
  incidentDate: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    fullName: string;
  };
  assignedInvestigator?: {
    fullName: string;
  } | null;
}

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [investigators, setInvestigators] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [type, setType] = useState('');
  const [assignedInvestigatorId, setAssignedInvestigatorId] = useState('');

  // Fetch current user and investigators list
  useEffect(() => {
    async function fetchInitData() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const data = await meRes.json();
          setCurrentUser(data.user);
        }

        const usersRes = await fetch('/api/admin/users');
        if (usersRes.ok) {
          const data = await usersRes.json();
          setInvestigators(data.users || []);
        }
      } catch (err) {
        // Ignore initialization errors
      }
    }
    fetchInitData();
  }, []);

  // Fetch cases based on filters
  useEffect(() => {
    async function fetchCases() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (status) params.append('status', status);
        if (priority) params.append('priority', priority);
        if (type) params.append('caseType', type);
        if (assignedInvestigatorId) params.append('assignedInvestigatorId', assignedInvestigatorId);

        const res = await fetch(`/api/cases?${params.toString()}`);
        if (!res.ok) {
          throw new Error('Failed to load cases.');
        }
        const data = await res.json();
        setCases(data.cases || []);
      } catch (err) {
        setError('Could not connect to backend database services. Ensure the server is online.');
      } finally {
        setLoading(false);
      }
    }
    fetchCases();
  }, [search, status, priority, type, assignedInvestigatorId]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Investigation Cases</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">Search, allocate, and correlate intelligence networks across cases.</p>
        </div>
        <Link
          href="/cases/create"
          id="create-case-btn"
          className="btn-primary text-xs px-4 py-2 shrink-0"
        >
          + New Case
        </Link>
      </div>

      {/* Filters Pane */}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div>
          <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-1">Search</label>
          <input
            type="text"
            placeholder="Title, case ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input text-xs"
          />
        </div>

        <div>
          <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-1">Classification</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="form-select text-xs"
          >
            <option value="">All Types</option>
            <option value="CYBER_CRIME">Cyber Crime</option>
            <option value="FINANCIAL_FRAUD">Financial Fraud</option>
            <option value="ONLINE_FRAUD">Online Fraud</option>
            <option value="IDENTITY_FRAUD">Identity Fraud</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="form-select text-xs"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="form-select text-xs"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="OPEN">Open</option>
            <option value="ACTIVE">Active</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="CLOSED">Closed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-1">Assigned Officer</label>
          <select
            value={assignedInvestigatorId}
            onChange={(e) => setAssignedInvestigatorId(e.target.value)}
            className="form-select text-xs"
          >
            <option value="">All Officers</option>
            {investigators.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main content area */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-md text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 flex justify-center">
          <CrimeGraphLoader size={32} text="Loading investigation case records…" />
        </div>
      ) : cases.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-xs font-semibold text-black">No cases match filters</p>
          <p className="text-xs text-zinc-500 mt-1">Modify search queries or create a new case record.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop & Tablet Table View */}
          <div className="hidden sm:block table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Title</th>
                  <th>Classification</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Officer</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono font-bold text-black text-[11px]">{c.caseNumber}</td>
                    <td className="font-semibold text-black max-w-[240px] truncate">{c.title}</td>
                    <td className="text-zinc-600 text-xs">{(c.caseType || '').replace(/_/g, ' ')}</td>
                    <td>
                      <span className={`badge ${
                        c.priority === 'CRITICAL' ? 'badge-critical' :
                        c.priority === 'HIGH' ? 'badge-high' :
                        c.priority === 'MEDIUM' ? 'badge-medium' : 'badge-low'
                      }`}>
                        {c.priority}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5 text-zinc-700 text-xs font-medium">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          c.status === 'ACTIVE' || c.status === 'OPEN' ? 'bg-emerald-500' :
                          c.status === 'UNDER_REVIEW' ? 'bg-amber-500 animate-pulse' :
                          'bg-zinc-300'
                        }`} />
                        {(c.status || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="text-zinc-700 text-xs">
                      {c.assignedInvestigator?.fullName || <span className="text-zinc-400">&mdash;</span>}
                    </td>
                    <td className="text-zinc-400 text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <Link
                        href={`/cases/${c.id}`}
                        className="btn-secondary text-[11px] px-2.5 py-1"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List (< 640px) */}
          <div className="sm:hidden divide-y divide-zinc-100">
            {cases.map((c) => (
              <div key={c.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-black text-[11px] block">{c.caseNumber}</span>
                    <h3 className="font-semibold text-xs text-black mt-0.5">{c.title}</h3>
                  </div>
                  <span className={`badge shrink-0 ${
                    c.priority === 'CRITICAL' ? 'badge-critical' :
                    c.priority === 'HIGH' ? 'badge-high' :
                    c.priority === 'MEDIUM' ? 'badge-medium' : 'badge-low'
                  }`}>
                    {c.priority}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Type</span>
                    <p className="text-zinc-700 font-medium">{(c.caseType || '').replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Status</span>
                    <p className="text-zinc-700 font-medium">{(c.status || '').replace(/_/g, ' ')}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                  <Link
                    href={`/cases/${c.id}`}
                    className="btn-secondary text-[11px] px-3 py-1"
                  >
                    Open Case →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
