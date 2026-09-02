'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CrimeGraphLoader from '@/components/CrimeGraphLoader';
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

  // File Upload Fields
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [dataCategory, setDataCategory] = useState('OTHER');
  const [dragActive, setDragActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

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

        const usersRes = await fetch('/api/admin/users');
        if (usersRes.ok) {
          const data = await usersRes.json();
          setInvestigators(data.users || []);
        }
      } catch (err) {
        setError('Failed to load system users.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    setStatusMessage('Creating Case Record…');

    if (!title) {
      setError('Please enter a Case Title.');
      setSubmitting(false);
      return;
    }

    try {
      // 1. Create Case Record
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

      const createdCase = data.case;

      // 2. Upload Attached Data Files (if any)
      if (attachedFiles.length > 0 && createdCase?.id) {
        setStatusMessage(`Uploading ${attachedFiles.length} evidence file(s)…`);
        const formData = new FormData();
        attachedFiles.forEach((file) => formData.append('files', file));
        formData.append('dataCategory', dataCategory);

        const uploadRes = await fetch(`/api/cases/${createdCase.id}/data/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json();
          console.error('Case created but file upload failed:', uploadErr);
        }
      }

      router.push(`/cases/${createdCase.id}`);
    } catch (err) {
      setError('A network error occurred while connecting to database.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <CrimeGraphLoader size={32} text="Loading case form parameters…" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Open New Case</h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">Initiate a secure investigation envelope for evidence collection.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-md text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-700 mb-1" htmlFor="title">
              Case Title / Incident Name <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cyber Financial Fraud Operation"
              className="form-input text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1" htmlFor="caseType">
              Classification
            </label>
            <select
              id="caseType"
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
              className="form-select text-xs"
            >
              <option value="CYBER_CRIME">Cyber Crime</option>
              <option value="FINANCIAL_FRAUD">Financial Fraud</option>
              <option value="ONLINE_FRAUD">Online Fraud</option>
              <option value="IDENTITY_FRAUD">Identity Fraud</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1" htmlFor="priority">
              Priority Level
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="form-select text-xs"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1" htmlFor="status">
              Initial Case Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="form-select text-xs"
            >
              <option value="DRAFT">Draft</option>
              <option value="OPEN">Open</option>
              <option value="ACTIVE">Active</option>
              <option value="UNDER_REVIEW">Under Review</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1" htmlFor="assignedInvestigator">
              Assign Officer
            </label>
            <select
              id="assignedInvestigator"
              value={assignedInvestigatorId}
              onChange={(e) => setAssignedInvestigatorId(e.target.value)}
              className="form-select text-xs"
            >
              <option value="">Unassigned</option>
              {investigators.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.fullName} ({inv.role === 'INVESTIGATOR' ? 'OFFICER' : inv.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1" htmlFor="incidentDate">
              Incident Occurrence Date
            </label>
            <input
              id="incidentDate"
              type="date"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className="form-input text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1" htmlFor="location">
              Primary Location / Jurisdiction
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. New Delhi, IN"
              className="form-input text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-700 mb-1" htmlFor="description">
              Analytical Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe case parameters, suspect descriptions and financial logs context..."
              rows={4}
              className="form-input resize-none py-2 text-xs"
            />
          </div>
        </div>

        {/* EVIDENCE / DATA UPLOAD SECTION */}
        <div className="pt-4 border-t border-zinc-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-black">Attach Evidence Files (Optional)</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Upload initial datasets (CDRs, Transaction Ledgers, FIRs) upon case creation.
              </p>
            </div>
            <select
              value={dataCategory}
              onChange={(e) => setDataCategory(e.target.value)}
              className="form-select text-xs py-1 px-2 min-h-[32px] w-auto"
            >
              <option value="CDR">Call Detail Record (CDR)</option>
              <option value="TRANSACTION">Financial Transaction Log</option>
              <option value="FIR">FIR / Police Report</option>
              <option value="DEVICE_DUMP">Suspect Device Dump</option>
              <option value="LOCATION">Location Track Log</option>
              <option value="OTHER">Other Evidence</option>
            </select>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`upload-zone p-6 text-center transition-all ${
              dragActive ? 'drag-active' : ''
            }`}
          >
            <input
              type="file"
              id="case-files-input"
              multiple
              onChange={handleFileChange}
              accept=".pdf,.csv,.xlsx,.json,.txt"
              className="hidden"
            />
            <label htmlFor="case-files-input" className="cursor-pointer flex flex-col items-center justify-center">
              <svg className="w-6 h-6 text-zinc-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-xs font-semibold text-black">
                Click to browse files or drag & drop
              </span>
              <span className="text-[10px] text-zinc-400 mt-1">
                Supports PDF, CSV, XLSX, JSON, TXT (Max 50MB per file)
              </span>
            </label>
          </div>

          {/* List of Attached Files */}
          {attachedFiles.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-700">
                Attached Files ({attachedFiles.length}):
              </span>
              <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-md overflow-hidden bg-white">
                {attachedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold text-black truncate">{file.name}</span>
                      <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-xs text-red-600 hover:text-red-800 p-1"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
          <Link
            href="/cases"
            className="btn-secondary text-xs px-4 py-2"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary text-xs px-4 py-2 disabled:opacity-50"
          >
            {submitting ? (statusMessage || 'Creating Case…') : 'Create Case Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
