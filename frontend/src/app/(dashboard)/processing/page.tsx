'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface ProcessingJob {
  id: string;
  caseId: string;
  status: 'QUEUED' | 'VALIDATING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalFiles: number;
  processedFiles: number;
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  startedBy?: {
    fullName: string;
  };
}

export default function ProcessingMonitorPage() {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Poll jobs list status
  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch('/api/processing/jobs');
        if (!res.ok) throw new Error();
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch (err) {
        setError('Diagnostics telemetry offline.');
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
    const interval = setInterval(fetchJobs, 3000); // refresh every 3s

    return () => clearInterval(interval);
  }, []);

  const statusStyles: Record<string, string> = {
    COMPLETED: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    PROCESSING: 'bg-blue-50 border-blue-200 text-blue-700',
    VALIDATING: 'bg-amber-50 border-amber-200 text-amber-700',
    QUEUED: 'bg-stone-50 border-stone-200 text-stone-600',
    FAILED: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">Processing Monitor</h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
          Monitor background validation, registration, and AI parsing queues.
        </p>
      </div>

      {loading && jobs.length === 0 ? (
        <div className="flex py-20 justify-center">
          <svg className="animate-spin h-7 w-7 text-[var(--accent-color)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white border border-[var(--card-border)] rounded-xl py-16 text-center">
          <div className="w-12 h-12 bg-[var(--surface-muted)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">No processing jobs recorded</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Upload synthetic datasets via a case Data Center tab to start.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-5">
          {jobs.map((job) => {
            const isCompleted = job.status === 'COMPLETED';
            return (
              <div key={job.id} className="bg-white border border-[var(--card-border)] rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-5">
                {/* Job header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-[var(--border-subtle)]">
                  <div className="min-w-0 w-full sm:w-auto">
                    <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Job ID</p>
                    <p className="text-xs sm:text-sm font-bold text-[var(--accent-color)] font-mono truncate mt-0.5">{job.id}</p>
                  </div>
                  <div className="flex items-center justify-between w-full sm:w-auto gap-3 shrink-0">
                    <span className={`badge ${statusStyles[job.status] || 'bg-stone-50 border-stone-200 text-stone-600'} ${job.status === 'PROCESSING' ? 'animate-pulse' : ''}`}>
                      {job.status}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {job.processedFiles} / {job.totalFiles} files
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[var(--text-secondary)]">Ingestion Progress</span>
                    <span className="text-[var(--text-primary)] font-bold">{job.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-[var(--teal-accent)]'}`}
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>

                {/* Stage Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
                  {/* Phase 2 */}
                  <div className="bg-[var(--surface-muted)] p-3.5 sm:p-4 rounded-lg border border-[var(--border-subtle)]">
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2.5">Phase 2 — Ingestion</p>
                    <div className="space-y-2">
                      {[
                        { label: 'File Ingestion & Checksum', done: true },
                        { label: 'Synchronous Struct Check', done: job.progress >= 40 },
                        { label: 'Evidence Vault Registration', done: job.progress >= 100 },
                      ].map((step) => (
                        <div key={step.label} className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${step.done ? 'bg-emerald-500' : 'bg-[var(--border)]'}`} />
                          <span className={`text-xs ${step.done ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>{step.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Phase 3-4 */}
                  <div className="bg-[var(--surface-muted)] p-3.5 sm:p-4 rounded-lg border border-[var(--border-subtle)] opacity-60">
                    <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2.5">Phase 3–4 — Analytics</p>
                    <div className="space-y-2">
                      {[
                        'AI Entity Extraction (P3)',
                        'Probabilistic Link Matching (P4)',
                      ].map((step) => (
                        <div key={step} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--border)] shrink-0" />
                          <span className="text-xs text-[var(--text-tertiary)]">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Phase 5 */}
                  <div className="bg-[var(--surface-muted)] p-3.5 sm:p-4 rounded-lg border border-[var(--border-subtle)] opacity-60 sm:col-span-2 md:col-span-1">
                    <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2.5">Phase 5 — Graph</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--border)] shrink-0" />
                        <span className="text-xs text-[var(--text-tertiary)]">Neo4j Graph DB Sync</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-[10px] text-[var(--text-tertiary)] flex flex-col sm:flex-row justify-between gap-1 pt-1">
                  <span>Started by: {job.startedBy?.fullName || 'System'}</span>
                  <span>
                    {job.startedAt && `Triggered: ${new Date(job.startedAt).toLocaleString()}`}
                    {job.completedAt && ` · Completed: ${new Date(job.completedAt).toLocaleTimeString()}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
