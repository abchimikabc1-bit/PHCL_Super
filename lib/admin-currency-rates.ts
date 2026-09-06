import {
  hydrateCommerceStateFromServer,
} from '@/lib/commerce-sync';

import {
  CURRENCY_RATES,
  PI_GCV_USD,
  USD_TO_TZS,
} from '@/lib/currencies';

export interface ManagedCurrency {
  code: string;

  enabled: boolean;

  /**
   * Legacy field name retained for UI compatibility.
   *
   * IMPORTANT:
   * This value represents:
   *
   *   currency units per 1 USD
   *
   * Examples:
   * USD  = 1
   * TZS  = 2640
   * NTZS = 2640
   * PI   = 1 / PI_GCV_USD
   *
   * Do not treat this field name literally as
   * "currency -> USD".
   */
  rateToUsd: number;

  type:
    | 'fiat'
    | 'crypto';
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

const STORAGE_KEY =
  'phcl_admin_currency_config';

const AUDIT_KEY =
  'phcl_admin_currency_config_audit';

const CORE_CODES = [
  'USD',
  'TZS',
  'NTZS',
  'PI',
  'BTC',
  'ETH',
  'USDT',
] as const;

const REQUIRED_FINANCIAL_CODES = [
  'USD',
  'TZS',
  'NTZS',
  'PI',
] as const;

const MAX_AUDIT_ENTRIES = 120;

const MAX_MANAGED_CURRENCIES = 40;

const MAX_CURRENCY_CODE_LENGTH = 10;

let attemptedCurrencyHydration =
  false;

type CoreCurrencyCode =
  (typeof CORE_CODES)[number];

const inferCurrencyType = (
  code: string,
): ManagedCurrency['type'] => {
  const upper =
    code
      .trim()
      .toUpperCase();

  if (
    upper === 'USD' ||
    upper === 'TZS'
  ) {
    return 'fiat';
  }

  return 'crypto';
};

const canUseStorage = () =>
  typeof window !== 'undefined' &&
  !!window.localStorage;

const normalizePositiveRate = (
  value: unknown,
): number | null => {
  const rate =
    typeof value === 'number'
      ? value
      : Number(value);

  if (
    !Number.isFinite(rate) ||
    rate <= 0
  ) {
    return null;
  }

  return Number(
    rate.toFixed(8),
  );
};

const getDefaultRate = (
  code: string,
): number => {
  const upper =
    code
      .trim()
      .toUpperCase();

  if (upper === 'USD') {
    return 1;
  }

  if (
    upper === 'TZS' ||
    upper === 'NTZS'
  ) {
    return Number(
      USD_TO_TZS.toFixed(8),
    );
  }

  if (upper === 'PI') {
    return Number(
      (
        1 /
        PI_GCV_USD
      ).toFixed(8),
    );
  }

  const configured =
    CURRENCY_RATES[
      upper as keyof typeof CURRENCY_RATES
    ];

  const normalized =
    normalizePositiveRate(
      configured,
    );

  return normalized ?? 1;
};

const defaultManagedCurrency = (
  code: CoreCurrencyCode,
): ManagedCurrency => ({
  code,

  enabled:
    REQUIRED_FINANCIAL_CODES.includes(
      code as
        (typeof REQUIRED_FINANCIAL_CODES)[number],
    ),

  rateToUsd:
    getDefaultRate(
      code,
    ),

  type:
    inferCurrencyType(
      code,
    ),
});

const defaultConfig =
  (): AdminCurrencyConfig => ({
    managed:
      CORE_CODES.map(
        defaultManagedCurrency,
      ),

    updatedAt:
      new Date(
        0,
      ).toISOString(),
  });

const normalizeIsoDate = (
  value: unknown,
): string => {
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
};

const normalizeCurrencyCode = (
  value: unknown,
): string | null => {
  if (
    typeof value !== 'string'
  ) {
    return null;
  }

  const code =
    value
      .trim()
      .toUpperCase()
      .slice(
        0,
        MAX_CURRENCY_CODE_LENGTH,
      );

  if (
    !/^[A-Z0-9]{2,10}$/.test(
      code,
    )
  ) {
    return null;
  }

  return code;
};

const normalizeManaged = (
  raw: unknown,
): ManagedCurrency | null => {
  if (
    !raw ||
    typeof raw !== 'object' ||
    Array.isArray(raw)
  ) {
    return null;
  }

  const row =
    raw as {
      code?: unknown;
      enabled?: unknown;
      rateToUsd?: unknown;
      type?: unknown;
    };

  const code =
    normalizeCurrencyCode(
      row.code,
    );

  if (!code) {
    return null;
  }

  const rate =
    normalizePositiveRate(
      row.rateToUsd,
    );

  if (rate === null) {
    return null;
  }

  return {
    code,

    enabled:
      typeof row.enabled ===
        'boolean'
        ? row.enabled
        : false,

    rateToUsd:
      rate,

    type:
      inferCurrencyType(
        code,
      ),
  };
};

const enforceFinancialPolicy = (
  input: ManagedCurrency[],
): ManagedCurrency[] => {
  const byCode =
    new Map<
      string,
      ManagedCurrency
    >();

  for (const entry of input) {
    if (
      byCode.has(
        entry.code,
      )
    ) {
      continue;
    }

    byCode.set(
      entry.code,
      {
        ...entry,

        type:
          inferCurrencyType(
            entry.code,
          ),
      },
    );
  }

  for (
    const code of
    CORE_CODES
  ) {
    if (
      !byCode.has(code)
    ) {
      byCode.set(
        code,
        defaultManagedCurrency(
          code,
        ),
      );
    }
  }

  const usd =
    byCode.get(
      'USD',
    )!;

  byCode.set(
    'USD',
    {
      ...usd,

      rateToUsd: 1,

      type: 'fiat',
    },
  );

  const tzs =
    byCode.get(
      'TZS',
    )!;

  const safeTzsRate =
    normalizePositiveRate(
      tzs.rateToUsd,
    ) ??
    USD_TO_TZS;

  byCode.set(
    'TZS',
    {
      ...tzs,

      rateToUsd:
        safeTzsRate,

      type: 'fiat',
    },
  );

  const ntzs =
    byCode.get(
      'NTZS',
    )!;

  /**
   * PHCL financial policy:
   *
   * 1 TZS = 1 nTZS
   *
   * Therefore both assets must
   * carry the same units-per-USD
   * conversion value.
   */
  byCode.set(
    'NTZS',
    {
      ...ntzs,

      rateToUsd:
        safeTzsRate,

      type: 'crypto',
    },
  );

  const pi =
    byCode.get(
      'PI',
    )!;

  const safePiRate =
    normalizePositiveRate(
      pi.rateToUsd,
    ) ??
    getDefaultRate(
      'PI',
    );

  byCode.set(
    'PI',
    {
      ...pi,

      rateToUsd:
        safePiRate,

      type: 'crypto',
    },
  );

  const ordered:
    ManagedCurrency[] = [];

  for (
    const code of
    CORE_CODES
  ) {
    const entry =
      byCode.get(
        code,
      );

    if (entry) {
      ordered.push(
        entry,
      );

      byCode.delete(
        code,
      );
    }
  }

  for (
    const entry of
    byCode.values()
  ) {
    if (
      ordered.length >=
      MAX_MANAGED_CURRENCIES
    ) {
      break;
    }

    ordered.push(
      entry,
    );
  }

  return ordered.slice(
    0,
    MAX_MANAGED_CURRENCIES,
  );
};

const normalizeConfig = (
  raw: unknown,
): AdminCurrencyConfig => {
  if (
    !raw ||
    typeof raw !== 'object' ||
    Array.isArray(raw)
  ) {
    return defaultConfig();
  }

  const row =
    raw as {
      managed?: unknown;
      updatedAt?: unknown;
    };

  if (
    !Array.isArray(
      row.managed,
    )
  ) {
    return defaultConfig();
  }

  const normalized =
    row.managed
      .map(
        (entry) =>
          normalizeManaged(
            entry,
          ),
      )
      .filter(
        (
          entry,
        ): entry is ManagedCurrency =>
          !!entry,
      );

  if (
    normalized.length ===
    0
  ) {
    return defaultConfig();
  }

  return {
    managed:
      enforceFinancialPolicy(
        normalized,
      ),

    updatedAt:
      normalizeIsoDate(
        row.updatedAt,
      ),
  };
};

export const sanitizeAdminCurrencyConfig =
  (
    raw: unknown,
  ): AdminCurrencyConfig | null => {
    if (
      !raw ||
      typeof raw !== 'object' ||
      Array.isArray(raw)
    ) {
      return null;
    }

    return normalizeConfig(
      raw,
    );
  };

const normalizeStringArray = (
  value: unknown,
): string[] => {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .filter(
      (
        entry,
      ): entry is string =>
        typeof entry ===
        'string',
    )
    .map(
      (entry) =>
        entry
          .trim()
          .toUpperCase()
          .slice(
            0,
            MAX_CURRENCY_CODE_LENGTH,
          ),
    )
    .filter(Boolean)
    .slice(
      0,
      MAX_MANAGED_CURRENCIES,
    );
};

const normalizeAuditEntry = (
  raw: unknown,
): AdminCurrencyAuditEntry | null => {
  if (
    !raw ||
    typeof raw !== 'object' ||
    Array.isArray(raw)
  ) {
    return null;
  }

  const row =
    raw as Partial<
      AdminCurrencyAuditEntry
    >;

  if (
    typeof row.id !==
      'string' ||
    row.id.length ===
      0 ||
    typeof row.changedAt !==
      'string' ||
    !Number.isFinite(
      Date.parse(
        row.changedAt,
      ),
    ) ||
    typeof row.actor !==
      'string' ||
    row.action !==
      'save' ||
    typeof row.activeBefore !==
      'number' ||
    !Number.isFinite(
      row.activeBefore,
    ) ||
    typeof row.activeAfter !==
      'number' ||
    !Number.isFinite(
      row.activeAfter,
    )
  ) {
    return null;
  }

  return {
    id:
      row.id.slice(
        0,
        180,
      ),

    changedAt:
      row.changedAt,

    actor:
      row.actor
        .trim()
        .slice(
          0,
          180,
        ),

    action:
      'save',

    changedCodes:
      normalizeStringArray(
        row.changedCodes,
      ),

    rateChangedCodes:
      normalizeStringArray(
        row.rateChangedCodes,
      ),

    statusChangedCodes:
      normalizeStringArray(
        row.statusChangedCodes,
      ),

    activeBefore:
      Math.max(
        0,
        Math.floor(
          row.activeBefore,
        ),
      ),

    activeAfter:
      Math.max(
        0,
        Math.floor(
          row.activeAfter,
        ),
      ),
  };
};

const readAudit =
  (): AdminCurrencyAuditEntry[] => {
    if (
      !canUseStorage()
    ) {
      return [];
    }

    try {
      const raw =
        window.localStorage.getItem(
          AUDIT_KEY,
        );

      if (!raw) {
        return [];
      }

      return sanitizeAdminCurrencyAudit(
        JSON.parse(raw),
      );
    } catch {
      return [];
    }
  };

export const sanitizeAdminCurrencyAudit =
  (
    raw: unknown,
  ): AdminCurrencyAuditEntry[] => {
    if (
      !Array.isArray(raw)
    ) {
      return [];
    }

    return raw
      .map(
        (entry) =>
          normalizeAuditEntry(
            entry,
          ),
      )
      .filter(
        (
          entry,
        ): entry is AdminCurrencyAuditEntry =>
          !!entry,
      )
      .slice(
        0,
        MAX_AUDIT_ENTRIES,
      );
  };

const writeAudit = (
  previous: AdminCurrencyConfig,

  next: AdminCurrencyConfig,

  actor: string,
): void => {
  if (
    !canUseStorage()
  ) {
    return;
  }

  const prevMap =
    new Map(
      previous.managed.map(
        (entry) => [
          entry.code,
          entry,
        ],
      ),
    );

  const nextMap =
    new Map(
      next.managed.map(
        (entry) => [
          entry.code,
          entry,
        ],
      ),
    );

  const allCodes =
    Array.from(
      new Set([
        ...prevMap.keys(),
        ...nextMap.keys(),
      ]),
    );

  const changedCodes:
    string[] = [];

  const rateChangedCodes:
    string[] = [];

  const statusChangedCodes:
    string[] = [];

  for (
    const code of
    allCodes
  ) {
    const before =
      prevMap.get(code);

    const after =
      nextMap.get(code);

    if (
      !before ||
      !after
    ) {
      changedCodes.push(
        code,
      );

      continue;
    }

    if (
      before.rateToUsd !==
      after.rateToUsd
    ) {
      changedCodes.push(
        code,
      );

      rateChangedCodes.push(
        code,
      );
    }

    if (
      before.enabled !==
      after.enabled
    ) {
      if (
        !changedCodes.includes(
          code,
        )
      ) {
        changedCodes.push(
          code,
        );
      }

      statusChangedCodes.push(
        code,
      );
    }
  }

  if (
    changedCodes.length ===
    0
  ) {
    return;
  }

  const safeActor =
    actor
      .trim()
      .slice(
        0,
        180,
      ) || 'admin';

  const event:
    AdminCurrencyAuditEntry = {
    id:
      typeof crypto !==
        'undefined' &&
      typeof crypto.randomUUID ===
        'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 10)}`,

    changedAt:
      new Date().toISOString(),

    actor:
      safeActor,

    action:
      'save',

    changedCodes,

    rateChangedCodes,

    statusChangedCodes,

    activeBefore:
      previous.managed.filter(
        (entry) =>
          entry.enabled,
      ).length,

    activeAfter:
      next.managed.filter(
        (entry) =>
          entry.enabled,
      ).length,
  };

  const entries =
    [
      event,
      ...readAudit(),
    ].slice(
      0,
      MAX_AUDIT_ENTRIES,
    );

  window.localStorage.setItem(
    AUDIT_KEY,
    JSON.stringify(
      entries,
    ),
  );
};

const hydrateCurrencyFromServer =
  (): void => {
    if (
      attemptedCurrencyHydration ||
      !canUseStorage()
    ) {
      return;
    }

    attemptedCurrencyHydration =
      true;

    void hydrateCommerceStateFromServer()
      .then(
        (snapshot) => {
          if (
            !snapshot
          ) {
            return;
          }

          const config =
            sanitizeAdminCurrencyConfig(
              snapshot.currencyConfig,
            );

          const audit =
            sanitizeAdminCurrencyAudit(
              snapshot.currencyAudit,
            );

          if (config) {
            window.localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(
                config,
              ),
            );
          }

          if (
            audit.length >
            0
          ) {
            window.localStorage.setItem(
              AUDIT_KEY,
              JSON.stringify(
                audit,
              ),
            );
          }
        },
      )
      .catch(() => {
        /**
         * UI hydration failure must not
         * become financial authority.
         *
         * The UI can continue using
         * canonical display defaults.
         */
      });
  };

