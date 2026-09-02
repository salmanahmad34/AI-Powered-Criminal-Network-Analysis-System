'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CrimeGraphLoader from '@/components/CrimeGraphLoader';

interface User {
  id: string;
  fullName: string;
  role: string;
}

interface CaseItem {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [myCases, setMyCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.user);
        }

        const casesRes = await fetch('/api/cases');
        if (casesRes.ok) {
          const casesData = await casesRes.json();
          setMyCases(casesData.cases || []);
        }
      } catch (err) {
        console.error('Failed to load Officer dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const isOfficer = currentUser?.role === 'INVESTIGATOR';

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono text-zinc-400 tracking-widest uppercase block mb-1">
            CRIMEGRAPH AI INTELLIGENCE
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            {isOfficer ? 'Officer Dashboard' : 'Supervising Overview'}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl">
            Ingest investigation evidence, build suspect entity profiles, and analyze relationship pathways across assigned cases.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/cases/create" className="btn-primary text-xs px-3.5 py-1.5">
            + New Case
          </Link>
          <Link href="/datacenter" className="btn-secondary text-xs px-3.5 py-1.5">
            Upload Dataset
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[
          {
            name: isOfficer ? 'My Assigned Cases' : 'Active Cases',
            value: myCases.length.toString(),
            change: 'Active in workspace',
            href: '/cases',
          },
          {
            name: 'Entities Extracted',
            value: '2,941',
            change: '+142 last 24h',
            href: '/entities',
          },
          {
            name: 'Relationships',
            value: '5,812',
            change: '+240 last 24h',
            href: '/network',
          },
          {
            name: 'Processing Jobs',
            value: '2',
            change: 'CDR & FIR parsing',
            href: '/processing',
          },
          {
            name: 'Alerts Queue',
            value: '12',
            change: '5 require review',
            href: '/alerts',
          },
        ].map((stat, idx) => (
          <Link
            key={stat.name}
            href={stat.href}
            className={`card p-4 hover:border-zinc-400 transition-all ${
              idx === 4 ? 'col-span-2 sm:col-span-1' : ''
            }`}
          >
            <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider truncate">{stat.name}</p>
            <p className="text-2xl font-semibold text-black font-mono mt-2">{stat.value}</p>
            <p className="text-[10px] text-zinc-500 mt-1 truncate">{stat.change}</p>
          </Link>
        ))}
      </div>

      {/* Assigned Cases List & Active Pipeline Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Assigned Cases */}
        <div className="lg:col-span-2 card p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
            <h2 className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
              {isOfficer ? 'My Assigned Investigation Cases' : 'Active Cases Directory'}
            </h2>
            <Link href="/cases" className="text-xs font-medium text-black hover:underline">
              View all cases →
            </Link>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <CrimeGraphLoader size={24} text="Loading assigned cases…" />
            </div>
          ) : myCases.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs font-semibold text-black">No cases assigned</p>
              <p className="text-xs text-zinc-500">You currently have no active investigation cases assigned to you.</p>
              <Link href="/cases/create" className="btn-primary text-xs inline-flex px-3 py-1.5 mt-1">
                Open New Case
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-md overflow-hidden bg-white">
              {myCases.map((c) => (
                <div key={c.id} className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-zinc-50 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-black text-[11px]">{c.caseNumber}</span>
                      <span className={`badge ${
                        c.priority === 'CRITICAL' ? 'badge-critical' :
                        c.priority === 'HIGH' ? 'badge-high' : 'badge-medium'
                      }`}>
                        {c.priority}
                      </span>
                    </div>
                    <p className="font-semibold text-black truncate mt-1">{c.title}</p>
                  </div>
                  <Link href={`/cases/${c.id}`} className="btn-secondary text-[11px] px-2.5 py-1 shrink-0">
                    Open Case
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Processing Pipeline */}
        <div className="card p-5 space-y-4">
          <div className="border-b border-zinc-100 pb-3 flex justify-between items-center">
            <h2 className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Extraction Pipeline</h2>
            <Link href="/processing" className="text-xs font-medium text-black hover:underline">
              View jobs →
            </Link>
          </div>

          <div className="space-y-4">
            {[
              { file: 'CDR_Mumbai_May.csv', progress: 87, status: 'Parsing records' },
              { file: 'FIR_Report_349.pdf', progress: 42, status: 'Resolving entities' },
            ].map((job, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-black truncate max-w-[170px]">{job.file}</span>
                  <span className="font-mono text-black font-semibold">{job.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                  <div
                    className="h-full bg-black transition-all duration-500 rounded-full"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-zinc-400">{job.status}…</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
