'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  fullName: string;
  role: string;
}

export default function CreateCasePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [investigators, setInvestigators] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [caseType, setCaseType] = useState('CYBER_CRIME');
  const [description, setDescription] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [status, setStatus] = useState('OPEN');
  const [assignedInvestigatorId, setAssignedInvestigatorId] = useState('');

  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/login');
          return;
        }
        const meData = await meRes.json();
        setCurrentUser(meData.user);

        if (meData.user.role === 'VIEWER') {
          setError('Access Denied: Viewers are not permitted to start case investigations.');
          setLoading(false);
          return;
        }

        const usersRes = await fetch('/api/admin/users');
        if (usersRes.ok) {
          const data = await usersRes.json();
          const invList = data.users.filter((u: User) => u.role !== 'VIEWER');
          setInvestigators(invList);
        }
      } catch (err) {
        setError('Failed to load system diagnostics.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!title) {
      setError('Please specify a Case Title.');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          caseType,
          description: description || undefined,
          incidentDate: incidentDate ? new Date(incidentDate).toISOString() : undefined,
          location: location || undefined,
          priority,
          status,
          assignedInvestigatorId: assignedInvestigatorId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to instantiate case.');
        setSubmitting(false);
        return;
      }

      router.push('/cases');
    } catch (err) {
      setError('A network error occurred. Check backend database health.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <svg className="animate-spin h-7 w-7 text-[var(--accent-color)]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  // Deny permission for Viewers
  if (currentUser?.role === 'VIEWER') {
    return (
      <div className="max-w-2xl mx-auto bg-white border border-red-200 rounded-xl p-6 sm:p-8 text-center space-y-4">
        <div className="inline-flex p-3 bg-red-50 rounded-xl text-red-600">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Access Unauthorized</h2>
        <p className="text-sm text-[var(--text-secondary)]">Your Viewer account does not possess permission to open new cases.</p>
        <Link href="/cases" className="btn-primary inline-flex text-xs px-4 py-2.5 rounded-lg">
          Return to Cases List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">Open Investigation Case</h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">Initiate a secure workspace envelope for data collections.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex gap-3">
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-[var(--card-border)] rounded-xl p-4 sm:p-8 space-y-5 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5" htmlFor="title">
              Case Title / Incident Envelope *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cyber Financial Fraud Investigation"
              className="form-input"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5" htmlFor="caseType">
              Classification
            </label>
            <select
              id="caseType"
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
              className="form-select"
            >
              <option value="CYBER_CRIME">Cyber Crime</option>
              <option value="FINANCIAL_FRAUD">Financial Fraud</option>
              <option value="ONLINE_FRAUD">Online Fraud</option>
              <option value="IDENTITY_FRAUD">Identity Fraud</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5" htmlFor="priority">
              Priority Level
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="form-select"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5" htmlFor="status">
              Case Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="form-select"
            >
              <option value="DRAFT">Draft</option>
              <option value="OPEN">Open</option>
              <option value="ACTIVE">Active</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="CLOSED">Closed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5" htmlFor="assignedInvestigator">
              Assign Lead Investigator
            </label>
            <select
              id="assignedInvestigator"
              value={assignedInvestigatorId}
              onChange={(e) => setAssignedInvestigatorId(e.target.value)}
              className="form-select"
            >
              <option value="">Unassigned</option>
              {investigators.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.fullName} ({inv.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5" htmlFor="incidentDate">
              Incident Occurrence Date
            </label>
            <input
              id="incidentDate"
              type="date"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5" htmlFor="location">
              Primary Location / Jurisdiction
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. New Delhi, IN"
              className="form-input"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5" htmlFor="description">
              Analytical Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe case parameters, suspect descriptions and financial logs context..."
              rows={4}
              className="form-input resize-none py-2.5"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4 border-t border-[var(--border-subtle)]">
          <Link
            href="/cases"
            className="btn-secondary w-full sm:w-auto text-center text-xs py-2.5 px-4 rounded-lg justify-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full sm:w-auto text-xs py-2.5 px-5 rounded-lg justify-center disabled:opacity-50"
          >
            {submitting ? 'Creating Case…' : 'Create Case File'}
          </button>
        </div>
      </form>
    </div>
  );
}
