import 'server-only';

import {
  FieldValue,
} from 'firebase-admin/firestore';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  getServerCurrencyRates,
  type FinancialRateSource,
  type ServerCurrencyRates,
} from '@/lib/server-currency-rates';

const CONFIG_COLLECTION =
  'financial_config';

const CONFIG_DOCUMENT =
  'currency_rates';

const AUDIT_COLLECTION =
  'financial_currency_rate_audit';

const MAX_ACTOR_LENGTH = 180;

export interface ServerCurrencyRateState {
  rateVersion: number;

  rates: ServerCurrencyRates;

  updatedAt: string;

  updatedBy: string;
}

export interface ServerCurrencyRateAuditEntry {
  id: string;

  rateVersion: number;

  changedAt: string;

  actor: string;

  previous: ServerCurrencyRates;

  next: ServerCurrencyRates;

  changedFields: Array<
    | 'usdToTzs'
    | 'piGcvUsd'
  >;
}

export interface ServerCurrencyRateUpdate {
  usdToTzs?: number;

  piGcvUsd?: number;

  sources?: {
    usdToTzs?: FinancialRateSource;

    piGcvUsd?: FinancialRateSource;
  };
}

function getConfigRef() {
  return adminDb
    .collection(CONFIG_COLLECTION)
    .doc(CONFIG_DOCUMENT);
}

function normalizeActor(
  actor: string,
): string {
  const normalized =
    actor
      .trim()
      .toLowerCase()
      .slice(
        0,
        MAX_ACTOR_LENGTH,
      );

  return normalized || 'system';
}

function isPlainObject(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isPositiveFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

function normalizeRateSource(
  value: unknown,
  fallback: FinancialRateSource,
): FinancialRateSource {
  switch (value) {
    case 'system_fallback':
    case 'admin_config':
    case 'market':
    case 'provider':
    case 'gcv_reference':
      return value;

    default:
      return fallback;
  }
}

function createCanonicalRates(
  value?: unknown,
): ServerCurrencyRates {
  const defaults =
    getServerCurrencyRates();

  if (!isPlainObject(value)) {
    return defaults;
  }

  const sources =
    isPlainObject(
      value.sources,
    )
      ? value.sources
      : {};

  const usdToTzs =
    isPositiveFiniteNumber(
      value.usdToTzs,
    )
      ? value.usdToTzs
      : defaults.usdToTzs;

  const piGcvUsd =
    isPositiveFiniteNumber(
      value.piGcvUsd,
    )
      ? value.piGcvUsd
      : defaults.piGcvUsd;

  return {
    baseCurrency: 'USD',

    usdToTzs,

    /**
     * PHCL rule:
     * 1 TZS = 1 nTZS
     *
     * This is intentionally fixed here.
     * It cannot be changed from a client
     * or admin payload accidentally.
     */
    tzsToNtzs: 1,

    piGcvUsd,

    sources: {
      usdToTzs:
        normalizeRateSource(
          sources.usdToTzs,
          defaults.sources
            .usdToTzs,
        ),

      tzsToNtzs:
        'system_fallback',

      piGcvUsd:
        normalizeRateSource(
          sources.piGcvUsd,
          defaults.sources
            .piGcvUsd,
        ),
    },
  };
}

function normalizeVersion(
  value: unknown,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(
      value,
    ) ||
    value < 1
  ) {
    return 1;
  }

  return value;
}

function normalizeIsoDate(
  value: unknown,
): string {
  if (
    typeof value === 'string' &&
    Number.isFinite(
      Date.parse(value),
    )
  ) {
    return value;
  }

  return new Date(
    0,
  ).toISOString();
}

function createDefaultState():
ServerCurrencyRateState {
  return {
    rateVersion: 1,

    rates:
      getServerCurrencyRates(),

    updatedAt:
      new Date(
        0,
      ).toISOString(),

    updatedBy:
      'system',
  };
}

function normalizeState(
  value: unknown,
): ServerCurrencyRateState {
  if (!isPlainObject(value)) {
    return createDefaultState();
  }

  return {
    rateVersion:
      normalizeVersion(
        value.rateVersion,
      ),

    rates:
      createCanonicalRates(
        value.rates,
      ),

    updatedAt:
      normalizeIsoDate(
        value.updatedAt,
      ),

    updatedBy:
      typeof value.updatedBy ===
        'string'
        ? normalizeActor(
            value.updatedBy,
          )
        : 'system',
  };
}

