import {
  after,
  before,
  beforeEach,
  describe,
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import type {
  PaymentProviderAdapter,
  PaymentProviderCode,
  PaymentProviderEnvironment,
} from '@/lib/server-payment-provider-types';

type RegistryModule =
  typeof import(
    '@/lib/server-payment-provider-registry'
  );

let PaymentProviderRegistry:
  RegistryModule[
    'PaymentProviderRegistry'
  ];

let getPaymentProviderEnvironment:
  RegistryModule[
    'getPaymentProviderEnvironment'
  ];

const mutableProcessEnvironment =
  process.env as Record<
    string,
    string | undefined
  >;

const originalNodeEnvironment =
  mutableProcessEnvironment.NODE_ENV;

const originalProviderEnvironment =
  process.env
    .PAYMENT_PROVIDER_ENVIRONMENT;

function createAdapter(
  providerCode:
    PaymentProviderCode =
      'MPESA',

  environment:
    PaymentProviderEnvironment =
      'SANDBOX',
): PaymentProviderAdapter {
  return {
    providerCode,

    environment,

    supportedRails: [
      'MOBILE_MONEY',
    ],

    supportedAssets: [
      'TZS',
    ],

    async initiateDeposit(
      input,
    ) {
      return {
        success:
          true,

        providerCode,

        environment,

        requestId:
          input.requestId,

        operationId:
          input.operationId,

        providerRequestId:
          'sandbox-provider-request-001',

        providerTransactionId:
          null,

        status:
          'PENDING',

        customerAction: {
          type:
            'USSD_PROMPT',

          message:
            'Approve the sandbox payment request.',

          expiresAtMs:
            null,
        },

        expiresAtMs:
          null,

        responseFingerprint:
          'sandbox-response-fingerprint',
      };
    },

    async verifyAndNormalizeCallback(
      request,
    ) {
      return {
        providerCode,

        environment,

        kind:
          'DEPOSIT',

        requestId:
          'sandbox-deposit-request-001',

        providerEventId:
          'sandbox-provider-event-001',

        providerTransactionId:
          'sandbox-provider-transaction-001',

        outcome:
          'SUCCESS',

        failureReason:
          null,

        payloadFingerprint:
          request.rawBody,
      };
    },
  };
}

before(
  async () => {
    const registryModule =
      await import(
        '@/lib/server-payment-provider-registry'
      );

    PaymentProviderRegistry =
      registryModule
        .PaymentProviderRegistry;

    getPaymentProviderEnvironment =
      registryModule
        .getPaymentProviderEnvironment;
  },
);

beforeEach(
  () => {
    mutableProcessEnvironment.NODE_ENV =
      'test';

    delete process.env
      .PAYMENT_PROVIDER_ENVIRONMENT;
  },
);

after(
  () => {
    if (
      originalNodeEnvironment ===
        undefined
    ) {
      delete mutableProcessEnvironment
        .NODE_ENV;
    } else {
      mutableProcessEnvironment.NODE_ENV =
        originalNodeEnvironment;
    }

    if (
      originalProviderEnvironment ===
        undefined
    ) {
      delete process.env
        .PAYMENT_PROVIDER_ENVIRONMENT;
    } else {
      process.env
        .PAYMENT_PROVIDER_ENVIRONMENT =
        originalProviderEnvironment;
    }
  },
);

describe(
  'PHCL payment provider registry',
  {
    concurrency:
      false,
  },
  () => {
    test(
      'registers and retrieves a sandbox adapter',
      () => {
        const registry =
          new PaymentProviderRegistry();

        registry.register(
          createAdapter(),
        );

        assert.equal(
          registry.has(
            'MPESA',
            'SANDBOX',
          ),
          true,
        );

        const adapter =
          registry.get(
            'MPESA',
            'SANDBOX',
          );

        assert.equal(
          adapter.providerCode,
          'MPESA',
        );

        assert.equal(
          adapter.environment,
          'SANDBOX',
        );
      },
    );

    test(
      'rejects duplicate provider registration',
      () => {
        const registry =
          new PaymentProviderRegistry();

        registry.register(
          createAdapter(),
        );

        assert.throws(
          () => {
            registry.register(
              createAdapter(),
            );
          },
          /PAYMENT_PROVIDER_ALREADY_REGISTERED/,
        );
      },
    );

    test(
      'keeps sandbox and production adapters separate',
      () => {
        const registry =
          new PaymentProviderRegistry();

        registry.register(
          createAdapter(
            'MPESA',
            'SANDBOX',
          ),
        );

        registry.register(
          createAdapter(
            'MPESA',
            'PRODUCTION',
          ),
        );

        assert.equal(
          registry
            .get(
              'MPESA',
              'SANDBOX',
            )
            .environment,
          'SANDBOX',
        );

        assert.equal(
          registry
            .get(
              'MPESA',
              'PRODUCTION',
            )
            .environment,
          'PRODUCTION',
        );
      },
    );

    test(
      'fails closed when an adapter is not registered',
      () => {
        const registry =
          new PaymentProviderRegistry();

        assert.throws(
          () => {
            registry.get(
              'MPESA',
              'SANDBOX',
            );
          },
          /PAYMENT_PROVIDER_NOT_CONFIGURED/,
        );
      },
    );

    test(
      'rejects legacy TIGO_PESA provider alias',
      () => {
        const registry =
          new PaymentProviderRegistry();

        assert.throws(
          () => {
            registry.get(
              'TIGO_PESA' as
                PaymentProviderCode,
              'SANDBOX',
            );
          },
          /PAYMENT_PROVIDER_LEGACY_ALIAS_NOT_ALLOWED/,
        );
      },
    );

    test(
      'returns only adapters from the requested environment',
      () => {
        const registry =
          new PaymentProviderRegistry();

        registry.register(
          createAdapter(
            'MPESA',
            'SANDBOX',
          ),
        );

        registry.register(
          createAdapter(
            'AIRTEL_MONEY',
            'SANDBOX',
          ),
        );

        registry.register(
          createAdapter(
            'MPESA',
            'PRODUCTION',
          ),
        );

        const sandboxAdapters =
          registry.list(
            'SANDBOX',
          );

        assert.equal(
          sandboxAdapters.length,
          2,
        );

        assert.equal(
          sandboxAdapters.every(
            (
              adapter,
            ) =>
              adapter.environment ===
              'SANDBOX',
          ),
          true,
        );
      },
    );

    test(
      'freezes registered adapter configuration',
      () => {
        const registry =
          new PaymentProviderRegistry();

        registry.register(
          createAdapter(),
        );

        const adapter =
          registry.get(
            'MPESA',
            'SANDBOX',
          );

        assert.equal(
          Object.isFrozen(
            adapter,
          ),
          true,
        );

        assert.equal(
          Object.isFrozen(
            adapter.supportedRails,
          ),
          true,
        );

        assert.equal(
          Object.isFrozen(
            adapter.supportedAssets,
          ),
          true,
        );
      },
    );

    test(
      'defaults to sandbox outside production',
      () => {
        mutableProcessEnvironment.NODE_ENV =
          'test';

        delete process.env
          .PAYMENT_PROVIDER_ENVIRONMENT;

        assert.equal(
          getPaymentProviderEnvironment(),
          'SANDBOX',
        );
      },
    );

    test(
      'accepts explicitly configured sandbox environment outside production',
      () => {
        mutableProcessEnvironment.NODE_ENV =
          'development';

        process.env
          .PAYMENT_PROVIDER_ENVIRONMENT =
          'SANDBOX';

        assert.equal(
          getPaymentProviderEnvironment(),
          'SANDBOX',
        );
      },
    );

    test(
      'fails closed when production environment is not configured',
      () => {
        mutableProcessEnvironment.NODE_ENV =
          'production';

        delete process.env
          .PAYMENT_PROVIDER_ENVIRONMENT;

        assert.throws(
          () => {
            getPaymentProviderEnvironment();
          },
          /PAYMENT_PROVIDER_ENVIRONMENT_NOT_CONFIGURED/,
        );
      },
    );

    test(
      'rejects sandbox providers in production',
      () => {
        mutableProcessEnvironment.NODE_ENV =
          'production';

        process.env
          .PAYMENT_PROVIDER_ENVIRONMENT =
          'SANDBOX';

        assert.throws(
          () => {
            getPaymentProviderEnvironment();
          },
          /SANDBOX_PROVIDER_NOT_ALLOWED_IN_PRODUCTION/,
        );
      },
    );

    test(
      'accepts explicit production provider environment',
      () => {
        mutableProcessEnvironment.NODE_ENV =
          'production';

        process.env
          .PAYMENT_PROVIDER_ENVIRONMENT =
          'PRODUCTION';

        assert.equal(
          getPaymentProviderEnvironment(),
          'PRODUCTION',
        );
      },
    );
  },
);