import { CURRENCY_RATES } from '@/lib/currencies';

export interface ManagedCurrency {
  code: string;
  enabled: boolean;
  rateToUsd: number;
  type: 'fiat' | 'crypto';
}

export interface AdminCurrencyConfig {
  managed: ManagedCurrency[];
  updatedAt: string;
}

export interface AdminCurrencyAuditEntry {
  id: string;
  changedAt: string;
  actor: string;
  action: 'save';
  changedCodes: string[];
  rateChangedCodes: string[];
  statusChangedCodes: string[];
  activeBefore: number;
  activeAfter: number;
}

const STORAGE_KEY = 'phcl_admin_currency_config';
const AUDIT_KEY = 'phcl_admin_currency_config_audit';
const CORE_CODES = ['USD', 'TZS', 'NTZS', 'PI', 'BTC', 'ETH', 'USDT'];
const MAX_AUDIT_ENTRIES = 120;

const inferCurrencyType = (code: string): ManagedCurrency['type'] => {
  const upper = code.toUpperCase();
  if (upper === 'USD' || upper === 'TZS') return 'fiat';
  if (upper === 'NTZS') return 'crypto';
  if (upper === 'PI' || upper === 'BTC' || upper === 'ETH' || upper === 'USDT') return 'crypto';
  return 'fiat';
};

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;

const defaultConfig = (): AdminCurrencyConfig => ({
  managed: CORE_CODES.map((code) => ({
    code,
    enabled: code === 'USD' || code === 'TZS' || code === 'NTZS' || code === 'PI',
    rateToUsd: Number((CURRENCY_RATES[code] ?? 1).toFixed(8)),
    type: inferCurrencyType(code),
  })),
  updatedAt: new Date(0).toISOString(),
});

const normalizeManaged = (raw: unknown): ManagedCurrency | null => {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as { code?: unknown; enabled?: unknown; rateToUsd?: unknown; type?: unknown };
  if (typeof row.code !== 'string' || row.code.trim().length < 2) return null;
  const rate = Number(row.rateToUsd);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const normalizedCode = row.code.trim().toUpperCase().slice(0, 10);
  const type = inferCurrencyType(normalizedCode);

  return {
    code: normalizedCode,
    enabled: typeof row.enabled === 'boolean' ? row.enabled : false,
    rateToUsd: Number(rate.toFixed(8)),
    type,
  };
};

const normalizeConfig = (raw: unknown): AdminCurrencyConfig => {
  if (!raw || typeof raw !== 'object') return defaultConfig();
  const row = raw as { managed?: unknown; updatedAt?: unknown };
  if (!Array.isArray(row.managed)) return defaultConfig();

  const normalized = row.managed
    .map((entry) => normalizeManaged(entry))
    .filter((entry): entry is ManagedCurrency => !!entry)
    .slice(0, 40);

  if (normalized.length === 0) return defaultConfig();

  return {
    managed: normalized,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date(0).toISOString(),
  };
};

const readAudit = (): AdminCurrencyAuditEntry[] => {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(AUDIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is AdminCurrencyAuditEntry => {
        if (!entry || typeof entry !== 'object') return false;
        const row = entry as AdminCurrencyAuditEntry;
        return (
          typeof row.id === 'string' &&
          typeof row.changedAt === 'string' &&
          typeof row.actor === 'string' &&
          row.action === 'save' &&
          Array.isArray(row.changedCodes) &&
          Array.isArray(row.rateChangedCodes) &&
          Array.isArray(row.statusChangedCodes) &&
          typeof row.activeBefore === 'number' &&
          typeof row.activeAfter === 'number'
        );
      })
      .slice(0, MAX_AUDIT_ENTRIES);
  } catch {
    return [];
  }
};

const writeAudit = (previous: AdminCurrencyConfig, next: AdminCurrencyConfig, actor: string) => {
  if (!canUseStorage()) return;

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

  if (changedCodes.length === 0) return;

  const event: AdminCurrencyAuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    changedAt: new Date().toISOString(),
    actor,
    action: 'save',
    changedCodes,
    rateChangedCodes,
    statusChangedCodes,
    activeBefore: previous.managed.filter((entry) => entry.enabled).length,
    activeAfter: next.managed.filter((entry) => entry.enabled).length,
  };

  const entries = [event, ...readAudit()].slice(0, MAX_AUDIT_ENTRIES);
  window.localStorage.setItem(AUDIT_KEY, JSON.stringify(entries));
};

export const getAdminCurrencyConfig = (): AdminCurrencyConfig => {
  if (!canUseStorage()) return defaultConfig();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig();
    const parsed = JSON.parse(raw);
    return normalizeConfig(parsed);
  } catch {
    return defaultConfig();
  }
};

export const getAdminCurrencyAudit = (): AdminCurrencyAuditEntry[] => {
  return readAudit();
};

export const saveAdminCurrencyConfig = (config: AdminCurrencyConfig, actor = 'admin'): AdminCurrencyConfig => {
  const previous = getAdminCurrencyConfig();
  const normalized = {
    ...normalizeConfig(config),
    updatedAt: new Date().toISOString(),
  };

  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    writeAudit(previous, normalized, actor);
  }

  return normalized;
};
