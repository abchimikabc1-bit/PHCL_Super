import { NextRequest, NextResponse } from 'next/server';
import type { AdminCurrencyAuditEntry, AdminCurrencyConfig } from '@/lib/admin-currency-rates';
import { sanitizeAdminCurrencyAudit, sanitizeAdminCurrencyConfig } from '@/lib/admin-currency-rates';
import type { AdminLanguageAuditEntry, AdminLanguageConfig } from '@/lib/admin-language-settings';
import { sanitizeAdminLanguageAudit, sanitizeAdminLanguageConfig } from '@/lib/admin-language-settings';
import type { AdminSettingsAuditEntry, AdminSystemSettings } from '@/lib/admin-settings';
import { getDefaultAdminSettings, sanitizeAdminSettings, sanitizeAdminSettingsAudit } from '@/lib/admin-settings';
import { getServerCommerceSnapshot, saveServerCommerceSnapshot } from '@/lib/server-commerce-store';

type ConfigResource = 'settings' | 'currencies' | 'languages';

const MAX_AUDIT_ENTRIES = 120;

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createSettingsAudit = (
  previous: AdminSystemSettings,
  next: AdminSystemSettings,
  actor: string,
  action: 'save' | 'reset'
): AdminSettingsAuditEntry | null => {
  const keys: Array<Exclude<keyof AdminSystemSettings, 'updatedAt'>> = [
    'maintenanceMode',
    'allowPiPayments',
    'strictTamperBlocking',
    'maxOrdersRetention',
    'defaultDisplayCurrency',
  ];
  const changedKeys = keys.filter((key) => previous[key] !== next[key]);
  if (changedKeys.length === 0) return null;

  return {
    id: createId(),
    changedAt: new Date().toISOString(),
    actor,
    action,
    changedKeys,
    from: {
      maintenanceMode: previous.maintenanceMode,
      allowPiPayments: previous.allowPiPayments,
      strictTamperBlocking: previous.strictTamperBlocking,
      maxOrdersRetention: previous.maxOrdersRetention,
      defaultDisplayCurrency: previous.defaultDisplayCurrency,
    },
    to: {
      maintenanceMode: next.maintenanceMode,
      allowPiPayments: next.allowPiPayments,
      strictTamperBlocking: next.strictTamperBlocking,
      maxOrdersRetention: next.maxOrdersRetention,
      defaultDisplayCurrency: next.defaultDisplayCurrency,
    },
  };
};

const createCurrencyAudit = (
  previous: AdminCurrencyConfig,
  next: AdminCurrencyConfig,
  actor: string
): AdminCurrencyAuditEntry | null => {
  const prevMap = new Map(previous.managed.map((entry) => [entry.code, entry]));
  const nextMap = new Map(next.managed.map((entry) => [entry.code, entry]));
  const allCodes = Array.from(new Set([...prevMap.keys(), ...nextMap.keys()]));
  const changedCodes: string[] = [];
  const rateChangedCodes: string[] = [];
  const statusChangedCodes: string[] = [];

  for (const code of allCodes) {
    const before = prevMap.get(code);
    const after = nextMap.get(code);
    if (!before || !after) {
      changedCodes.push(code);
      continue;
    }
    if (before.rateToUsd !== after.rateToUsd) {
      changedCodes.push(code);
      rateChangedCodes.push(code);
    }
    if (before.enabled !== after.enabled) {
      if (!changedCodes.includes(code)) changedCodes.push(code);
      statusChangedCodes.push(code);
    }
  }

  if (changedCodes.length === 0) return null;

  return {
    id: createId(),
    changedAt: new Date().toISOString(),
    actor,
    action: 'save',
    changedCodes,
    rateChangedCodes,
    statusChangedCodes,
    activeBefore: previous.managed.filter((entry) => entry.enabled).length,
    activeAfter: next.managed.filter((entry) => entry.enabled).length,
  };
};

