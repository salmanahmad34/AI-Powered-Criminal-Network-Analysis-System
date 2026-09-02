'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import CrimeGraphLoader from '@/components/CrimeGraphLoader';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          router.push('/dashboard');
        } else {
          router.push('/login');
        }
      } catch (err) {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <CrimeGraphLoader size={36} text="Verifying secure session..." />
    </div>
  );
}
