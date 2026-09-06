import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';

import {
  sanitizeAdminCurrencyAudit,
  sanitizeAdminCurrencyConfig,
  type AdminCurrencyAuditEntry,
  type AdminCurrencyConfig,
} from '@/lib/admin-currency-rates';

import {
  sanitizeAdminLanguageAudit,
  sanitizeAdminLanguageConfig,
  type AdminLanguageAuditEntry,
  type AdminLanguageConfig,
} from '@/lib/admin-language-settings';

import {
  sanitizeAdminSettings,
  sanitizeAdminSettingsAudit,
  type AdminSettingsAuditEntry,
  type AdminSystemSettings,
} from '@/lib/admin-settings';

import { adminDb } from '@/lib/firebase-admin';

const ADMIN_CONFIG_COLLECTION = 'admin_config';
const ADMIN_CONFIG_DOCUMENT = 'state';

const MAX_AUDIT_ENTRIES = 120;

export interface ServerAdminConfigState {
  revision: number;
  updatedAt: string;

  adminSettings: AdminSystemSettings | null;
  adminSettingsAudit: AdminSettingsAuditEntry[];

  currencyConfig: AdminCurrencyConfig | null;
  currencyAudit: AdminCurrencyAuditEntry[];

  languageConfig: AdminLanguageConfig | null;
  languageAudit: AdminLanguageAuditEntry[];
}

export interface ServerAdminConfigUpdate {
  adminSettings?: AdminSystemSettings | null;
  adminSettingsAudit?: AdminSettingsAuditEntry[];

  currencyConfig?: AdminCurrencyConfig | null;
  currencyAudit?: AdminCurrencyAuditEntry[];

  languageConfig?: AdminLanguageConfig | null;
  languageAudit?: AdminLanguageAuditEntry[];
}

export type ServerAdminConfigUpdateResult =
  | {
      ok: true;
      state: ServerAdminConfigState;
    }
  | {
      ok: false;
      reason: 'REVISION_CONFLICT';
      state: ServerAdminConfigState;
    };

const configDocument = adminDb
  .collection(ADMIN_CONFIG_COLLECTION)
  .doc(ADMIN_CONFIG_DOCUMENT);

const normalizeRevision = (value: unknown): number => {
  const numeric = Number(value);

  if (
    !Number.isSafeInteger(numeric) ||
    numeric < 0
  ) {
    return 0;
  }

  return numeric;
};

const normalizeTimestamp = (
  value: unknown,
): string => {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === 'function'
  ) {
    try {
      return (
        value as {
          toDate: () => Date;
        }
      )
        .toDate()
        .toISOString();
    } catch {
      // Fall through.
    }
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date(0).toISOString();
};

const normalizeState = (
  raw: unknown,
): ServerAdminConfigState => {
  const source =
    raw &&
    typeof raw === 'object' &&
    !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  return {
    revision: normalizeRevision(
      source.revision,
    ),

    updatedAt: normalizeTimestamp(
      source.updatedAt,
    ),

    adminSettings:
      sanitizeAdminSettings(
        source.adminSettings,
      ),

    adminSettingsAudit:
      sanitizeAdminSettingsAudit(
        source.adminSettingsAudit,
      ).slice(
        0,
        MAX_AUDIT_ENTRIES,
      ),

    currencyConfig:
      sanitizeAdminCurrencyConfig(
        source.currencyConfig,
      ),

    currencyAudit:
      sanitizeAdminCurrencyAudit(
        source.currencyAudit,
      ).slice(
        0,
        MAX_AUDIT_ENTRIES,
      ),

    languageConfig:
      sanitizeAdminLanguageConfig(
        source.languageConfig,
      ),

    languageAudit:
      sanitizeAdminLanguageAudit(
        source.languageAudit,
      ).slice(
        0,
        MAX_AUDIT_ENTRIES,
      ),
  };
};

const createEmptyState =
  (): ServerAdminConfigState => ({
    revision: 0,
    updatedAt: new Date(0).toISOString(),

    adminSettings: null,
    adminSettingsAudit: [],

    currencyConfig: null,
    currencyAudit: [],

    languageConfig: null,
    languageAudit: [],
  });

export async function getServerAdminConfigState():
  Promise<ServerAdminConfigState> {
  const snapshot =
    await configDocument.get();

  if (!snapshot.exists) {
    return createEmptyState();
  }

  return normalizeState(snapshot.data());
}

export async function updateServerAdminConfigState(
  update: ServerAdminConfigUpdate,
  expectedRevision?: number,
): Promise<ServerAdminConfigUpdateResult> {
  return adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          configDocument,
        );

      const current = snapshot.exists
        ? normalizeState(snapshot.data())
        : createEmptyState();

      if (
        expectedRevision !== undefined &&
        expectedRevision !==
          current.revision
      ) {
        return {
          ok: false as const,
          reason:
            'REVISION_CONFLICT' as const,
          state: current,
        };
      }

      const nextAdminSettings =
        update.adminSettings !==
        undefined
          ? sanitizeAdminSettings(
              update.adminSettings,
            )
          : current.adminSettings;

      const nextAdminSettingsAudit =
        update.adminSettingsAudit !==
        undefined
          ? sanitizeAdminSettingsAudit(
              update.adminSettingsAudit,
            ).slice(
              0,
              MAX_AUDIT_ENTRIES,
            )
          : current.adminSettingsAudit;

      const nextCurrencyConfig =
        update.currencyConfig !== undefined
          ? sanitizeAdminCurrencyConfig(
              update.currencyConfig,
            )
          : current.currencyConfig;

      const nextCurrencyAudit =
        update.currencyAudit !== undefined
          ? sanitizeAdminCurrencyAudit(
              update.currencyAudit,
            ).slice(
              0,
              MAX_AUDIT_ENTRIES,
            )
          : current.currencyAudit;

      const nextLanguageConfig =
        update.languageConfig !== undefined
          ? sanitizeAdminLanguageConfig(
              update.languageConfig,
            )
          : current.languageConfig;

      const nextLanguageAudit =
        update.languageAudit !== undefined
          ? sanitizeAdminLanguageAudit(
              update.languageAudit,
            ).slice(
              0,
              MAX_AUDIT_ENTRIES,
            )
          : current.languageAudit;

      const nextRevision =
        current.revision + 1;

      transaction.set(
        configDocument,
        {
          revision: nextRevision,

          updatedAt:
            FieldValue.serverTimestamp(),

          adminSettings:
            nextAdminSettings,

          adminSettingsAudit:
            nextAdminSettingsAudit,

          currencyConfig:
            nextCurrencyConfig,

          currencyAudit:
            nextCurrencyAudit,

          languageConfig:
            nextLanguageConfig,

          languageAudit:
            nextLanguageAudit,
        },
        {
          merge: false,
        },
      );

      /*
       * Return an application-safe state.
       *
       * Firestore serverTimestamp() is resolved
       * only after transaction commit, therefore
       * the API-visible timestamp is generated
       * here while Firestore remains authoritative
       * for the persisted timestamp.
       */
      const nextState: ServerAdminConfigState =
        {
          revision: nextRevision,

          updatedAt:
            new Date().toISOString(),

          adminSettings:
            nextAdminSettings,

          adminSettingsAudit:
            nextAdminSettingsAudit,

          currencyConfig:
            nextCurrencyConfig,

          currencyAudit:
            nextCurrencyAudit,

          languageConfig:
            nextLanguageConfig,

          languageAudit:
            nextLanguageAudit,
        };

      return {
        ok: true as const,
        state: nextState,
      };
    },
  );
}