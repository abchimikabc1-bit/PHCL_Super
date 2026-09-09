import 'server-only';

import {
  FINANCIAL_ASSETS,
  type FinancialAsset,
} from '@/lib/server-financial-ledger';

import {
  mpesaSandboxAdapter,
} from '@/lib/server-payment-provider-adapters/mpesa-sandbox';

import {
  PAYMENT_PROVIDER_CODES,
  type PaymentProviderAdapter,
  type PaymentProviderCode,
  type PaymentProviderEnvironment,
  type PaymentProviderRail,
} from '@/lib/server-payment-provider-types';

const PAYMENT_PROVIDER_RAILS:
  readonly PaymentProviderRail[] = [
    'MOBILE_MONEY',
    'BANK',
    'CARD',
    'DIGITAL_WALLET',
    'BLOCKCHAIN',
  ];

function normalizeProviderCode(
  value:
    unknown,
): PaymentProviderCode {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'PAYMENT_PROVIDER_CODE_INVALID',
    );
  }

  const normalized =
    value
      .trim()
      .toUpperCase();

  /*
   * Tigo Pesa is represented by its current
   * canonical identity MIXX_BY_YAS.
   */
  if (
    normalized ===
      'TIGO_PESA'
  ) {
    throw new Error(
      'PAYMENT_PROVIDER_LEGACY_ALIAS_NOT_ALLOWED',
    );
  }

  if (
    !PAYMENT_PROVIDER_CODES.includes(
      normalized as
        PaymentProviderCode,
    )
  ) {
    throw new Error(
      'PAYMENT_PROVIDER_NOT_SUPPORTED',
    );
  }

  return normalized as
    PaymentProviderCode;
}

function normalizeEnvironment(
  value:
    unknown,
): PaymentProviderEnvironment {
  if (
    value !==
      'SANDBOX' &&
    value !==
      'PRODUCTION'
  ) {
    throw new Error(
      'PAYMENT_PROVIDER_ENVIRONMENT_INVALID',
    );
  }

  return value;
}

function normalizeRails(
  rails:
    readonly PaymentProviderRail[],
): readonly PaymentProviderRail[] {
  if (
    !Array.isArray(
      rails,
    ) ||
    rails.length === 0
  ) {
    throw new Error(
      'PAYMENT_PROVIDER_RAILS_REQUIRED',
    );
  }

  const unique =
    new Set<
      PaymentProviderRail
    >();

  for (
    const rail of rails
  ) {
    if (
      !PAYMENT_PROVIDER_RAILS.includes(
        rail,
      )
    ) {
      throw new Error(
        'PAYMENT_PROVIDER_RAIL_INVALID',
      );
    }

    unique.add(
      rail,
    );
  }

  return Object.freeze(
    [
      ...unique,
    ],
  );
}

function normalizeAssets(
  assets:
    readonly FinancialAsset[],
): readonly FinancialAsset[] {
  if (
    !Array.isArray(
      assets,
    ) ||
    assets.length === 0
  ) {
    throw new Error(
      'PAYMENT_PROVIDER_ASSETS_REQUIRED',
    );
  }

  const unique =
    new Set<
      FinancialAsset
    >();

  for (
    const asset of assets
  ) {
    if (
      !FINANCIAL_ASSETS.includes(
        asset,
      )
    ) {
      throw new Error(
        'PAYMENT_PROVIDER_ASSET_INVALID',
      );
    }

    unique.add(
      asset,
    );
  }

  return Object.freeze(
    [
      ...unique,
    ],
  );
}

function createRegistryKey(
  providerCode:
    PaymentProviderCode,

  environment:
    PaymentProviderEnvironment,
): string {
  return `${environment}:${providerCode}`;
}

function secureAdapter(
  adapter:
    PaymentProviderAdapter,
): PaymentProviderAdapter {
  const providerCode =
    normalizeProviderCode(
      adapter.providerCode,
    );

  const environment =
    normalizeEnvironment(
      adapter.environment,
    );

  if (
    typeof adapter
      .initiateDeposit !==
      'function'
  ) {
    throw new Error(
      'PAYMENT_PROVIDER_DEPOSIT_HANDLER_REQUIRED',
    );
  }

  if (
    typeof adapter
      .verifyAndNormalizeCallback !==
      'function'
  ) {
    throw new Error(
      'PAYMENT_PROVIDER_CALLBACK_HANDLER_REQUIRED',
    );
  }

  return Object.freeze({
    providerCode,

    environment,

    supportedRails:
      normalizeRails(
        adapter.supportedRails,
      ),

    supportedAssets:
      normalizeAssets(
        adapter.supportedAssets,
      ),

    initiateDeposit:
      adapter
        .initiateDeposit
        .bind(
          adapter,
        ),

    verifyAndNormalizeCallback:
      adapter
        .verifyAndNormalizeCallback
        .bind(
          adapter,
        ),
  });
}

