'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/lib/admin-context';
import { useCommerceSnapshot } from '@/hooks/use-commerce-snapshot';
import { useCommerceBootstrap } from '@/hooks/use-commerce-bootstrap';
import { refreshCommerceClientCache } from '@/lib/commerce-client-cache';
import {
  AdminLanguageAuditEntry,
  AdminLanguageConfig,
  getAdminLanguageAudit,
  getAdminLanguageConfig,
  saveAdminLanguageConfig,
} from '@/lib/admin-language-settings';
import { LANGUAGE_OPTIONS } from '@/lib/translations';

export default function AdminLanguagesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, sessionDebug, adminUser } = useAdmin();
  const { snapshot } = useCommerceSnapshot();

  const refreshSession = () => {
    router.refresh();
  };

  const [loadingGuardElapsed, setLoadingGuardElapsed] = useState(false);
  const [config, setConfig] = useState<AdminLanguageConfig | null>(null);
  const [auditEvents, setAuditEvents] = useState<AdminLanguageAuditEntry[]>([]);

  useEffect(() => {
    if (!snapshot) return;
    setConfig(snapshot.languageConfig ?? getAdminLanguageConfig());
    setAuditEvents(snapshot.languageAudit);
  }, [snapshot]);

  useCommerceBootstrap(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
      return;
    }

    if (isAuthenticated) {
      setConfig(getAdminLanguageConfig());
      setAuditEvents(getAdminLanguageAudit());
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

  const enabledSet = useMemo(
    () => new Set(config?.enabledLanguages ?? []),
    [config]
  );

  const toggleLanguage = (code: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const enabled = new Set(prev.enabledLanguages);
      if (enabled.has(code)) {
        enabled.delete(code);
      } else {
        enabled.add(code);
      }

      const nextEnabled = Array.from(enabled);
      const nextDefault = nextEnabled.includes(prev.defaultLanguage)
        ? prev.defaultLanguage
        : nextEnabled[0] || 'en';

      return {
        ...prev,
        enabledLanguages: nextEnabled,
        defaultLanguage: nextDefault,
      };
    });
  };

  const persist = () => {
    if (!config) return;
    const actor =
      (typeof adminUser?.name === 'string' && adminUser.name.trim()) ||
      (typeof adminUser?.email === 'string' && adminUser.email.trim()) ||
      'admin';
    void (async () => {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: 'languages',
          actor,
          expectedRevision: snapshot?.revision,
          languageConfig: config,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        toast.error(payload?.error || 'Failed to save language configuration');
        if (response.status === 409) {
          await refreshCommerceClientCache();
        }
        return;
      }
      await refreshCommerceClientCache();
      setConfig(payload.snapshot?.languageConfig ?? config);
      setAuditEvents(payload.snapshot?.languageAudit ?? getAdminLanguageAudit());
      toast.success('Language configuration saved');
    })();
  };

  if (loadingActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-200">Loading language management...</p>
        </div>
      </div>
    );
  }

  if (isLoading && loadingGuardElapsed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="w-full max-w-lg rounded-xl border border-amber-300/30 bg-amber-500/10 p-5 text-amber-100">
          <h1 className="text-lg font-semibold">Admin Session Recovery</h1>
          <p className="mt-2 text-sm text-amber-100/85">Language module session hydrate is delayed. Trigger manual recheck.</p>
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

  if (!isAuthenticated || !config) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Language Management</h1>
            <p className="text-sm text-slate-400 mt-1">Control active locales and platform default language</p>
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
              Save Languages
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300" data-testid="admin-languages-session-debug">
          Session Debug: hasSession={sessionDebug.hasSession ? 'yes' : 'no'} • age={sessionAgeMinutes ?? 'n/a'}m • expiresIn={sessionExpiresMinutes ?? 'n/a'}m
          <button
            type="button"
            onClick={refreshSession}
            data-testid="admin-languages-rehydrate"
            className="ml-3 rounded bg-slate-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-600"
          >
            Rehydrate Now
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200" data-testid="admin-languages-summary">
          Enabled languages: <span className="font-semibold text-white">{config.enabledLanguages.length}</span> / {LANGUAGE_OPTIONS.length}
          <p className="mt-1 text-xs text-slate-400">Last updated: {new Date(config.updatedAt).toLocaleString()}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4" data-testid="admin-languages-panel">
          <div>
            <label className="text-sm font-semibold text-white">Default Language</label>
            <select
              value={config.defaultLanguage}
              onChange={(e) => setConfig((prev) => (prev ? { ...prev, defaultLanguage: e.target.value } : prev))}
              className="mt-2 w-full md:w-80 rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white"
            >
              {config.enabledLanguages.map((code) => {
                const option = LANGUAGE_OPTIONS.find((entry) => entry.code === code);
                return (
                  <option key={code} value={code}>
                    {option ? `${option.flag} ${option.name}` : code}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {LANGUAGE_OPTIONS.map((lang) => {
              const enabled = enabledSet.has(lang.code);
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => toggleLanguage(lang.code)}
                  className={`rounded-lg border px-3 py-2 text-left transition ${
                    enabled
                      ? 'border-emerald-300/40 bg-emerald-500/15 text-emerald-100'
                      : 'border-white/10 bg-white/5 text-slate-200'
                  }`}
                >
                  <p className="text-sm font-semibold">{lang.flag} {lang.name}</p>
                  <p className="text-xs mt-1">{enabled ? 'Enabled' : 'Disabled'}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4" data-testid="admin-languages-audit-panel">
          <p className="text-sm font-semibold text-white">Recent Language Changes</p>
          {auditEvents.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">No language changes recorded yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {auditEvents.slice(0, 6).map((event) => (
                <div key={event.id} className="rounded border border-white/10 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
                  <p>
                    <span className="font-semibold text-white">{event.actor}</span> updated languages
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    +[{event.addedLanguages.join(', ') || '-'}] -[{event.removedLanguages.join(', ') || '-'}] • default {event.defaultLanguageFrom} → {event.defaultLanguageTo}
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
