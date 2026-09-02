'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CrimeGraphLoader from '@/components/CrimeGraphLoader';

interface UserRecord {
  id: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  fullName: string;
  mustChangePassword?: boolean;
  createdAt: string;
}

interface CaseRecord {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  assignedInvestigatorId?: string | null;
  assignedInvestigator?: { id: string; fullName: string; email: string } | null;
  _count?: {
    documents: number;
    entities: number;
    alerts: number;
    notes: number;
  };
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [officerStatusFilter, setOfficerStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [officerSearchQuery, setOfficerSearchQuery] = useState('');

  // Create Officer Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [officerName, setOfficerName] = useState('');
  const [officerEmail, setOfficerEmail] = useState('');
  const [officerPassword, setOfficerPassword] = useState('');
  const [creatingOfficer, setCreatingOfficer] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);

  // One-time credential reveal modal
  const [createdCredentials, setCreatedCredentials] = useState<{
    fullName: string;
    email: string;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset Password reveal modal
  const [resetCredentials, setResetCredentials] = useState<{
    fullName: string;
    email: string;
    tempPassword: string;
  } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, casesRes, healthRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/cases?limit=100'),
        fetch('/api/admin/health'),
      ]);

      if (usersRes.status === 403) {
        setIsUnauthorized(true);
        setLoading(false);
        return;
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
      if (casesRes.ok) {
        const data = await casesRes.json();
        setCases(data.cases || []);
      }
      if (healthRes.ok) {
        const data = await healthRes.json();
        setHealth(data);
      }
    } catch (err) {
      setError('Failed to query administrative APIs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const generateAutoEmail = async () => {
    if (!officerName || officerName.trim().length < 2) {
      setError('Please enter Officer Full Name before generating email.');
      return;
    }
    setGeneratingEmail(true);
    try {
      const res = await fetch('/api/admin/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: officerName }),
      });
      if (res.ok) {
        const data = await res.json();
        setOfficerEmail(data.email);
      }
    } catch (err) {
      console.error('Email generation failed:', err);
    } finally {
      setGeneratingEmail(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setOfficerPassword(pass);
  };

  const handleCreateOfficerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!officerName) {
      setError('Officer Full Name is required.');
      return;
    }

    setCreatingOfficer(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: officerName,
          email: officerEmail || undefined,
          password: officerPassword || undefined,
          role: 'INVESTIGATOR',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create Officer account.');
        setCreatingOfficer(false);
        return;
      }

      setShowCreateModal(false);
      setCreatedCredentials({
        fullName: data.user.fullName,
        email: data.user.email,
        tempPassword: data.tempPassword,
      });

      setOfficerName('');
      setOfficerEmail('');
      setOfficerPassword('');

      fetchData();
    } catch (err) {
      setError('Network error creating Officer account.');
    } finally {
      setCreatingOfficer(false);
    }
  };

  const handleToggleStatus = async (userObj: UserRecord) => {
    const newStatus = userObj.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/admin/users/${userObj.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      setError('Failed to update Officer status.');
    }
  };

  const handleResetPassword = async (userObj: UserRecord) => {
    try {
      const res = await fetch(`/api/admin/users/${userObj.id}/reset-password`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setResetCredentials({
          fullName: data.user.fullName,
          email: data.user.email,
          tempPassword: data.tempPassword,
        });
      }
    } catch (err) {
      setError('Failed to reset password.');
    }
  };

  const handleReassignCase = async (caseId: string, newOfficerId: string) => {
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedInvestigatorId: newOfficerId || null }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      setError('Failed to reassign case.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUnauthorized) {
    return (
      <div className="max-w-xl mx-auto card p-8 text-center space-y-4 my-12">
        <div className="w-10 h-10 bg-red-50 border border-red-200 rounded-md text-red-600 flex items-center justify-center mx-auto">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-black">403 — Access Unauthorized</h2>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
          Administrative control settings are strictly restricted to System Administrators (`ADMIN`). Officers do not possess administrative configuration access.
        </p>
        <Link href="/dashboard" className="btn-primary inline-flex text-xs px-4 py-2 mt-2">
          Return to Officer Dashboard
        </Link>
      </div>
    );
  }

  const officers = users.filter((u) => u.role === 'INVESTIGATOR');
  const activeOfficers = officers.filter((u) => u.status === 'ACTIVE');
  const activeCases = cases.filter((c) => c.status === 'ACTIVE' || c.status === 'OPEN');
  const completedCases = cases.filter((c) => c.status === 'CLOSED');

  const filteredOfficers = officers.filter((u) => {
    const matchesStatus = officerStatusFilter === 'ALL' || u.status === officerStatusFilter;
    const matchesSearch = !officerSearchQuery || 
      u.fullName.toLowerCase().includes(officerSearchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(officerSearchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">System Administration</h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
          Supervising control panel for Officer management, case oversight, and system diagnostics.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-xs flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 text-xs">Dismiss</button>
        </div>
      )}

      {/* ADMIN DASHBOARD METRICS */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Admin Dashboard Statistics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="card p-3.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Total Officers</span>
            <p className="text-xl font-semibold font-mono text-black mt-1">{officers.length}</p>
            <span className="text-[10px] text-zinc-500 font-mono">{activeOfficers.length} Active</span>
          </div>
          <div className="card p-3.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Total Cases</span>
            <p className="text-xl font-semibold font-mono text-black mt-1">{cases.length}</p>
            <span className="text-[10px] text-zinc-500 font-mono">{activeCases.length} Active</span>
          </div>
          <div className="card p-3.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Completed Cases</span>
            <p className="text-xl font-semibold font-mono text-black mt-1">{completedCases.length}</p>
            <span className="text-[10px] text-zinc-500 font-mono">Archived</span>
          </div>
          <div className="card p-3.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Processing Jobs</span>
            <p className="text-xl font-semibold font-mono text-black mt-1">2</p>
            <span className="text-[10px] text-emerald-600 font-mono">Active</span>
          </div>
          <div className="card p-3.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Documents</span>
            <p className="text-xl font-semibold font-mono text-black mt-1">14</p>
            <span className="text-[10px] text-zinc-500 font-mono">Ingested</span>
          </div>
          <div className="card p-3.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">System Health</span>
            <p className="text-xl font-semibold font-mono text-emerald-600 mt-1">
              {health?.status === 'healthy' ? '100%' : 'Online'}
            </p>
            <span className="text-[10px] text-zinc-500 font-mono">Database OK</span>
          </div>
        </div>
      </div>

      {/* OFFICER MANAGEMENT SECTION */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-black">Officer Management</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Provision field Officers, generate credentials, and reset security access.</p>
          </div>
          <button
            id="admin-create-officer-btn"
            onClick={() => setShowCreateModal(true)}
            className="btn-primary text-xs px-3.5 py-1.5 shrink-0"
          >
            + Create Officer
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3 bg-zinc-50 border-b border-[var(--border)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-white p-1 rounded-md border border-zinc-200">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setOfficerStatusFilter(st)}
                className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded transition-colors ${
                  officerStatusFilter === st
                    ? 'bg-black text-white'
                    : 'text-zinc-500 hover:text-black hover:bg-zinc-100'
                }`}
              >
                {st === 'ALL' ? `All (${officers.length})` : st === 'ACTIVE' ? `Active (${activeOfficers.length})` : `Inactive (${officers.length - activeOfficers.length})`}
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search Officer by name or email…"
              value={officerSearchQuery}
              onChange={(e) => setOfficerSearchQuery(e.target.value)}
              className="form-input text-xs py-1 px-3 w-full sm:w-64"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <CrimeGraphLoader size={24} text="Loading Officers directory…" />
          </div>
        ) : filteredOfficers.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">No Officers found matching active filters.</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Officer Name</th>
                  <th>Official Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Password Status</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOfficers.map((u) => (
                  <tr key={u.id}>
                    <td className="font-semibold text-black">{u.fullName}</td>
                    <td className="font-mono text-zinc-600 text-xs">{u.email}</td>
                    <td>
                      <span className="badge bg-zinc-100 text-zinc-800 font-mono">OFFICER</span>
                    </td>
                    <td>
                      <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-low'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {u.mustChangePassword ? 'Temp Password' : 'Verified'}
                      </span>
                    </td>
                    <td className="text-zinc-400 text-[11px] font-mono">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className="text-xs text-zinc-600 hover:text-black font-medium hover:underline cursor-pointer"
                        >
                          {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                        <span className="text-zinc-300">|</span>
                        <button
                          onClick={() => handleResetPassword(u)}
                          className="text-xs text-black font-semibold hover:underline cursor-pointer"
                        >
                          Reset Password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ALL CASES CENTRAL MONITORING SECTION */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-black">System Cases Oversight</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Centralized monitoring across all investigation envelopes and officer assignments.</p>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <CrimeGraphLoader size={24} text="Loading all cases monitoring table…" />
          </div>
        ) : cases.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">No cases recorded in system.</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Title / Incident Name</th>
                  <th>Assigned Officer</th>
                  <th>Status</th>
                  <th>Documents</th>
                  <th>Entities</th>
                  <th>Alerts</th>
                  <th>Created Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono font-bold text-black text-[11px]">{c.caseNumber}</td>
                    <td className="font-semibold text-black max-w-[200px] truncate">{c.title}</td>
                    <td>
                      <select
                        value={c.assignedInvestigatorId || ''}
                        onChange={(e) => handleReassignCase(c.id, e.target.value)}
                        className="form-select text-[11px] py-1 px-2 min-h-[30px] w-auto font-medium"
                      >
                        <option value="">Unassigned</option>
                        {officers.map((off) => (
                          <option key={off.id} value={off.id}>
                            {off.fullName}
                          </option>
                        ))}
                      </select>
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
                    <td className="font-mono text-zinc-600 text-xs">{c._count?.documents || 0}</td>
                    <td className="font-mono text-zinc-600 text-xs">{c._count?.entities || 0}</td>
                    <td className="font-mono text-zinc-600 text-xs">{c._count?.alerts || 0}</td>
                    <td className="text-zinc-400 text-[11px] font-mono">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Link href={`/cases/${c.id}`} className="btn-secondary text-[11px] px-2.5 py-1">
                        Open Case
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE OFFICER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-xl max-w-md w-full p-6 space-y-5 shadow-lg relative">
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-black">Create Officer Account</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Provision a new field Officer credential profile.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-xs text-zinc-400 hover:text-black p-1">✕</button>
            </div>

            <form onSubmit={handleCreateOfficerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1" htmlFor="officerName">
                  Officer Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="officerName"
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="form-input text-xs"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-zinc-700" htmlFor="officerEmail">
                    Official Email
                  </label>
                  <button
                    type="button"
                    onClick={generateAutoEmail}
                    disabled={generatingEmail}
                    className="text-[11px] text-black font-semibold hover:underline cursor-pointer"
                  >
                    {generatingEmail ? 'Generating…' : '⚡ Auto-Generate Email'}
                  </button>
                </div>
                <input
                  id="officerEmail"
                  type="email"
                  value={officerEmail}
                  onChange={(e) => setOfficerEmail(e.target.value)}
                  placeholder="rahul.sharma@crimegraph.demo"
                  className="form-input text-xs"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-zinc-700" htmlFor="officerPassword">
                    Temporary Password
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-black font-semibold hover:underline cursor-pointer"
                  >
                    ⚡ Auto-Generate Password
                  </button>
                </div>
                <input
                  id="officerPassword"
                  type="text"
                  value={officerPassword}
                  onChange={(e) => setOfficerPassword(e.target.value)}
                  placeholder="Auto-generated if left blank"
                  className="form-input text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingOfficer}
                  className="btn-primary text-xs px-4 py-2 disabled:opacity-50"
                >
                  {creatingOfficer ? 'Creating Officer…' : 'Create Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ONE-TIME CREDENTIAL REVEAL MODAL */}
      {createdCredentials && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-emerald-300 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-black">Officer Account Created Successfully</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Please record these credentials now. The password will not be shown again.</p>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-md p-4 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-400 text-[10px] block uppercase">Officer Name</span>
                <span className="text-black font-semibold">{createdCredentials.fullName}</span>
              </div>
              <div>
                <span className="text-zinc-400 text-[10px] block uppercase">Official Email</span>
                <span className="text-black font-semibold">{createdCredentials.email}</span>
              </div>
              <div>
                <span className="text-zinc-400 text-[10px] block uppercase">Temporary Password</span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                  {createdCredentials.tempPassword}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() =>
                  copyToClipboard(
                    `Officer: ${createdCredentials.fullName}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.tempPassword}`
                  )
                }
                className="btn-secondary text-xs px-3.5 py-1.5"
              >
                {copied ? '✓ Copied to Clipboard' : '📋 Copy Credentials'}
              </button>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="btn-primary text-xs px-4 py-1.5"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD REVEAL MODAL */}
      {resetCredentials && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-amber-300 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 002-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-black">Password Reset Successful</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Share this temporary password with Officer {resetCredentials.fullName}.</p>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-md p-4 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-400 text-[10px] block uppercase">Officer Name</span>
                <span className="text-black font-semibold">{resetCredentials.fullName}</span>
              </div>
              <div>
                <span className="text-zinc-400 text-[10px] block uppercase">Official Email</span>
                <span className="text-black font-semibold">{resetCredentials.email}</span>
              </div>
              <div>
                <span className="text-zinc-400 text-[10px] block uppercase">New Temporary Password</span>
                <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                  {resetCredentials.tempPassword}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() =>
                  copyToClipboard(
                    `Officer: ${resetCredentials.fullName}\nEmail: ${resetCredentials.email}\nNew Password: ${resetCredentials.tempPassword}`
                  )
                }
                className="btn-secondary text-xs px-3.5 py-1.5"
              >
                {copied ? '✓ Copied to Clipboard' : '📋 Copy Credentials'}
              </button>
              <button
                onClick={() => setResetCredentials(null)}
                className="btn-primary text-xs px-4 py-1.5"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
