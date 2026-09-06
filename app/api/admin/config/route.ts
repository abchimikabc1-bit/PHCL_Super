import 'server-only';

import {
  NextRequest,
  NextResponse,
} from 'next/server';

import type {
  AdminCurrencyAuditEntry,
  AdminCurrencyConfig,
} from '@/lib/admin-currency-rates';

import {
  extractFinancialRatesFromAdminConfig,
  sanitizeAdminCurrencyAudit,
  sanitizeAdminCurrencyConfig,
} from '@/lib/admin-currency-rates';

import {
  verifyTrustedDeviceSession,
} from '@/lib/admin-device-auth-security';

import type {
  AdminLanguageAuditEntry,
  AdminLanguageConfig,
} from '@/lib/admin-language-settings';

import {
  sanitizeAdminLanguageAudit,
  sanitizeAdminLanguageConfig,
} from '@/lib/admin-language-settings';

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from '@/lib/admin-session-security';

import type {
  AdminSettingsAuditEntry,
  AdminSystemSettings,
} from '@/lib/admin-settings';

import {
  getDefaultAdminSettings,
  sanitizeAdminSettings,
  sanitizeAdminSettingsAudit,
} from '@/lib/admin-settings';

import {
  getServerAdminConfigState,
  updateServerAdminConfigState,
  type ServerAdminConfigState,
} from '@/lib/server-admin-config-store';

import {
  updateServerCurrencyRates,
} from '@/lib/server-currency-rate-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ConfigResource =
  | 'settings'
  | 'currencies'
  | 'languages';

type ConfigAction =
  | 'save'
  | 'reset';

type AdminConfigRequestBody = {
  resource?: ConfigResource;
  action?: ConfigAction;
  expectedRevision?: number;
  settings?: AdminSystemSettings;
  currencyConfig?: AdminCurrencyConfig;
  languageConfig?: AdminLanguageConfig;
};

const TRUSTED_DEVICE_COOKIE =
  'phcl_admin_trusted_device';

const MAX_AUDIT_ENTRIES = 120;

const MAX_REQUEST_BODY_BYTES =
  64 * 1024;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
} as const;

const createId = (): string =>
  `${Date.now()}-${crypto.randomUUID()}`;

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): NextResponse {
  return NextResponse.json(
    body,
    {
      status,
      headers: NO_STORE_HEADERS,
    },
  );
}

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

async function readRequestBody(
  request: NextRequest,
): Promise<
  | {
      ok: true;
      body: AdminConfigRequestBody;
    }
  | {
      ok: false;
      response: NextResponse;
    }
> {
  const contentLengthHeader =
    request.headers.get(
      'content-length',
    );

  if (contentLengthHeader) {
    const contentLength =
      Number(contentLengthHeader);

    if (
      !Number.isFinite(contentLength) ||
      contentLength < 0
    ) {
      return {
        ok: false,
        response: jsonResponse(
          {
            success: false,
            error:
              'Invalid request body.',
          },
          400,
        ),
      };
    }

    if (
      contentLength >
      MAX_REQUEST_BODY_BYTES
    ) {
      return {
        ok: false,
        response: jsonResponse(
          {
            success: false,
            error:
              'Request body is too large.',
          },
          413,
        ),
      };
    }
  }

  let rawBody: string;

  try {
    rawBody =
      await request.text();
  } catch {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error:
            'Invalid request body.',
        },
        400,
      ),
    };
  }

  const bodySize =
    new TextEncoder()
      .encode(rawBody)
      .byteLength;

  if (
    bodySize >
    MAX_REQUEST_BODY_BYTES
  ) {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error:
            'Request body is too large.',
        },
        413,
      ),
    };
  }

  if (!rawBody.trim()) {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error:
            'Invalid request body.',
        },
        400,
      ),
    };
  }

  let parsed: unknown;

  try {
    parsed =
      JSON.parse(rawBody);
  } catch {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error:
            'Invalid request body.',
        },
        400,
      ),
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error:
            'Invalid request body.',
        },
        400,
      ),
    };
  }

  return {
    ok: true,
    body:
      parsed as AdminConfigRequestBody,
  };
}

async function authenticateAdminRequest(
  request: NextRequest,
): Promise<
  | {
      ok: true;
      email: string;
    }
  | {
      ok: false;
      response: NextResponse;
    }
