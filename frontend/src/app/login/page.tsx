'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CrimeGraphLogo from '@/components/CrimeGraphLogo';

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

      // Login successful. Redirect based on role: Admin -> /admin, Investigator -> /dashboard
      if (data.user?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('A network error occurred. Please check if the server is running.');
      setIsLoading(false);
    }
  };

  const setDemoCredentials = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center pr-12">
        <div className="max-w-sm space-y-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-zinc-100 border border-zinc-200 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="text-[10px] font-mono font-semibold text-zinc-700 uppercase tracking-widest">Enterprise Platform</span>
          </div>
          <h1 className="text-3xl font-semibold text-[var(--text-primary)] leading-tight tracking-tight">
            Crime Intelligence & Graph Analysis
          </h1>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Ingest structured and unstructured data, map hidden suspect networks, and track complex criminal relationships across intelligence envelopes.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { label: 'Cases', value: '47+' },
              { label: 'Entities', value: '2.9K' },
              { label: 'Relationships', value: '5.8K' },
            ].map((stat) => (
              <div key={stat.label} className="text-left p-3 bg-white border border-[var(--card-border)] rounded-md">
                <p className="text-lg font-semibold text-[var(--text-primary)] font-mono">{stat.value}</p>
                <p className="text-[9px] font-mono font-semibold text-zinc-400 uppercase tracking-widest mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Login card */}
      <div className="w-full max-w-sm bg-white border border-[var(--card-border)] rounded-xl p-6 sm:p-8 shadow-xs relative z-10">
        {/* Brand mark */}
        <div className="mb-6">
          <CrimeGraphLogo size={24} textClassName="text-sm font-semibold text-black tracking-tight" />
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Sign in</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Enter your credentials to access your workspace</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-md text-xs mb-5 flex items-start gap-2">
            <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1" htmlFor="email">
              Email
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
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1" htmlFor="password">
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
            className="btn-primary w-full mt-1 justify-center py-2 text-xs"
          >
            {isLoading ? (
              <>
                <CrimeGraphLogo size={14} showText={false} className="animate-crimegraph-pulse" />
                <span>Authenticating…</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Demo access accounts */}
        <div className="mt-6 border-t border-[var(--border)] pt-4">
          <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-2.5">
            Click Demo Account to Pre-fill
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { role: 'ADMIN', label: 'ADMIN', email: 'admin@crimegraph.demo' },
              { role: 'INVESTIGATOR', label: 'OFFICER', email: 'investigator@crimegraph.demo' },
            ].map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => setDemoCredentials(acc.email)}
                className="bg-zinc-50 hover:bg-zinc-100 p-2 rounded border border-[var(--card-border)] text-left cursor-pointer transition-colors"
              >
                <span className="badge bg-zinc-200 text-zinc-800 font-mono mb-1">{acc.label}</span>
                <span className="text-[10px] text-zinc-500 block truncate">{acc.email}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-zinc-400 mt-2.5 text-center">
            Password: <span className="font-mono text-black font-semibold">Password123!</span>
          </p>
        </div>
      </div>
    </div>
  );
}