function normalizeUpdate(
  update: unknown,
): ServerCurrencyRateUpdate {
  if (!isPlainObject(update)) {
    throw new Error(
      'Invalid currency rate update.',
    );
  }

  const result:
    ServerCurrencyRateUpdate =
      {};

  if (
    Object.prototype
      .hasOwnProperty.call(
        update,
        'usdToTzs',
      )
  ) {
    if (
      !isPositiveFiniteNumber(
        update.usdToTzs,
      )
    ) {
      throw new Error(
        'USD/TZS rate must be a positive finite number.',
      );
    }

    result.usdToTzs =
      update.usdToTzs;
  }

  if (
    Object.prototype
      .hasOwnProperty.call(
        update,
        'piGcvUsd',
      )
  ) {
    if (
      !isPositiveFiniteNumber(
        update.piGcvUsd,
      )
    ) {
      throw new Error(
        'PI GCV/USD reference must be a positive finite number.',
      );
    }

    result.piGcvUsd =
      update.piGcvUsd;
  }

  if (
    Object.prototype
      .hasOwnProperty.call(
        update,
        'sources',
      )
  ) {
    if (
      !isPlainObject(
        update.sources,
      )
    ) {
      throw new Error(
        'Invalid currency rate source configuration.',
      );
    }

    const sources:
      NonNullable<
        ServerCurrencyRateUpdate[
          'sources'
        ]
      > = {};

    if (
      Object.prototype
        .hasOwnProperty.call(
          update.sources,
          'usdToTzs',
        )
    ) {
      sources.usdToTzs =
        normalizeRateSource(
          update.sources
            .usdToTzs,
          'admin_config',
        );
    }

    if (
      Object.prototype
        .hasOwnProperty.call(
          update.sources,
          'piGcvUsd',
        )
    ) {
      sources.piGcvUsd =
        normalizeRateSource(
          update.sources
            .piGcvUsd,
          'gcv_reference',
        );
    }

    result.sources =
      sources;
  }

  const hasRateChange =
    result.usdToTzs !==
      undefined ||
    result.piGcvUsd !==
      undefined;

  if (!hasRateChange) {
    throw new Error(
      'At least one supported currency rate must be supplied.',
    );
  }

  return result;
}

function getChangedFields(
  previous: ServerCurrencyRates,
  next: ServerCurrencyRates,
): ServerCurrencyRateAuditEntry[
  'changedFields'
] {
  const changed:
    ServerCurrencyRateAuditEntry[
      'changedFields'
    ] = [];

  if (
    previous.usdToTzs !==
    next.usdToTzs
  ) {
    changed.push(
      'usdToTzs',
    );
  }

  if (
    previous.piGcvUsd !==
    next.piGcvUsd
  ) {
    changed.push(
      'piGcvUsd',
    );
  }

  return changed;
}

export async function getServerCurrencyRateState():
Promise<ServerCurrencyRateState> {
  const snapshot =
    await getConfigRef().get();

  if (!snapshot.exists) {
    return createDefaultState();
  }

  return normalizeState(
    snapshot.data(),
  );
}

export async function getAuthoritativeServerCurrencyRates():
Promise<ServerCurrencyRates> {
  const state =
    await getServerCurrencyRateState();

  return state.rates;
}

export async function updateServerCurrencyRates(
  update:
    ServerCurrencyRateUpdate,

  actor: string,
): Promise<ServerCurrencyRateState> {
  const safeUpdate =
    normalizeUpdate(
      update,
    );

  const safeActor =
    normalizeActor(
      actor,
    );

  const configRef =
    getConfigRef();

  const auditRef =
    adminDb
      .collection(
        AUDIT_COLLECTION,
      )
      .doc();

  return adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          configRef,
        );

      const current =
        snapshot.exists
          ? normalizeState(
              snapshot.data(),
            )
          : createDefaultState();

      const nextRates:
        ServerCurrencyRates = {
        ...current.rates,

        ...(safeUpdate.usdToTzs !==
        undefined
          ? {
              usdToTzs:
                safeUpdate.usdToTzs,
            }
          : {}),

        ...(safeUpdate.piGcvUsd !==
        undefined
          ? {
              piGcvUsd:
                safeUpdate.piGcvUsd,
            }
          : {}),

        /**
         * Never allow the configured
         * TZS/nTZS parity to drift.
         */
        tzsToNtzs: 1,

        sources: {
          ...current.rates.sources,

          ...(safeUpdate
            .sources
            ?.usdToTzs
          ? {
              usdToTzs:
                safeUpdate
                  .sources
                  .usdToTzs,
            }
          : safeUpdate.usdToTzs !==
            undefined
            ? {
                usdToTzs:
                  'admin_config' as const,
              }
            : {}),

          tzsToNtzs:
            'system_fallback',

          ...(safeUpdate
            .sources
            ?.piGcvUsd
          ? {
              piGcvUsd:
                safeUpdate
                  .sources
                  .piGcvUsd,
            }
          : safeUpdate.piGcvUsd !==
            undefined
            ? {
                piGcvUsd:
                  'gcv_reference' as const,
              }
            : {}),
        },
      };

      const changedFields =
        getChangedFields(
          current.rates,
          nextRates,
        );

      /**
       * If values are identical,
       * return the current state
       * without creating a fake
       * rate version or audit row.
       */
      if (
        changedFields.length ===
        0
      ) {
        return current;
      }

      const nextVersion =
        current.rateVersion + 1;

      if (
        !Number.isSafeInteger(
          nextVersion,
        )
      ) {
        throw new Error(
          'Currency rate version overflow.',
        );
      }

      const now =
        new Date().toISOString();

      const nextState:
        ServerCurrencyRateState = {
        rateVersion:
          nextVersion,

        rates:
          nextRates,

        updatedAt:
          now,

        updatedBy:
          safeActor,
      };

      const auditEntry:
        ServerCurrencyRateAuditEntry =
        {
          id:
            auditRef.id,

          rateVersion:
            nextVersion,

          changedAt:
            now,

          actor:
            safeActor,

          previous:
            current.rates,

          next:
            nextRates,

          changedFields,
        };

      transaction.set(
        configRef,
        {
          ...nextState,

          serverUpdatedAt:
            FieldValue.serverTimestamp(),
        },
        {
          merge: false,
        },
      );

      transaction.set(
        auditRef,
        {
          ...auditEntry,

          serverCreatedAt:
            FieldValue.serverTimestamp(),
        },
      );

      return nextState;
    },
  );
}