> {
  const adminSessionToken =
    request.cookies.get(
      ADMIN_SESSION_COOKIE,
    )?.value;

  const adminSession =
    verifyAdminSessionToken(
      adminSessionToken,
    );

  if (!adminSession) {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error: 'Unauthorized.',
        },
        401,
      ),
    };
  }

  const trustedSessionId =
    request.cookies.get(
      TRUSTED_DEVICE_COOKIE,
    )?.value;

  if (!trustedSessionId) {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error:
            'Trusted device verification required.',
        },
        403,
      ),
    };
  }

  const trustedDeviceValid =
    await verifyTrustedDeviceSession(
      adminSession.email,
      trustedSessionId,
    );

  if (!trustedDeviceValid) {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error:
            'Trusted device verification required.',
        },
        403,
      ),
    };
  }

  return {
    ok: true,
    email: adminSession.email,
  };
}

const createSettingsAudit = (
  previous: AdminSystemSettings,
  next: AdminSystemSettings,
  actor: string,
  action: ConfigAction,
): AdminSettingsAuditEntry | null => {
  const keys: Array<
    Exclude<
      keyof AdminSystemSettings,
      'updatedAt'
    >
  > = [
    'maintenanceMode',
    'allowPiPayments',
    'strictTamperBlocking',
    'maxOrdersRetention',
    'defaultDisplayCurrency',
  ];

  const changedKeys =
    keys.filter(
      (key) =>
        previous[key] !==
        next[key],
    );

  if (
    changedKeys.length === 0
  ) {
    return null;
  }

  return {
    id: createId(),

    changedAt:
      new Date().toISOString(),

    actor,

    action,

    changedKeys,

    from: {
      maintenanceMode:
        previous.maintenanceMode,

      allowPiPayments:
        previous.allowPiPayments,

      strictTamperBlocking:
        previous.strictTamperBlocking,

      maxOrdersRetention:
        previous.maxOrdersRetention,

      defaultDisplayCurrency:
        previous.defaultDisplayCurrency,
    },

    to: {
      maintenanceMode:
        next.maintenanceMode,

      allowPiPayments:
        next.allowPiPayments,

      strictTamperBlocking:
        next.strictTamperBlocking,

      maxOrdersRetention:
        next.maxOrdersRetention,

      defaultDisplayCurrency:
        next.defaultDisplayCurrency,
    },
  };
};

const createCurrencyAudit = (
  previous: AdminCurrencyConfig,
  next: AdminCurrencyConfig,
  actor: string,
): AdminCurrencyAuditEntry | null => {
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

  const changedCodes: string[] = [];
  const rateChangedCodes: string[] = [];
  const statusChangedCodes: string[] = [];

  for (
    const code of allCodes
  ) {
    const before =
      prevMap.get(code);

    const after =
      nextMap.get(code);

    if (
      !before ||
      !after
    ) {
      changedCodes.push(code);
      continue;
    }

    if (
      before.rateToUsd !==
      after.rateToUsd
    ) {
      changedCodes.push(code);
      rateChangedCodes.push(code);
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
        changedCodes.push(code);
      }

      statusChangedCodes.push(
        code,
      );
    }
  }

  if (
    changedCodes.length === 0
  ) {
    return null;
  }

  return {
    id: createId(),

    changedAt:
      new Date().toISOString(),

    actor,

    action: 'save',

    changedCodes,

    rateChangedCodes,

    statusChangedCodes,

    activeBefore:
      previous.managed.filter(
        (entry) => entry.enabled,
      ).length,

    activeAfter:
      next.managed.filter(
        (entry) => entry.enabled,
      ).length,
  };
};

const createLanguageAudit = (
  previous: AdminLanguageConfig,
  next: AdminLanguageConfig,
  actor: string,
): AdminLanguageAuditEntry | null => {
  const prevSet =
    new Set(
      previous.enabledLanguages,
    );

  const nextSet =
    new Set(
      next.enabledLanguages,
    );

  const addedLanguages =
    next.enabledLanguages.filter(
      (code) =>
        !prevSet.has(code),
    );

  const removedLanguages =
    previous.enabledLanguages.filter(
      (code) =>
        !nextSet.has(code),
    );

  const defaultChanged =
    previous.defaultLanguage !==
    next.defaultLanguage;

  if (
    addedLanguages.length === 0 &&
    removedLanguages.length === 0 &&
    !defaultChanged
  ) {
    return null;
  }

  return {
    id: createId(),

    changedAt:
      new Date().toISOString(),

    actor,

    action: 'save',

    addedLanguages,

    removedLanguages,

    defaultLanguageFrom:
      previous.defaultLanguage,

    defaultLanguageTo:
      next.defaultLanguage,
  };
};

