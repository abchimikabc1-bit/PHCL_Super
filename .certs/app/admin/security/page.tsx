'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '@/lib/admin-context';

type SecurityOverviewResponse = {
  generatedAt: string;
  actor: {
    email: string;
    role: string;
  };
  summary: {
    auditEventCount: number;
    activeLockouts: number;
  };
  storage: {
    auditLogPath: string;
    rateLimitPath: string;
  };
  lockouts: Array<{
    key: string;
    attempts: number;
    windowStart: number;
    blockedUntil: number;
    blocked: boolean;
    retryAfterSeconds: number;
  }>;
  auditEvents: Array<{
    action: string;
    statusCode: number;
    ip: string;
    userAgent: string;
    email?: string;
    detail?: string;
    at: string;
  }>;
};

export default function AdminSecurityPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, refreshSession, sessionDebug } = useAdmin();
  const [loadingGuardElapsed, setLoadingGuardElapsed] = useState(false);
  const [overview, setOverview] = useState<SecurityOverviewResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/security/overview', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || `Failed to load security overview (${response.status})`);
      }

      const payload = (await response.json()) as SecurityOverviewResponse;
      setOverview(payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load security overview';
      setError(msg);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
      return;
    }

    if (isAuthenticated) {
      void loadOverview();
    }
  }, [isAuthenticated, isLoading, router, loadOverview]);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingGuardElapsed(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  const loadingActive = isLoading && !loadingGuardElapsed;

  const sessionAgeMinutes =
    sessionDebug.sessionAgeMs !== null ? Math.floor(sessionDebug.sessionAgeMs / 60000) : null;
  const sessionExpiresMinutes =
    sessionDebug.expiresInMs !== null ? Math.floor(sessionDebug.expiresInMs / 60000) : null;

  if (loadingActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-200">Loading security overview...</p>
        </div>
      </div>
    );
  }

  if (isLoading && loadingGuardElapsed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="w-full max-w-lg rounded-xl border border-amber-300/30 bg-amber-500/10 p-5 text-amber-100">
          <h1 className="text-lg font-semibold">Admin Session Recovery</h1>
          <p className="mt-2 text-sm text-amber-100/85">Security view hydrate is delayed. Trigger manual recheck.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshSession}
              style={{ minHeight: '44px' }}
              className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Force Session Rehydrate
            </button>
            <Link href="/admin/login" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-lg bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Security Overview</h1>
            <p className="text-sm text-slate-400 mt-1">Audit trail and active lockout state for admin authentication</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/dashboard" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors">
              Back to Dashboard
            </Link>
            <button
              type="button"
              onClick={() => void loadOverview()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
          Session Debug: hasSession={sessionDebug.hasSession ? 'yes' : 'no'} • age={sessionAgeMinutes ?? 'n/a'}m • expiresIn={sessionExpiresMinutes ?? 'n/a'}m
          <button
            type="button"
            onClick={refreshSession}
            className="ml-3 rounded bg-slate-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-600"
          >
            Rehydrate Now
          </button>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Audit Events</p>
            <p className="mt-1 text-2xl font-bold text-cyan-300">{overview?.summary.auditEventCount ?? 0}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Active Lockouts</p>
            <p className="mt-1 text-2xl font-bold text-amber-300">{overview?.summary.activeLockouts ?? 0}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Last Refresh</p>
            <p className="mt-1 text-sm font-semibold text-slate-200">
              {overview ? new Date(overview.generatedAt).toLocaleString() : loadingOverview ? 'Loading...' : 'n/a'}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Actor</p>
            <p className="mt-1 text-sm font-semibold text-slate-200">{overview?.actor.email ?? 'n/a'}</p>
            <p className="text-xs text-slate-400">{overview?.actor.role ?? ''}</p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold text-white mb-3">Lockout State</h2>
          {overview?.lockouts.length ? (
            <div className="space-y-2">
              {overview.lockouts.map((entry) => (
                <div key={entry.key} className="rounded border border-white/10 bg-black/20 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-white">{entry.key}</p>
                    <p className="text-xs text-slate-400">Attempts: {entry.attempts}</p>
                  </div>
                  <span
                    className={`rounded px-2 py-1 text-xs font-semibold ${
                      entry.blocked ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {entry.blocked ? `Blocked (${entry.retryAfterSeconds}s)` : 'Window active'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No lockout entries currently tracked.</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold text-white mb-3">Recent Audit Events</h2>
          {overview?.auditEvents.length ? (
            <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
              {overview.auditEvents.map((event, idx) => (
                <div key={`${event.at}-${idx}`} className="rounded border border-white/10 bg-black/20 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{event.action}</p>
                    <span className="text-xs text-slate-300">{new Date(event.at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">status={event.statusCode} • ip={event.ip} • email={event.email || 'n/a'}</p>
                  {event.detail ? <p className="text-xs text-slate-300 mt-1">{event.detail}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No audit events captured yet.</p>
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
          <p>Storage files:</p>
          <p className="mt-1">Audit log: {overview?.storage.auditLogPath || 'n/a'}</p>
          <p>Rate-limit state: {overview?.storage.rateLimitPath || 'n/a'}</p>
        </div>
      </div>
    </div>
  );
}
