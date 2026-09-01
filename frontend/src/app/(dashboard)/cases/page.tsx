'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  fullName: string;
  role: string;
}

interface CaseAssignment {
  user: {
    id: string;
    fullName: string;
  };
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
          // Filter only investigators, senior officers, and admins
          const invList = data.users.filter((u: User) => u.role !== 'VIEWER');
          setInvestigators(invList);
        }
      } catch (err) {
        // Ignore initialization errors, main fetch will catch network failure
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

  const canCreate = currentUser && currentUser.role !== 'VIEWER';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Investigation Cases</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Search, allocate, and correlate intelligence networks.</p>
        </div>
        {canCreate && (
          <Link
            href="/cases/create"
            id="create-case-btn"
            className="btn-primary text-xs px-5 py-2.5 rounded-lg shrink-0"
          >
            + New Case
          </Link>
        )}
      </div>

      {/* Filters Pane */}
      <div className="bg-white border border-[var(--card-border)] rounded-xl p-5 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Search</label>
          <input
            type="text"
            placeholder="Search title, case ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input text-xs"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Classification</label>
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
          <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Priority</label>
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
          <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Status</label>
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
          <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Investigator</label>
          <select
            value={assignedInvestigatorId}
            onChange={(e) => setAssignedInvestigatorId(e.target.value)}
            className="form-select text-xs"
          >
            <option value="">All Investigators</option>
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
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex gap-3">
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex py-20 items-center justify-center">
          <svg className="animate-spin h-7 w-7 text-[var(--accent-color)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : cases.length === 0 ? (
        <div className="bg-white border border-[var(--card-border)] rounded-xl py-16 text-center">
          <p className="text-sm font-semibold text-[var(--text-primary)]">No cases found</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Try modifying your filter options or create a new case.</p>
        </div>
      ) : (
        <div className="bg-white border border-[var(--card-border)] rounded-xl overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Title</th>
                <th>Classification</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Investigator</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono font-bold text-[var(--accent-color)] text-[11px]">{c.caseNumber}</td>
                  <td className="font-semibold text-[var(--text-primary)]">{c.title}</td>
                  <td className="text-[var(--text-secondary)]">{(c.caseType || '').replace(/_/g, ' ')}</td>
                  <td>
                    <span className={`badge ${
                      c.priority === 'CRITICAL' ? 'bg-red-50 border-red-200 text-red-700' :
                      c.priority === 'HIGH' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                      c.priority === 'MEDIUM' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                      'bg-stone-50 border-stone-200 text-stone-500'
                    }`}>
                      {c.priority}
                    </span>
                  </td>
                  <td>
                    <span className="flex items-center gap-1.5 text-[var(--text-secondary)] text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        c.status === 'ACTIVE' || c.status === 'OPEN' ? 'bg-[var(--teal-accent)]' :
                        c.status === 'UNDER_REVIEW' ? 'bg-amber-500 animate-pulse' :
                        'bg-[var(--border)]'
                      }`} />
                      {(c.status || '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="font-medium text-[var(--text-primary)]">
                    {c.assignedInvestigator?.fullName || <span className="text-[var(--text-tertiary)]">&mdash;</span>}
                  </td>
                  <td className="text-[var(--text-tertiary)]">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <Link
                      href={`/cases/${c.id}`}
                      className="btn-secondary text-[11px] px-3 py-1.5 rounded-lg"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
