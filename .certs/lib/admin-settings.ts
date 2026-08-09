export type DefaultCurrency = 'usd' | 'tzs' | 'ntzs' | 'pi';

export interface AdminSystemSettings {
  maintenanceMode: boolean;
  allowPiPayments: boolean;
  strictTamperBlocking: boolean;
  maxOrdersRetention: number;
  defaultDisplayCurrency: DefaultCurrency;
  updatedAt: string;
}

export interface AdminSettingsAuditEntry {
  id: string;
  changedAt: string;
  actor: string;
  action: 'save' | 'reset';
  changedKeys: Array<Exclude<keyof AdminSystemSettings, 'updatedAt'>>;
  from: Pick<AdminSystemSettings, 'maintenanceMode' | 'allowPiPayments' | 'strictTamperBlocking' | 'maxOrdersRetention' | 'defaultDisplayCurrency'>;
  to: Pick<AdminSystemSettings, 'maintenanceMode' | 'allowPiPayments' | 'strictTamperBlocking' | 'maxOrdersRetention' | 'defaultDisplayCurrency'>;
}

const ADMIN_SETTINGS_KEY = 'phcl_admin_settings';
const ADMIN_SETTINGS_AUDIT_KEY = 'phcl_admin_settings_audit';
const MAX_AUDIT_EVENTS = 120;

const DEFAULT_SETTINGS: AdminSystemSettings = {
  maintenanceMode: false,
  allowPiPayments: true,
  strictTamperBlocking: true,
  maxOrdersRetention: 25,
  defaultDisplayCurrency: 'usd',
  updatedAt: new Date(0).toISOString(),
};

const canUseStorage = (): boolean => typeof window !== 'undefined' && !!window.localStorage;

const toBool = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const toCurrency = (value: unknown, fallback: DefaultCurrency): DefaultCurrency => {
  if (value === 'usd' || value === 'tzs' || value === 'ntzs' || value === 'pi') {
    return value;
  }
  return fallback;
};

const toRetention = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(10, Math.floor(parsed)));
};

const normalizeSettings = (raw: unknown): AdminSystemSettings => {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }

  const row = raw as {
    maintenanceMode?: unknown;
    allowPiPayments?: unknown;
    strictTamperBlocking?: unknown;
    maxOrdersRetention?: unknown;
    defaultDisplayCurrency?: unknown;
    updatedAt?: unknown;
  };

  return {
    maintenanceMode: toBool(row.maintenanceMode, DEFAULT_SETTINGS.maintenanceMode),
    allowPiPayments: toBool(row.allowPiPayments, DEFAULT_SETTINGS.allowPiPayments),
    strictTamperBlocking: toBool(row.strictTamperBlocking, DEFAULT_SETTINGS.strictTamperBlocking),
    maxOrdersRetention: toRetention(row.maxOrdersRetention, DEFAULT_SETTINGS.maxOrdersRetention),
    defaultDisplayCurrency: toCurrency(row.defaultDisplayCurrency, DEFAULT_SETTINGS.defaultDisplayCurrency),
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : DEFAULT_SETTINGS.updatedAt,
  };
};

const SETTINGS_KEYS: Array<Exclude<keyof AdminSystemSettings, 'updatedAt'>> = [
  'maintenanceMode',
  'allowPiPayments',
  'strictTamperBlocking',
  'maxOrdersRetention',
  'defaultDisplayCurrency',
];

const compactSettings = (settings: AdminSystemSettings) => ({
  maintenanceMode: settings.maintenanceMode,
  allowPiPayments: settings.allowPiPayments,
  strictTamperBlocking: settings.strictTamperBlocking,
  maxOrdersRetention: settings.maxOrdersRetention,
  defaultDisplayCurrency: settings.defaultDisplayCurrency,
});

const readAuditEntries = (): AdminSettingsAuditEntry[] => {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(ADMIN_SETTINGS_AUDIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry): entry is AdminSettingsAuditEntry => {
        if (!entry || typeof entry !== 'object') return false;
        const row = entry as AdminSettingsAuditEntry;
        return (
          typeof row.id === 'string' &&
          typeof row.changedAt === 'string' &&
          typeof row.actor === 'string' &&
          (row.action === 'save' || row.action === 'reset') &&
          Array.isArray(row.changedKeys) &&
          typeof row.from === 'object' &&
          typeof row.to === 'object'
        );
      })
      .slice(0, MAX_AUDIT_EVENTS);
  } catch {
    return [];
  }
};

const writeAuditEntry = (
  previous: AdminSystemSettings,
  next: AdminSystemSettings,
  action: 'save' | 'reset',
  actor: string
) => {
  if (!canUseStorage()) return;

  const changedKeys = SETTINGS_KEYS.filter((key) => previous[key] !== next[key]);
  if (changedKeys.length === 0) return;

  const event: AdminSettingsAuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    changedAt: new Date().toISOString(),
    actor,
    action,
    changedKeys,
    from: compactSettings(previous),
    to: compactSettings(next),
  };

  const nextEntries = [event, ...readAuditEntries()].slice(0, MAX_AUDIT_EVENTS);
  window.localStorage.setItem(ADMIN_SETTINGS_AUDIT_KEY, JSON.stringify(nextEntries));
};

export const getAdminSettings = (): AdminSystemSettings => {
  if (!canUseStorage()) return { ...DEFAULT_SETTINGS };

  try {
    const raw = window.localStorage.getItem(ADMIN_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return normalizeSettings(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

export const getAdminSettingsAudit = (): AdminSettingsAuditEntry[] => {
  return readAuditEntries();
};

export const saveAdminSettings = (settings: AdminSystemSettings, actor = 'admin'): AdminSystemSettings => {
  const previous = getAdminSettings();
  const normalized: AdminSystemSettings = {
    ...normalizeSettings(settings),
    updatedAt: new Date().toISOString(),
  };

  if (canUseStorage()) {
    window.localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(normalized));
    writeAuditEntry(previous, normalized, 'save', actor);
  }

  return normalized;
};

export const resetAdminSettings = (actor = 'admin'): AdminSystemSettings => {
  const previous = getAdminSettings();
  const next = {
    ...DEFAULT_SETTINGS,
    updatedAt: new Date().toISOString(),
  };

  if (canUseStorage()) {
    window.localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(next));
    writeAuditEntry(previous, next, 'reset', actor);
  }

  return next;
};