function revisionConflictResponse(
  state: ServerAdminConfigState,
): NextResponse {
  return jsonResponse(
    {
      success: false,

      error:
        'Admin configuration revision conflict.',

      snapshot: state,
    },
    409,
  );
}

function validateExpectedRevision(
  value: unknown,
): boolean {
  return (
    value === undefined ||
    (
      Number.isSafeInteger(value) &&
      Number(value) >= 0
    )
  );
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const auth =
      await authenticateAdminRequest(
        request,
      );

    if (auth.ok === false) {
      return auth.response;
    }

    const requestBody =
      await readRequestBody(
        request,
      );

    if (
      requestBody.ok === false
    ) {
      return requestBody.response;
    }

    const body =
      requestBody.body;

    if (
      !body.resource ||
      ![
        'settings',
        'currencies',
        'languages',
      ].includes(
        body.resource,
      )
    ) {
      return jsonResponse(
        {
          success: false,

          error:
            'Unsupported config resource.',
        },
        400,
      );
    }

    if (
      !validateExpectedRevision(
        body.expectedRevision,
      )
    ) {
      return jsonResponse(
        {
          success: false,

          error:
            'Invalid expected revision.',
        },
        400,
      );
    }

    const current =
      await getServerAdminConfigState();

    if (
      body.expectedRevision !==
        undefined &&
      body.expectedRevision !==
        current.revision
    ) {
      return revisionConflictResponse(
        current,
      );
    }

    const actor =
      auth.email
        .trim()
        .toLowerCase()
        .slice(
          0,
          120,
        );

    /*
     * ========================================================
     * ADMIN SYSTEM SETTINGS
     * ========================================================
     */
    if (
      body.resource ===
      'settings'
    ) {
      const action: ConfigAction =
        body.action === 'reset'
          ? 'reset'
          : 'save';

      const previous =
        current.adminSettings ??
        getDefaultAdminSettings();

      const normalized =
        action === 'reset'
          ? {
              ...getDefaultAdminSettings(),

              updatedAt:
                new Date().toISOString(),
            }
          : {
              ...(
                sanitizeAdminSettings(
                  body.settings,
                ) ??
                previous
              ),

              updatedAt:
                new Date().toISOString(),
            };

      const auditEntry =
        createSettingsAudit(
          previous,
          normalized,
          actor,
          action,
        );

      const nextAudit =
        sanitizeAdminSettingsAudit(
          auditEntry
            ? [
                auditEntry,
                ...current.adminSettingsAudit,
              ]
            : current.adminSettingsAudit,
        ).slice(
          0,
          MAX_AUDIT_ENTRIES,
        );

      /*
       * Always use the revision that was actually read from
       * Firestore as the transaction precondition.
       *
       * This protects the configuration even when an older
       * Admin UI did not send expectedRevision.
       */
      const updateResult =
        await updateServerAdminConfigState(
          {
            adminSettings:
              normalized,

            adminSettingsAudit:
              nextAudit,
          },
          current.revision,
        );

      if (
        updateResult.ok === false
      ) {
        return revisionConflictResponse(
          updateResult.state,
        );
      }

      return jsonResponse({
        success: true,

        snapshot:
          updateResult.state,
      });
    }

    /*
     * ========================================================
     * ADMIN CURRENCY CONFIGURATION
     * ========================================================
     */
    if (
      body.resource ===
      'currencies'
    ) {
      if (
        body.action !==
          undefined &&
        body.action !==
          'save'
      ) {
        return jsonResponse(
          {
            success: false,

            error:
              'Unsupported currency action.',
          },
          400,
        );
      }

      const normalized =
        sanitizeAdminCurrencyConfig(
          body.currencyConfig,
        );

      if (!normalized) {
        return jsonResponse(
          {
            success: false,

            error:
              'Invalid currency configuration payload.',
          },
          400,
        );
      }

      const previous =
        current.currencyConfig ??
        normalized;

      const next: AdminCurrencyConfig =
        {
          ...normalized,

          updatedAt:
            new Date().toISOString(),
        };

      const auditEntry =
        createCurrencyAudit(
          previous,
          next,
          actor,
        );

      const nextAudit =
        sanitizeAdminCurrencyAudit(
          auditEntry
            ? [
                auditEntry,
                ...current.currencyAudit,
              ]
            : current.currencyAudit,
        ).slice(
          0,
          MAX_AUDIT_ENTRIES,
        );

      /*
       * ADMIN UI CONFIG AUTHORITY
       *
       * Store the Admin-facing currency configuration and its
       * audit trail in the dedicated Firestore Admin Config
       * document.
       *
       * This is intentionally separate from financial settlement
       * authority.
       */
      const updateResult =
        await updateServerAdminConfigState(
          {
            currencyConfig:
              next,

            currencyAudit:
              nextAudit,
          },
          current.revision,
        );

      if (
        updateResult.ok === false
      ) {
        return revisionConflictResponse(
          updateResult.state,
        );
      }

      /*
       * FINANCIAL RATE AUTHORITY
       *
       * Extract only values explicitly supported by the secure
       * financial core.
       *
       * Checkout, quote generation, exchanger, ledger and future
       * Web3 settlement must continue to consume the dedicated
       * server financial rate store — never this Admin UI config
       * document directly.
       */
      const financialRates =
        extractFinancialRatesFromAdminConfig(
          next,
        );

      const financialRateState =
        await updateServerCurrencyRates(
          {
            usdToTzs:
              financialRates.usdToTzs,

            piGcvUsd:
              financialRates.piGcvUsd,

            sources: {
              usdToTzs:
                'admin_config',

              piGcvUsd:
                'gcv_reference',
            },
          },
          actor,
        );

      return jsonResponse({
        success: true,

        snapshot:
          updateResult.state,

        financialRateState,
      });
    }

    /*
     * ========================================================
     * ADMIN LANGUAGE CONFIGURATION
     * ========================================================
     */
    if (
      body.action !==
        undefined &&
      body.action !==
        'save'
    ) {
      return jsonResponse(
        {
          success: false,

          error:
            'Unsupported language action.',
        },
        400,
      );
    }

    const normalized =
      sanitizeAdminLanguageConfig(
        body.languageConfig,
      );

    if (!normalized) {
      return jsonResponse(
        {
          success: false,

          error:
            'Invalid language configuration payload.',
        },
        400,
      );
    }

    const previous =
      current.languageConfig ??
      normalized;

    const next: AdminLanguageConfig =
      {
        ...normalized,

        updatedAt:
          new Date().toISOString(),
      };

    const auditEntry =
      createLanguageAudit(
        previous,
        next,
        actor,
      );

    const nextAudit =
      sanitizeAdminLanguageAudit(
        auditEntry
          ? [
              auditEntry,
              ...current.languageAudit,
            ]
          : current.languageAudit,
      ).slice(
        0,
        MAX_AUDIT_ENTRIES,
      );

    const updateResult =
      await updateServerAdminConfigState(
        {
          languageConfig:
            next,

          languageAudit:
            nextAudit,
        },
        current.revision,
      );

    if (
      updateResult.ok === false
    ) {
      return revisionConflictResponse(
        updateResult.state,
      );
    }

    return jsonResponse({
      success: true,

      snapshot:
        updateResult.state,
    });
  } catch (error) {
    /*
     * Do not return internal Firebase/Admin errors to callers.
     *
     * Only a minimal server-side diagnostic category is logged.
     */
    console.error(
      'Admin config update failed:',
      error instanceof Error
        ? error.name
        : 'UnknownError',
    );

    return jsonResponse(
      {
        success: false,

        error:
          'Unable to update admin configuration.',
      },
      500,
    );
  }
}

function methodNotAllowed():
  NextResponse {
  return jsonResponse(
    {
      success: false,
      error:
        'Method not allowed.',
    },
    405,
  );
}

export async function GET():
  Promise<NextResponse> {
  return methodNotAllowed();
}

export async function PUT():
  Promise<NextResponse> {
  return methodNotAllowed();
}

export async function PATCH():
  Promise<NextResponse> {
  return methodNotAllowed();
}

export async function DELETE():
  Promise<NextResponse> {
  return methodNotAllowed();
}