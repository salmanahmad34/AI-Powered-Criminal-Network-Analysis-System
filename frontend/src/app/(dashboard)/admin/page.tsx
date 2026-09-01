'use client';

import React, { useState, useEffect } from 'react';

interface HealthData {
  status: string;
  timestamp: string;
  services: {
    backend: string;
    database: string;
    redis: string;
    neo4j: string;
  };
  demoMode: boolean;
}

interface AIProviderData {
  id: string;
  providerId: string;
  providerName: string;
  enabled: boolean;
  priority: number;
  model: string;
  timeout: number;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'COOLDOWN' | 'DISABLED';
  cooldownUntil: string | null;
  lastSuccess: string | null;
  lastFailure: string | null;
}

export default function AdminPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [providers, setProviders] = useState<AIProviderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function checkHealthAndProviders() {
    try {
      const healthRes = await fetch('/api/health');
      if (healthRes.ok) {
        const data = await healthRes.json();
        setHealth(data);
      }

      const providersRes = await fetch('/api/ai/providers');
      if (providersRes.ok) {
        const data = await providersRes.json();
        setProviders(data.providers || []);
      } else {
        setError('Only authorized auditors or admins can view AI provider telemetry details.');
      }
    } catch (err) {
      setHealth({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          backend: 'healthy',
          database: 'connected (mock)',
          redis: 'connected (mock)',
          neo4j: 'connected (mock)',
        },
        demoMode: true,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkHealthAndProviders();
  }, []);

  const handleToggle = async (providerId: string, currentEnabled: boolean) => {
    setTogglingId(providerId);
    try {
      const res = await fetch(`/api/ai/providers/${providerId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to update provider status.');
      } else {
        await checkHealthAndProviders();
      }
    } catch (err) {
      alert('Network failure attempting to toggle status.');
    } finally {
      setTogglingId(null);
    }
  };

  const providerStatusStyles: Record<string, string> = {
    HEALTHY: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    COOLDOWN: 'bg-amber-50 border-amber-200 text-amber-700',
    DEGRADED: 'bg-red-50 border-red-200 text-red-700',
    DISABLED: 'bg-stone-50 border-stone-200 text-stone-500',
  };

  const serviceCards = health
    ? [
        { label: 'API Service', value: health.services.backend },
        { label: 'PostgreSQL DB', value: health.services.database },
        { label: 'Redis Store', value: health.services.redis },
        { label: 'Neo4j Graph', value: health.services.neo4j },
      ]
    : [];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">System Administration</h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
          Real-time status tracking for backend microservices, databases, and AI extraction nodes.
        </p>
      </div>

      {/* Service Health Cards */}
      <div>
        <h2 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Service Health</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {loading && !health ? (
            <p className="text-sm text-[var(--text-secondary)] col-span-2 lg:col-span-4">Fetching service diagnostics…</p>
          ) : (
            serviceCards.map((svc) => (
              <div key={svc.label} className="bg-white border border-[var(--card-border)] rounded-xl p-4 sm:p-5 space-y-2">
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{svc.label}</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] capitalize truncate">{svc.value}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI Provider Manager */}
      <div className="bg-white border border-[var(--card-border)] rounded-xl overflow-hidden">
        <div className="p-4 sm:px-6 sm:py-5 border-b border-[var(--border-subtle)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">AI Extraction Gateway</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Configure priorities, toggle enabled states, and monitor circuit breaker failovers.
          </p>
        </div>

        {error && (
          <div className="mx-4 sm:mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs">
            {error}
          </div>
        )}

        {providers.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-xs text-[var(--text-secondary)]">No active AI providers registered.</p>
          </div>
        ) : (
          <>
            {/* Desktop & Tablet Table View */}
            <div className="hidden sm:block table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Model</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Cooldown Reset</th>
                    <th>Last Success</th>
                    <th>Control</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p) => {
                    const inCooldown = p.healthStatus === 'COOLDOWN';
                    return (
                      <tr key={p.id}>
                        <td className="font-semibold text-[var(--text-primary)]">{p.providerName}</td>
                        <td className="font-mono text-[var(--text-secondary)]">{p.model}</td>
                        <td className="text-[var(--text-secondary)]">Priority {p.priority}</td>
                        <td>
                          <span className={`badge ${providerStatusStyles[p.healthStatus] || 'bg-stone-50 border-stone-200 text-stone-600'} ${p.healthStatus === 'COOLDOWN' ? 'animate-pulse' : ''}`}>
                            {p.healthStatus}
                          </span>
                        </td>
                        <td className="text-[var(--text-secondary)]">
                          {inCooldown && p.cooldownUntil
                            ? new Date(p.cooldownUntil).toLocaleTimeString()
                            : '—'}
                        </td>
                        <td className="text-[var(--text-secondary)]">
                          {p.lastSuccess ? new Date(p.lastSuccess).toLocaleTimeString() : 'Never'}
                        </td>
                        <td>
                          <button
                            id={`admin-toggle-btn-${p.providerId}`}
                            onClick={() => handleToggle(p.providerId, p.enabled)}
                            disabled={togglingId === p.providerId}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                              p.enabled
                                ? 'bg-white border-[var(--card-border)] text-[var(--danger-color)] hover:bg-red-50 hover:border-red-200'
                                : 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)]'
                            }`}
                          >
                            {togglingId === p.providerId ? 'Updating…' : p.enabled ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< 640px) */}
            <div className="sm:hidden p-4 space-y-3">
              {providers.map((p) => {
                const inCooldown = p.healthStatus === 'COOLDOWN';
                return (
                  <div key={p.id} className="bg-[var(--surface-muted)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-[var(--text-primary)]">{p.providerName}</h3>
                        <p className="text-[10px] font-mono text-[var(--text-tertiary)] mt-0.5">{p.model}</p>
                      </div>
                      <span className={`badge shrink-0 ${providerStatusStyles[p.healthStatus] || ''}`}>
                        {p.healthStatus}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-1">
                      <span>Priority: <strong>{p.priority}</strong></span>
                      <span>
                        Reset: {inCooldown && p.cooldownUntil ? new Date(p.cooldownUntil).toLocaleTimeString() : '—'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        Success: {p.lastSuccess ? new Date(p.lastSuccess).toLocaleTimeString() : 'Never'}
                      </span>
                      <button
                        id={`admin-toggle-btn-mobile-${p.providerId}`}
                        onClick={() => handleToggle(p.providerId, p.enabled)}
                        disabled={togglingId === p.providerId}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                          p.enabled
                            ? 'bg-white border-[var(--card-border)] text-[var(--danger-color)] hover:bg-red-50'
                            : 'bg-[var(--accent-color)] text-white'
                        }`}
                      >
                        {togglingId === p.providerId ? 'Updating…' : p.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Instance Configuration */}
      <div className="bg-white border border-[var(--card-border)] rounded-xl p-4 sm:p-6 max-w-lg space-y-4">
        <h2 className="text-sm font-bold text-[var(--text-primary)]">Instance Configuration</h2>
        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
            <span className="text-[var(--text-secondary)]">Environment Mode</span>
            <span className="text-[var(--teal-accent)] font-mono font-semibold">development (mock API)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--text-secondary)]">AI Gateway Sandbox</span>
            <span className="font-bold text-[var(--accent-color)] uppercase tracking-wider text-[10px]">Demo Mode Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
