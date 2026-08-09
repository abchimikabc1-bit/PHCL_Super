'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/lib/admin-context';
import {
  AdminCurrencyAuditEntry,
  AdminCurrencyConfig,
  ManagedCurrency,
  getAdminCurrencyAudit,
  getAdminCurrencyConfig,
  saveAdminCurrencyConfig,
} from '@/lib/admin-currency-rates';

export default function AdminCurrenciesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdmin();

  const refreshSession = () => {
    router.refresh();
  };

  const sessionDebug = {
    hasSession: isAuthenticated,
    sessionAgeMs: null as number | null,
    expiresInMs: null as number | null,
  };

  const adminUser = null;

  const [loadingGuardElapsed, setLoadingGuardElapsed] = useState(false);
  const [config, setConfig] = useState<AdminCurrencyConfig | null>(null);
  const [auditEvents, setAuditEvents] = useState<AdminCurrencyAuditEntry[]>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
      return;
    }

    if (isAuthenticated) {
      setConfig(getAdminCurrencyConfig());
      setAuditEvents(getAdminCurrencyAudit());
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingGuardElapsed(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  const loadingActive = isLoading && !loadingGuardElapsed;

  const sessionAgeMinutes =
    sessionDebug.sessionAgeMs !== null ? Math.floor(sessionDebug.sessionAgeMs / 60000) : null;
  const sessionExpiresMinutes =
    sessionDebug.expiresInMs !== null ? Math.floor(sessionDebug.expiresInMs / 60000) : null;

  const activeCount = useMemo(
    () => (config ? config.managed.filter((entry) => entry.enabled).length : 0),
    [config]
  );

  const updateCurrency = (code: string, updater: (entry: ManagedCurrency) => ManagedCurrency) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        managed: prev.managed.map((entry) => (entry.code === code ? updater(entry) : entry)),
      };
    });
  };

  const persist = () => {
    if (!config) return;
    const actor =
      (typeof adminUser?.name === 'string' && adminUser.name.trim()) ||
      (typeof adminUser?.email === 'string' && adminUser.email.trim()) ||
      'admin';
    const saved = saveAdminCurrencyConfig(config, actor);
    setConfig(saved);
    setAuditEvents(getAdminCurrencyAudit());
    toast.success('Currency configuration saved');
  };

  if (loadingActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-200">Loading currency management...</p>
        </div>
      </div>
    );
  }

  if (isLoading && loadingGuardElapsed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="w-full max-w-lg rounded-xl border border-amber-300/30 bg-amber-500/10 p-5 text-amber-100">
          <h1 className="text-lg font-semibold">Admin Session Recovery</h1>
          <p className="mt-2 text-sm text-amber-100/85">Currency module session hydrate is delayed. Trigger manual recheck.</p>
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

  if (!isAuthenticated || !config) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Currency Management</h1>
            <p className="text-sm text-slate-400 mt-1">Govern conversion anchors and settlement availability</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/dashboard" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors">
              Back to Dashboard
            </Link>
            <button
              type="button"
              onClick={persist}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
            >
              Save Rates
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300" data-testid="admin-currencies-session-debug">
          Session Debug: hasSession={sessionDebug.hasSession ? 'yes' : 'no'} • age={sessionAgeMinutes ?? 'n/a'}m • expiresIn={sessionExpiresMinutes ?? 'n/a'}m
          <button
            type="button"
            onClick={refreshSession}
            data-testid="admin-currencies-rehydrate"
            className="ml-3 rounded bg-slate-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-600"
          >
            Rehydrate Now
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200" data-testid="admin-currencies-summary">
          Active settlement currencies: <span className="font-semibold text-white">{activeCount}</span> / {config.managed.length}
          <p className="mt-1 text-xs text-slate-400">Updated: {new Date(config.updatedAt).toLocaleString()}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 overflow-x-auto" data-testid="admin-currencies-table-wrap">
          <table className="w-full text-sm text-slate-300" data-testid="admin-currencies-table">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Rate to USD</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {config.managed.map((entry) => (
                <tr key={entry.code} className="border-b border-white/5">
                  <td className="px-3 py-2 font-semibold text-white">{entry.code}</td>
                  <td className="px-3 py-2 uppercase">{entry.type}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0.00000001}
                      step="0.00000001"
                      value={entry.rateToUsd}
                      onChange={(e) => updateCurrency(entry.code, (row) => ({
                        ...row,
                        rateToUsd: Number(e.target.value),
                      }))}
                      className="w-44 rounded border border-white/20 bg-slate-900/70 px-2 py-1 text-sm text-white"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => updateCurrency(entry.code, (row) => ({ ...row, enabled: !row.enabled }))}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${entry.enabled ? 'bg-emerald-400 text-slate-900' : 'bg-slate-700 text-slate-200'}`}
                    >
                      {entry.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4" data-testid="admin-currencies-audit-panel">
          <p className="text-sm font-semibold text-white">Recent Currency Changes</p>
          {auditEvents.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">No currency changes recorded yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {auditEvents.slice(0, 6).map((event) => (
                <div key={event.id} className="rounded border border-white/10 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
                  <p>
                    <span className="font-semibold text-white">{event.actor}</span> updated currencies
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    changed: {event.changedCodes.join(', ') || 'none'} • active {event.activeBefore} → {event.activeAfter}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
