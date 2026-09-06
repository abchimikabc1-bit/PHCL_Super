'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/lib/admin-context';
import { useCommerceBootstrap } from '@/hooks/use-commerce-bootstrap';
import { useCommerceSnapshot } from '@/hooks/use-commerce-snapshot';
import { refreshCommerceClientCache } from '@/lib/commerce-client-cache';
import {
  activatePolicyVersion,
  createPolicyVersion,
  getPolicyRegistry,
  getPolicyVersions,
  isValidPolicyVersion,
  PolicyKind,
  PolicyRegistryEntry,
} from '@/lib/policy-compliance';
import {
  AdminSettingsAuditEntry,
  AdminSystemSettings,
  getAdminSettingsAudit,
  getAdminSettings,
  resetAdminSettings,
  saveAdminSettings,
} from '@/lib/admin-settings';

type BackupSnapshotSummary = {
  cartItems: number;
  orders: number;
  walletLedger: number;
  orderStatuses: number;
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, refreshSession, sessionDebug, adminUser } = useAdmin();
  const { snapshot } = useCommerceSnapshot();
  const [loadingGuardElapsed, setLoadingGuardElapsed] = useState(false);
  const [settings, setSettings] = useState<AdminSystemSettings | null>(null);
  const [auditEvents, setAuditEvents] = useState<AdminSettingsAuditEntry[]>([]);
  const [policyRegistry, setPolicyRegistry] = useState<PolicyRegistryEntry[]>([]);
  const [policyVersions, setPolicyVersions] = useState(getPolicyVersions());
  const [policyDraft, setPolicyDraft] = useState({
    policy: 'terms' as PolicyKind,
    version: '',
    label: 'Terms of Service',
    effectiveDate: new Date().toISOString().slice(0, 10),
  });
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [backupSummary, setBackupSummary] = useState<BackupSnapshotSummary | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  const refreshPolicyState = () => {
    setPolicyRegistry(getPolicyRegistry());
    setPolicyVersions(getPolicyVersions());
  };

  useCommerceBootstrap(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
      return;
    }

    if (isAuthenticated) {
      setSettings(getAdminSettings());
      setAuditEvents(getAdminSettingsAudit());
      refreshPolicyState();
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

  const updateSetting = <K extends keyof AdminSystemSettings>(key: K, value: AdminSystemSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const persistSettings = () => {
    if (!settings) return;
    const actor =
      (typeof adminUser?.name === 'string' && adminUser.name.trim()) ||
      (typeof adminUser?.email === 'string' && adminUser.email.trim()) ||
      'admin';
    void (async () => {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: 'settings',
          action: 'save',
          actor,
          expectedRevision: snapshot?.revision,
          settings,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        toast.error(payload?.error || 'Failed to save settings');
        if (response.status === 409) {
          await refreshCommerceClientCache();
        }
        return;
      }
      await refreshCommerceClientCache();
      setSettings(payload.snapshot?.adminSettings ?? settings);
      setAuditEvents(payload.snapshot?.adminSettingsAudit ?? getAdminSettingsAudit());
      toast.success('System settings saved');
    })();
  };

  const restoreDefaults = () => {
    const actor =
      (typeof adminUser?.name === 'string' && adminUser.name.trim()) ||
      (typeof adminUser?.email === 'string' && adminUser.email.trim()) ||
      'admin';
    void (async () => {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: 'settings',
          action: 'reset',
          actor,
          expectedRevision: snapshot?.revision,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        toast.error(payload?.error || 'Failed to restore default settings');
        if (response.status === 409) {
          await refreshCommerceClientCache();
        }
        return;
      }
      await refreshCommerceClientCache();
      setSettings(payload.snapshot?.adminSettings ?? settings);
      setAuditEvents(payload.snapshot?.adminSettingsAudit ?? getAdminSettingsAudit());
      toast.success('Default settings restored');
    })();
  };

  const createPolicyHistoryEntry = () => {
    if (!isValidPolicyVersion(policyDraft.version)) {
      toast.error('Version format must be YYYY-MM (example: 2026-08).');
      return;
    }

    const result = createPolicyVersion({
      policy: policyDraft.policy,
      version: policyDraft.version,
      label: policyDraft.label,
      effectiveDate: policyDraft.effectiveDate,
    });

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    refreshPolicyState();
    setPolicyDraft((prev) => ({ ...prev, version: '' }));
    toast.success(result.message);
  };

  const summarizeBackupSnapshot = (snapshot: any): BackupSnapshotSummary => ({
    cartItems: Array.isArray(snapshot?.cartItems) ? snapshot.cartItems.length : 0,
    orders: Array.isArray(snapshot?.orders) ? snapshot.orders.length : 0,
    walletLedger: Array.isArray(snapshot?.walletLedger) ? snapshot.walletLedger.length : 0,
    orderStatuses: snapshot?.orderStatusMap && typeof snapshot.orderStatusMap === 'object'
      ? Object.keys(snapshot.orderStatusMap).length
      : 0,
  });

  const exportBackup = async () => {
    try {
      setIsExportingBackup(true);
      const response = await fetch('/api/commerce/backup', { cache: 'no-store' });
      const payload = await response.json();

      if (!response.ok || !payload?.success || !payload?.snapshot) {
        throw new Error(payload?.error || 'Failed to export backup');
      }

      const exportedAt = typeof payload.exportedAt === 'string' ? payload.exportedAt : new Date().toISOString();
      const summary = summarizeBackupSnapshot(payload.snapshot);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `commerce-backup-${exportedAt.replace(/[:.]/g, '-')}.json`;
      anchor.click();
      URL.revokeObjectURL(url);

      setBackupSummary(summary);
      setLastBackupAt(exportedAt);
      toast.success('Commerce backup exported');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export backup');
    } finally {
      setIsExportingBackup(false);
    }
  };

  const importBackup = async (file: File) => {
    try {
      setIsImportingBackup(true);
      const raw = await file.text();
      const parsed = JSON.parse(raw) as { snapshot?: unknown; version?: number; checksum?: string; exportedAt?: string };

      if (!parsed?.snapshot) {
        throw new Error('Backup file is missing snapshot payload');
      }

      const response = await fetch('/api/commerce/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success || !payload?.snapshot) {
        throw new Error(payload?.error || 'Failed to import backup');
      }

      const importedAt = typeof payload.importedAt === 'string' ? payload.importedAt : new Date().toISOString();
      setBackupSummary(summarizeBackupSnapshot(payload.snapshot));
      setLastBackupAt(importedAt);
      toast.success('Commerce backup imported');

      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import backup');
    } finally {
      setIsImportingBackup(false);
      if (backupInputRef.current) {
        backupInputRef.current.value = '';
      }
    }
  };

  const setPolicyActive = (entry: PolicyRegistryEntry) => {
    const result = activatePolicyVersion(entry.id);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    refreshPolicyState();
    toast.success(result.message);
  };

  const termsEntries = policyRegistry.filter((entry) => entry.policy === 'terms');
  const privacyEntries = policyRegistry.filter((entry) => entry.policy === 'privacy');

  if (loadingActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-200">Loading system settings...</p>
        </div>
      </div>
    );
  }

  if (isLoading && loadingGuardElapsed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="w-full max-w-lg rounded-xl border border-amber-300/30 bg-amber-500/10 p-5 text-amber-100">
          <h1 className="text-lg font-semibold">Admin Session Recovery</h1>
          <p className="mt-2 text-sm text-amber-100/85">Settings session hydrate is delayed. Trigger manual recheck.</p>
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

  if (!isAuthenticated || !settings) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">System Settings</h1>
            <p className="text-sm text-slate-400 mt-1">Configure core commerce policies and runtime defaults</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/dashboard" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors">
              Back to Dashboard
            </Link>
            <button
              type="button"
              onClick={persistSettings}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
          Session Debug: hasSession={sessionDebug.hasSession ? 'yes' : 'no'} • age={sessionAgeMinutes ?? 'n/a'}m • expiresIn={sessionExpiresMinutes ?? 'n/a'}m
          <button
            type="button"
            onClick={refreshSession}
            className="ml-3 rounded bg-slate-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-600"
          >
            Rehydrate Now
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
            <div>
              <p className="text-sm font-semibold text-white">Maintenance Mode</p>
              <p className="text-xs text-slate-400">Temporarily limit storefront operations for maintenance windows.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSetting('maintenanceMode', !settings.maintenanceMode)}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${settings.maintenanceMode ? 'bg-amber-400 text-slate-900' : 'bg-slate-700 text-slate-200'}`}
            >
              {settings.maintenanceMode ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
            <div>
              <p className="text-sm font-semibold text-white">PI Payments</p>
              <p className="text-xs text-slate-400">Allow PI settlement channel on checkout.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSetting('allowPiPayments', !settings.allowPiPayments)}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${settings.allowPiPayments ? 'bg-emerald-400 text-slate-900' : 'bg-slate-700 text-slate-200'}`}
            >
              {settings.allowPiPayments ? 'Allowed' : 'Blocked'}
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
            <div>
              <p className="text-sm font-semibold text-white">Strict Tamper Blocking</p>
              <p className="text-xs text-slate-400">Reject and hide manipulated order records.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSetting('strictTamperBlocking', !settings.strictTamperBlocking)}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${settings.strictTamperBlocking ? 'bg-emerald-400 text-slate-900' : 'bg-slate-700 text-slate-200'}`}
            >
              {settings.strictTamperBlocking ? 'Strict' : 'Permissive'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <label className="text-sm font-semibold text-white block mb-2">Max Orders Retention</label>
              <input
                type="number"
                min={10}
                max={100}
                value={settings.maxOrdersRetention}
                onChange={(e) => updateSetting('maxOrdersRetention', Number(e.target.value))}
                className="w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <label className="text-sm font-semibold text-white block mb-2">Default Display Currency</label>
              <select
                value={settings.defaultDisplayCurrency}
                onChange={(e) => updateSetting('defaultDisplayCurrency', e.target.value as AdminSystemSettings['defaultDisplayCurrency'])}
                className="w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white"
              >
                <option value="usd">USD</option>
                <option value="tzs">TZS</option>
                <option value="ntzs">nTZS</option>
                <option value="pi">PI</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">Last updated: {new Date(settings.updatedAt).toLocaleString()}</p>
            <button
              type="button"
              onClick={restoreDefaults}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
            >
              Restore Defaults
            </button>
          </div>

          <div className="rounded-lg border border-cyan-300/20 bg-cyan-500/10 p-4">
            <p className="text-sm font-semibold text-white">Policy Registry</p>
            <p className="mt-1 text-xs text-cyan-100/90">
              Active legal consent versions used for signup and checkout audit capture.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              <span className="rounded bg-slate-900/50 px-2 py-1 text-slate-200">Terms of Service: v{policyVersions.termsVersion}</span>
              <span className="rounded bg-slate-900/50 px-2 py-1 text-slate-200">Privacy Policy: v{policyVersions.privacyVersion}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/terms-of-service" className="rounded bg-cyan-300 px-3 py-1 text-xs font-semibold text-slate-900">Open Terms</Link>
              <Link href="/privacy-policy" className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold text-cyan-100">Open Privacy</Link>
            </div>
          </div>

          <div className="rounded-lg border border-amber-300/20 bg-amber-500/10 p-4">
            <p className="text-sm font-semibold text-white">Policy Lifecycle Controls</p>
            <p className="mt-1 text-xs text-amber-100/90">
              Add new policy versions to history, then activate the chosen version for live consent capture.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              <select
                value={policyDraft.policy}
                onChange={(e) =>
                  setPolicyDraft((prev) => ({
                    ...prev,
                    policy: e.target.value as PolicyKind,
                    label: e.target.value === 'terms' ? 'Terms of Service' : 'Privacy Policy',
                  }))
                }
                className="rounded border border-white/20 bg-slate-900/60 px-3 py-2 text-xs text-white"
              >
                <option value="terms">Terms</option>
                <option value="privacy">Privacy</option>
              </select>
              <input
                value={policyDraft.version}
                onChange={(e) => setPolicyDraft((prev) => ({ ...prev, version: e.target.value }))}
                placeholder="Version (YYYY-MM)"
                className="rounded border border-white/20 bg-slate-900/60 px-3 py-2 text-xs text-white"
              />
              <input
                value={policyDraft.effectiveDate}
                onChange={(e) => setPolicyDraft((prev) => ({ ...prev, effectiveDate: e.target.value }))}
                type="date"
                className="rounded border border-white/20 bg-slate-900/60 px-3 py-2 text-xs text-white"
              />
              <button
                type="button"
                onClick={createPolicyHistoryEntry}
                className="rounded bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-amber-200"
              >
                Add to History
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded border border-white/10 bg-slate-900/40 p-3">
                <p className="text-xs font-semibold text-white">Terms Lifecycle</p>
                <div className="mt-2 space-y-2">
                  {termsEntries.map((entry) => (
                    <div key={entry.id} className="rounded border border-white/10 bg-slate-900/40 px-2 py-2 text-[11px] text-slate-200">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          v{entry.version} • {entry.status === 'active' ? 'Active' : 'History'}
                        </span>
                        {entry.status !== 'active' && (
                          <button
                            type="button"
                            onClick={() => setPolicyActive(entry)}
                            className="rounded bg-emerald-500/80 px-2 py-1 font-semibold text-white"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Effective: {new Date(entry.effectiveDate).toLocaleDateString()} • Activated: {new Date(entry.activatedAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded border border-white/10 bg-slate-900/40 p-3">
                <p className="text-xs font-semibold text-white">Privacy Lifecycle</p>
                <div className="mt-2 space-y-2">
                  {privacyEntries.map((entry) => (
                    <div key={entry.id} className="rounded border border-white/10 bg-slate-900/40 px-2 py-2 text-[11px] text-slate-200">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          v{entry.version} • {entry.status === 'active' ? 'Active' : 'History'}
                        </span>
                        {entry.status !== 'active' && (
                          <button
                            type="button"
                            onClick={() => setPolicyActive(entry)}
                            className="rounded bg-emerald-500/80 px-2 py-1 font-semibold text-white"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Effective: {new Date(entry.effectiveDate).toLocaleDateString()} • Activated: {new Date(entry.activatedAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-4" data-testid="admin-settings-audit-panel">
            <div className="mb-5 rounded-lg border border-cyan-300/20 bg-cyan-500/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Commerce Backup Controls</p>
                  <p className="mt-1 text-xs text-cyan-100/90">
                    Export or import cart, orders, wallet, and admin order metadata from the server-backed commerce snapshot.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportBackup}
                    disabled={isExportingBackup || isImportingBackup}
                    className="rounded-lg bg-cyan-300 px-4 py-2 text-xs font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isExportingBackup ? 'Exporting...' : 'Export Backup'}
                  </button>
                  <button
                    type="button"
                    onClick={() => backupInputRef.current?.click()}
                    disabled={isExportingBackup || isImportingBackup}
                    className="rounded-lg bg-slate-700 px-4 py-2 text-xs font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isImportingBackup ? 'Importing...' : 'Import Backup'}
                  </button>
                  <input
                    ref={backupInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void importBackup(file);
                      }
                    }}
                  />
                </div>
              </div>

              {backupSummary && (
                <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-4">
                  <span className="rounded bg-slate-900/50 px-2 py-1 text-slate-200">Cart Items: {backupSummary.cartItems}</span>
                  <span className="rounded bg-slate-900/50 px-2 py-1 text-slate-200">Orders: {backupSummary.orders}</span>
                  <span className="rounded bg-slate-900/50 px-2 py-1 text-slate-200">Wallet Ledger: {backupSummary.walletLedger}</span>
                  <span className="rounded bg-slate-900/50 px-2 py-1 text-slate-200">Order Statuses: {backupSummary.orderStatuses}</span>
                </div>
              )}

              {lastBackupAt && (
                <p className="mt-3 text-[11px] text-cyan-100/80">Last backup action: {new Date(lastBackupAt).toLocaleString()}</p>
              )}
            </div>

            <p className="text-sm font-semibold text-white">Recent Settings Changes</p>
            {auditEvents.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">No settings changes recorded yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {auditEvents.slice(0, 6).map((event) => (
                  <div key={event.id} className="rounded border border-white/10 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
                    <p>
                      <span className="font-semibold text-white">{event.actor}</span> {event.action === 'reset' ? 'reset settings' : 'updated settings'}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      keys: {event.changedKeys.join(', ')} • {new Date(event.changedAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
