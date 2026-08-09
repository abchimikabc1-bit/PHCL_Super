'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/lib/admin-context';

interface AdminPlaceholderPageProps {
  title: string;
  description: string;
  statusLabel: string;
  highlights: string[];
}

export function AdminPlaceholderPage({
  title,
  description,
  statusLabel,
  highlights,
}: AdminPlaceholderPageProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdmin();
  const [loadingGuardElapsed, setLoadingGuardElapsed] = useState(false);

  const refreshSession = () => {
    router.refresh();
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingGuardElapsed(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  const loadingActive = isLoading && !loadingGuardElapsed;

  useEffect(() => {
    if (loadingGuardElapsed && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [loadingGuardElapsed, isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="text-sm text-slate-400 mt-1">{description}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/dashboard" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors">
              Back to Dashboard
            </Link>
            <Link href="/admin/orders" className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors">
              Orders
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Operational Status</h2>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">{statusLabel}</span>
          </div>
          <p className="mt-2 text-sm text-slate-300">This module is active and wired into the admin navigation for complete control coverage.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {highlights.map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