export const getAdminCurrencyConfig =
  (): AdminCurrencyConfig => {
    if (
      !canUseStorage()
    ) {
      return defaultConfig();
    }

    try {
      const raw =
        window.localStorage.getItem(
          STORAGE_KEY,
        );

      if (!raw) {
        hydrateCurrencyFromServer();

        return defaultConfig();
      }

      return normalizeConfig(
        JSON.parse(raw),
      );
    } catch {
      hydrateCurrencyFromServer();

      return defaultConfig();
    }
  };

export const getAdminCurrencyAudit =
  (): AdminCurrencyAuditEntry[] => {
    const audit =
      readAudit();

    if (
      audit.length ===
      0
    ) {
      hydrateCurrencyFromServer();
    }

    return audit;
  };

/**
 * Converts the legacy admin UI currency
 * representation into the explicit
 * values required by the secure
 * server financial rate authority.
 */
export const extractFinancialRatesFromAdminConfig =
  (
    config: AdminCurrencyConfig,
  ): {
    usdToTzs: number;
    piGcvUsd: number;
  } => {
    const normalized =
      normalizeConfig(
        config,
      );

    const tzs =
      normalized.managed.find(
        (entry) =>
          entry.code ===
          'TZS',
      );

    const pi =
      normalized.managed.find(
        (entry) =>
          entry.code ===
          'PI',
      );

    const usdToTzs =
      normalizePositiveRate(
        tzs?.rateToUsd,
      ) ??
      USD_TO_TZS;

    const piUnitsPerUsd =
      normalizePositiveRate(
        pi?.rateToUsd,
      ) ??
      getDefaultRate(
        'PI',
      );

    const piGcvUsd =
      1 /
      piUnitsPerUsd;

    if (
      !Number.isFinite(
        piGcvUsd,
      ) ||
      piGcvUsd <= 0
    ) {
      throw new Error(
        'Invalid PI GCV reference configuration.',
      );
    }

    return {
      usdToTzs,

      piGcvUsd,
    };
  };

/**
 * Client-side helper only.
 *
 * This updates browser UI cache immediately.
 * The authenticated Admin API remains the
 * server authority for persistence.
 */
export const saveAdminCurrencyConfig =
  (
    config: AdminCurrencyConfig,

    actor = 'admin',
  ): AdminCurrencyConfig => {
    const previous =
      getAdminCurrencyConfig();

    const normalized = {
      ...normalizeConfig(
        config,
      ),

      updatedAt:
        new Date().toISOString(),
    };

    if (
      canUseStorage()
    ) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          normalized,
        ),
      );

      writeAudit(
        previous,
        normalized,
        actor,
      );
    }

    return normalized;
  };