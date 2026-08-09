import { hydrateCommerceStateFromServer, syncCommerceStateToServer } from '@/lib/commerce-sync';
import { LANGUAGE_OPTIONS } from '@/lib/translations';

export interface AdminLanguageConfig {
  enabledLanguages: string[];
  defaultLanguage: string;
  updatedAt: string;
}

export interface AdminLanguageAuditEntry {
  id: string;
  changedAt: string;
  actor: string;
  action: 'save';
  addedLanguages: string[];
  removedLanguages: string[];
  defaultLanguageFrom: string;
  defaultLanguageTo: string;
}

const STORAGE_KEY = 'phcl_admin_language_config';
const AUDIT_KEY = 'phcl_admin_language_config_audit';
const MAX_AUDIT_ENTRIES = 120;
let attemptedLanguageHydration = false;

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;

const ALL_CODES = LANGUAGE_OPTIONS.map((item) => item.code);

const defaultConfig = (): AdminLanguageConfig => ({
  enabledLanguages: ['en', 'sw', 'fr', 'de'],
  defaultLanguage: 'en',
  updatedAt: new Date(0).toISOString(),
});

const normalizeConfig = (raw: unknown): AdminLanguageConfig => {
  if (!raw || typeof raw !== 'object') return defaultConfig();

  const row = raw as { enabledLanguages?: unknown; defaultLanguage?: unknown; updatedAt?: unknown };
  const enabled = Array.isArray(row.enabledLanguages)
    ? row.enabledLanguages
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.toLowerCase())
        .filter((entry) => ALL_CODES.includes(entry as (typeof ALL_CODES)[number]))
    : defaultConfig().enabledLanguages;

  const uniqueEnabled = Array.from(new Set(enabled)).slice(0, ALL_CODES.length);
  const fallbackEnabled = uniqueEnabled.length > 0 ? uniqueEnabled : defaultConfig().enabledLanguages;

  const desiredDefault = typeof row.defaultLanguage === 'string' ? row.defaultLanguage.toLowerCase() : defaultConfig().defaultLanguage;
  const defaultLanguage = fallbackEnabled.includes(desiredDefault) ? desiredDefault : fallbackEnabled[0];

  return {
    enabledLanguages: fallbackEnabled,
    defaultLanguage,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date(0).toISOString(),
  };
};

export const sanitizeAdminLanguageConfig = (raw: unknown): AdminLanguageConfig | null => {
  if (!raw || typeof raw !== 'object') return null;
  return normalizeConfig(raw);
};

const readAudit = (): AdminLanguageAuditEntry[] => {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(AUDIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is AdminLanguageAuditEntry => {
        if (!entry || typeof entry !== 'object') return false;
        const row = entry as AdminLanguageAuditEntry;
        return (
          typeof row.id === 'string' &&
          typeof row.changedAt === 'string' &&
          typeof row.actor === 'string' &&
          row.action === 'save' &&
          Array.isArray(row.addedLanguages) &&
          Array.isArray(row.removedLanguages) &&
          typeof row.defaultLanguageFrom === 'string' &&
          typeof row.defaultLanguageTo === 'string'
        );
      })
      .slice(0, MAX_AUDIT_ENTRIES);
  } catch {
    return [];
  }
};

export const sanitizeAdminLanguageAudit = (raw: unknown): AdminLanguageAuditEntry[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is AdminLanguageAuditEntry => {
      if (!entry || typeof entry !== 'object') return false;
      const row = entry as AdminLanguageAuditEntry;
      return (
        typeof row.id === 'string' &&
        typeof row.changedAt === 'string' &&
        typeof row.actor === 'string' &&
        row.action === 'save' &&
        Array.isArray(row.addedLanguages) &&
        Array.isArray(row.removedLanguages) &&
        typeof row.defaultLanguageFrom === 'string' &&
        typeof row.defaultLanguageTo === 'string'
      );
    })
    .slice(0, MAX_AUDIT_ENTRIES);
};

const hydrateLanguageFromServer = (): void => {
  if (attemptedLanguageHydration || !canUseStorage()) return;
  attemptedLanguageHydration = true;

  void hydrateCommerceStateFromServer().then((snapshot) => {
    if (!snapshot) return;
    const config = sanitizeAdminLanguageConfig(snapshot.languageConfig);
    const audit = sanitizeAdminLanguageAudit(snapshot.languageAudit);
    if (config) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
    if (audit.length > 0) {
      window.localStorage.setItem(AUDIT_KEY, JSON.stringify(audit));
    }
  });
};

const writeAudit = (previous: AdminLanguageConfig, next: AdminLanguageConfig, actor: string) => {
  if (!canUseStorage()) return;

  const prevSet = new Set(previous.enabledLanguages);
  const nextSet = new Set(next.enabledLanguages);

  const addedLanguages = next.enabledLanguages.filter((code) => !prevSet.has(code));
  const removedLanguages = previous.enabledLanguages.filter((code) => !nextSet.has(code));
  const defaultChanged = previous.defaultLanguage !== next.defaultLanguage;

  if (addedLanguages.length === 0 && removedLanguages.length === 0 && !defaultChanged) {
    return;
  }

  const event: AdminLanguageAuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    changedAt: new Date().toISOString(),
    actor,
    action: 'save',
    addedLanguages,
    removedLanguages,
    defaultLanguageFrom: previous.defaultLanguage,
    defaultLanguageTo: next.defaultLanguage,
  };

  const entries = [event, ...readAudit()].slice(0, MAX_AUDIT_ENTRIES);
  window.localStorage.setItem(AUDIT_KEY, JSON.stringify(entries));
};

export const getAdminLanguageConfig = (): AdminLanguageConfig => {
  if (!canUseStorage()) return defaultConfig();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      hydrateLanguageFromServer();
      return defaultConfig();
    }
    const parsed = JSON.parse(raw);
    return normalizeConfig(parsed);
  } catch {
    hydrateLanguageFromServer();
    return defaultConfig();
  }
};

export const getAdminLanguageAudit = (): AdminLanguageAuditEntry[] => {
  const audit = readAudit();
  if (audit.length === 0) {
    hydrateLanguageFromServer();
  }
  return audit;
};

export const saveAdminLanguageConfig = (config: AdminLanguageConfig, actor = 'admin'): AdminLanguageConfig => {
  const previous = getAdminLanguageConfig();
  const normalized: AdminLanguageConfig = {
    ...normalizeConfig(config),
    updatedAt: new Date().toISOString(),
  };

  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    writeAudit(previous, normalized, actor);
    syncCommerceStateToServer({
      languageConfig: normalized,
      languageAudit: readAudit(),
    });
  }

  return normalized;
};