const createLanguageAudit = (
  previous: AdminLanguageConfig,
  next: AdminLanguageConfig,
  actor: string
): AdminLanguageAuditEntry | null => {
  const prevSet = new Set(previous.enabledLanguages);
  const nextSet = new Set(next.enabledLanguages);
  const addedLanguages = next.enabledLanguages.filter((code) => !prevSet.has(code));
  const removedLanguages = previous.enabledLanguages.filter((code) => !nextSet.has(code));
  const defaultChanged = previous.defaultLanguage !== next.defaultLanguage;

  if (addedLanguages.length === 0 && removedLanguages.length === 0 && !defaultChanged) {
    return null;
  }

  return {
    id: createId(),
    changedAt: new Date().toISOString(),
    actor,
    action: 'save',
    addedLanguages,
    removedLanguages,
    defaultLanguageFrom: previous.defaultLanguage,
    defaultLanguageTo: next.defaultLanguage,
  };
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      resource?: ConfigResource;
      action?: 'save' | 'reset';
      actor?: string;
      expectedRevision?: number;
      settings?: AdminSystemSettings;
      currencyConfig?: AdminCurrencyConfig;
      languageConfig?: AdminLanguageConfig;
    };

    const current = getServerCommerceSnapshot();
    if (typeof body.expectedRevision === 'number' && body.expectedRevision !== current.revision) {
      return NextResponse.json(
        { success: false, error: 'Commerce snapshot revision conflict', snapshot: current },
        { status: 409 }
      );
    }

    const actor = typeof body.actor === 'string' && body.actor.trim() ? body.actor.trim().slice(0, 120) : 'admin';

    if (body.resource === 'settings') {
      const previous = current.adminSettings ?? getDefaultAdminSettings();
      const normalized = body.action === 'reset'
        ? { ...getDefaultAdminSettings(), updatedAt: new Date().toISOString() }
        : {
            ...(sanitizeAdminSettings(body.settings) ?? previous),
            updatedAt: new Date().toISOString(),
          };

      const auditEntry = createSettingsAudit(previous, normalized, actor, body.action === 'reset' ? 'reset' : 'save');
      const nextAudit = sanitizeAdminSettingsAudit(
        auditEntry ? [auditEntry, ...current.adminSettingsAudit] : current.adminSettingsAudit
      ).slice(0, MAX_AUDIT_ENTRIES);
      const snapshot = saveServerCommerceSnapshot({ adminSettings: normalized, adminSettingsAudit: nextAudit });
      return NextResponse.json({ success: true, snapshot });
    }

    if (body.resource === 'currencies') {
      const normalized = sanitizeAdminCurrencyConfig(body.currencyConfig);
      if (!normalized) {
        return NextResponse.json({ success: false, error: 'Invalid currency configuration payload' }, { status: 400 });
      }
      const previous = current.currencyConfig ?? normalized;
      const next = { ...normalized, updatedAt: new Date().toISOString() };
      const auditEntry = createCurrencyAudit(previous, next, actor);
      const nextAudit = sanitizeAdminCurrencyAudit(
        auditEntry ? [auditEntry, ...current.currencyAudit] : current.currencyAudit
      ).slice(0, MAX_AUDIT_ENTRIES);
      const snapshot = saveServerCommerceSnapshot({ currencyConfig: next, currencyAudit: nextAudit });
      return NextResponse.json({ success: true, snapshot });
    }

    if (body.resource === 'languages') {
      const normalized = sanitizeAdminLanguageConfig(body.languageConfig);
      if (!normalized) {
        return NextResponse.json({ success: false, error: 'Invalid language configuration payload' }, { status: 400 });
      }
      const previous = current.languageConfig ?? normalized;
      const next = { ...normalized, updatedAt: new Date().toISOString() };
      const auditEntry = createLanguageAudit(previous, next, actor);
      const nextAudit = sanitizeAdminLanguageAudit(
        auditEntry ? [auditEntry, ...current.languageAudit] : current.languageAudit
      ).slice(0, MAX_AUDIT_ENTRIES);
      const snapshot = saveServerCommerceSnapshot({ languageConfig: next, languageAudit: nextAudit });
      return NextResponse.json({ success: true, snapshot });
    }

    return NextResponse.json({ success: false, error: 'Unsupported config resource' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save admin config' },
      { status: 400 }
    );
  }
}