export class PaymentProviderRegistry {
  readonly #adapters =
    new Map<
      string,
      PaymentProviderAdapter
    >();

  register(
    adapter:
      PaymentProviderAdapter,
  ): void {
    const secured =
      secureAdapter(
        adapter,
      );

    const key =
      createRegistryKey(
        secured.providerCode,
        secured.environment,
      );

    if (
      this.#adapters.has(
        key,
      )
    ) {
      throw new Error(
        'PAYMENT_PROVIDER_ALREADY_REGISTERED',
      );
    }

    this.#adapters.set(
      key,
      secured,
    );
  }

  has(
    providerCode:
      PaymentProviderCode,

    environment:
      PaymentProviderEnvironment,
  ): boolean {
    const code =
      normalizeProviderCode(
        providerCode,
      );

    const targetEnvironment =
      normalizeEnvironment(
        environment,
      );

    return this.#adapters.has(
      createRegistryKey(
        code,
        targetEnvironment,
      ),
    );
  }

  get(
    providerCode:
      PaymentProviderCode,

    environment:
      PaymentProviderEnvironment,
  ): PaymentProviderAdapter {
    const code =
      normalizeProviderCode(
        providerCode,
      );

    const targetEnvironment =
      normalizeEnvironment(
        environment,
      );

    const adapter =
      this.#adapters.get(
        createRegistryKey(
          code,
          targetEnvironment,
        ),
      );

    if (
      !adapter
    ) {
      throw new Error(
        'PAYMENT_PROVIDER_NOT_CONFIGURED',
      );
    }

    return adapter;
  }

  list(
    environment?:
      PaymentProviderEnvironment,
  ): readonly PaymentProviderAdapter[] {
    const targetEnvironment =
      environment ===
        undefined
        ? null
        : normalizeEnvironment(
            environment,
          );

    const adapters =
      [
        ...this
          .#adapters
          .values(),
      ].filter(
        (
          adapter,
        ) =>
          targetEnvironment ===
            null ||
          adapter.environment ===
            targetEnvironment,
      );

    return Object.freeze(
      adapters,
    );
  }
}

export function getPaymentProviderEnvironment():
  PaymentProviderEnvironment {
  const configured =
    process.env
      .PAYMENT_PROVIDER_ENVIRONMENT
      ?.trim()
      .toUpperCase();

  /*
   * Local development and automated tests use
   * SANDBOX by default.
   *
   * Production must declare its environment
   * explicitly and cannot use sandbox adapters.
   */
  if (
    !configured
  ) {
    if (
      process.env.NODE_ENV ===
        'production'
    ) {
      throw new Error(
        'PAYMENT_PROVIDER_ENVIRONMENT_NOT_CONFIGURED',
      );
    }

    return 'SANDBOX';
  }

  const environment =
    normalizeEnvironment(
      configured,
    );

  if (
    process.env.NODE_ENV ===
      'production' &&
    environment !==
      'PRODUCTION'
  ) {
    throw new Error(
      'SANDBOX_PROVIDER_NOT_ALLOWED_IN_PRODUCTION',
    );
  }

  return environment;
}

/**
 * Global registry containing only PHCL-approved adapters.
 *
 * Sandbox and production adapters remain separate through
 * their environment-specific registry keys.
 */
export const paymentProviderRegistry =
  new PaymentProviderRegistry();

/**
 * M-Pesa sandbox is the first approved test adapter.
 *
 * This registration performs no network request and does
 * not move, credit or debit real funds.
 */
paymentProviderRegistry.register(
  mpesaSandboxAdapter,
);

export function getConfiguredPaymentProvider(
  providerCode:
    PaymentProviderCode,
): PaymentProviderAdapter {
  return paymentProviderRegistry.get(
    providerCode,
    getPaymentProviderEnvironment(),
  );
}