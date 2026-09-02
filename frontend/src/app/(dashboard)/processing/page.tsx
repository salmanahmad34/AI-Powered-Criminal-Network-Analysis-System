'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CrimeGraphLoader from '@/components/CrimeGraphLoader';

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

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Processing Monitor</h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
          Monitor background validation, registration, and AI parsing telemetry queues.
        </p>
      </div>

      {loading && jobs.length === 0 ? (
        <div className="p-12 flex justify-center">
          <CrimeGraphLoader size={32} text="Loading processing job queue telemetry…" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <div className="w-10 h-10 bg-zinc-100 border border-zinc-200 rounded-md text-zinc-500 flex items-center justify-center mx-auto">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-black">No active processing jobs recorded</p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">Upload synthetic datasets in Data Center to start processing tasks.</p>
          <Link href="/datacenter" className="btn-primary text-xs inline-flex px-4 py-2 mt-2">
            Upload Dataset
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {jobs.map((job) => {
            const isCompleted = job.status === 'COMPLETED';
            return (
              <div key={job.id} className="card p-5 space-y-4">
                {/* Job header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-zinc-100">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block">Job ID</span>
                    <p className="text-xs font-mono font-semibold text-black truncate mt-0.5">{job.id}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`badge ${
                      job.status === 'COMPLETED' ? 'badge-success' :
                      job.status === 'FAILED' ? 'badge-critical' : 'badge-medium animate-pulse'
                    }`}>
                      {job.status}
                    </span>
                    <span className="text-xs font-mono text-zinc-500">
                      {job.processedFiles} / {job.totalFiles} files
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-zinc-600">Pipeline Ingestion Progress</span>
                    <span className="font-mono text-black font-semibold">{job.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-black'}`}
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>

                {/* Stage Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="bg-zinc-50 p-3 rounded-md border border-zinc-200 space-y-2">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Phase 1–2 Ingestion</p>
                    <div className="space-y-1.5">
                      {[
                        { label: 'File Ingestion & Checksum', done: true },
                        { label: 'Synchronous Struct Check', done: job.progress >= 40 },
                        { label: 'Evidence Vault Registration', done: job.progress >= 100 },
                      ].map((step) => (
                        <div key={step.label} className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${step.done ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                          <span className={`text-[11px] ${step.done ? 'text-black font-medium' : 'text-zinc-400'}`}>{step.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-md border border-zinc-200 opacity-75 space-y-2">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Phase 3–4 Analytics</p>
                    <div className="space-y-1.5">
                      {['AI Entity Extraction', 'Probabilistic Link Matching'].map((step) => (
                        <div key={step} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />
                          <span className="text-[11px] text-zinc-500">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-zinc-50 p-3 rounded-md border border-zinc-200 opacity-75 space-y-2">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Phase 5 Graph Sync</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />
                        <span className="text-[11px] text-zinc-500">Neo4j Link Graph Sync</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-[10px] font-mono text-zinc-400 flex flex-col sm:flex-row justify-between gap-1 pt-1 border-t border-zinc-100">
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
