'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          router.push('/dashboard');
        }
      } catch (err) {
        // Not authenticated, stay on login page
      }
    }
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Authentication failed. Please check your credentials.');
        setIsLoading(false);
        return;
      }

      // Login successful. Redirect to dashboard.
      router.push('/dashboard');
    } catch (err) {
      setError('A network error occurred. Please check if the server is running.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      {/* Left decorative panel (hidden on small screens) */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center pr-16">
        <div className="max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-muted)] border border-[var(--card-border)] rounded-full">
            <div className="p-1 bg-[var(--accent-color)] rounded-full">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-[var(--text-secondary)] tracking-wide">Authorized Access Only</span>
          </div>
          <h1 className="text-4xl font-bold text-[var(--text-primary)] leading-tight tracking-tight">
            Investigation<br />Intelligence<br />Platform
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm">
            Analyze authorized synthetic and demo investigation data, structure entity profiles from unstructured records, and discover potential relationship pathways across intelligence envelopes.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { label: 'Cases', value: '47+' },
              { label: 'Entities', value: '2.9K' },
              { label: 'Relationships', value: '5.8K' },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-3 bg-white border border-[var(--card-border)] rounded-xl">
                <p className="text-xl font-bold text-[var(--text-primary)]">{stat.value}</p>
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Login card */}
      <div className="w-full max-w-sm bg-white border border-[var(--card-border)] rounded-2xl p-8 shadow-sm relative z-10">
        {/* Brand mark */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="p-2 bg-[var(--accent-color)] rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)] leading-none">CrimeGraph AI</p>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 tracking-wide">Investigation Intelligence</p>
          </div>
        </div>

        <div className="mb-7">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Sign in to your account</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Enter your credentials to access the platform</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs mb-5 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="investigator@crimegraph.demo"
              className="form-input"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="form-input"
              required
            />
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            disabled={isLoading}
            className="w-full mt-1 py-2.5 px-4 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] disabled:bg-[var(--text-tertiary)] text-white text-sm font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Signing in…</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Demo access accounts */}
        <div className="mt-7 border-t border-[var(--border)] pt-5">
          <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Demo Access Accounts</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { role: 'ADMIN', email: 'admin@crimegraph.demo' },
              { role: 'INVESTIGATOR', email: 'investigator@crimegraph.demo' },
              { role: 'SENIOR OFFICER', email: 'senior@crimegraph.demo' },
              { role: 'VIEWER', email: 'viewer@crimegraph.demo' },
            ].map((acc) => (
              <div key={acc.role} className="bg-[var(--surface-muted)] p-2 rounded-lg border border-[var(--border-subtle)]">
                <span className="block text-[9px] font-bold text-[var(--accent-color)] uppercase tracking-wider mb-0.5">{acc.role}</span>
                <span className="text-[10px] text-[var(--text-secondary)] block truncate">{acc.email}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-2.5 text-center">
            Password: <span className="text-[var(--accent-color)] font-mono font-bold">Password123!</span>
          </p>
        </div>
      </div>
    </div>
  );
}
