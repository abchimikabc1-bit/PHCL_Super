import 'server-only';

import type {
  FinancialAsset,
} from '@/lib/server-financial-ledger';

/**
 * Canonical PHCL payment-provider identities.
 *
 * TIGO_PESA is deliberately not included.
 * Its current canonical identity is MIXX_BY_YAS.
 */
export const PAYMENT_PROVIDER_CODES = [
  'MPESA',
  'AIRTEL_MONEY',
  'HALOPESA',
  'MIXX_BY_YAS',
  'PAYPAL',
  'VISA_ACCEPTANCE',
  'PI_NETWORK',
] as const;

export type PaymentProviderCode =
  (typeof PAYMENT_PROVIDER_CODES)[number];

export type PaymentProviderEnvironment =
  | 'SANDBOX'
  | 'PRODUCTION';

export type PaymentProviderRail =
  | 'MOBILE_MONEY'
  | 'BANK'
  | 'CARD'
  | 'DIGITAL_WALLET'
  | 'BLOCKCHAIN';

export type ProviderOperationStatus =
  | 'PENDING'
  | 'REQUIRES_CUSTOMER_ACTION'
  | 'SUCCESS'
  | 'FAILED';

export type ProviderCallbackOutcome =
  | 'SUCCESS'
  | 'PENDING'
  | 'FAILED';

export type ProviderPayerReference =
  | {
      type:
        'MSISDN';

      /**
       * Server-controlled normalized telephone number.
       *
       * It must never be written to logs, callback audit
       * metadata or financial ledger metadata.
       */
      value:
        string;
    }
  | {
      type:
        'EMAIL';

      /**
       * Required by providers such as PayPal.
       *
       * Treat this as private customer data.
       */
      value:
        string;
    }
  | {
      type:
        'CUSTOMER_TOKEN';

      /**
       * Opaque token previously issued by the provider.
       * PHCL must not treat this token as authentication.
       */
      value:
        string;
    }
  | {
      type:
        'NONE';
    };

export type SafeProviderMetadata =
  Record<
    string,
    | string
    | number
    | boolean
    | null
  >;

export type ProviderCustomerAction =
  | {
      type:
        'REDIRECT';

      redirectUrl:
        string;

      expiresAtMs:
        number | null;
    }
  | {
      type:
        'QR_CODE';

      /**
       * Provider-issued QR payload only.
       *
       * Never generate a payment QR code from a Firebase
       * UID, email address or other PHCL account identity.
       */
      qrPayload:
        string;

      expiresAtMs:
        number | null;
    }
  | {
      type:
        'USSD_PROMPT';

      /**
       * Safe customer-facing instruction.
       *
       * It must not contain provider secrets.
       */
      message:
        string;

      expiresAtMs:
        number | null;
    }
  | {
      type:
        'APPROVAL_PENDING';

      message:
        string;

      expiresAtMs:
        number | null;
    };

export type InitiateProviderDepositInput = {
  /**
   * PHCL server-generated deposit request ID.
   */
  requestId:
    string;

  /**
   * PHCL server-generated idempotency key.
   *
   * Retried requests must reuse this exact value.
   */
  operationId:
    string;

  providerCode:
    PaymentProviderCode;

  environment:
    PaymentProviderEnvironment;

  rail:
    PaymentProviderRail;

  asset:
    FinancialAsset;

  /**
   * Positive amount represented using PHCL atomic units.
   *
   * Provider adapters are responsible for converting this
   * value to the provider's required decimal representation.
   */
  amountAtomic:
    string;

  payer:
    ProviderPayerReference;

  /**
   * Optional server-controlled URLs.
   *
   * Adapters must verify that these belong to an approved
   * PHCL hostname before sending them to a provider.
   */
  returnUrl?:
    string | null;

  cancelUrl?:
    string | null;

  /**
   * Server-controlled scalar metadata only.
   *
   * Never copy arbitrary browser JSON into this object.
   */
  metadata?:
    SafeProviderMetadata;
};

export type ProviderDepositInitiationResult = {
  success:
    true;

  providerCode:
    PaymentProviderCode;

  environment:
    PaymentProviderEnvironment;

  requestIdId:
    string stringInput; Wait disastrous typo. Need correct. We must not output erroneous. Need restart final? We are composing final, can fix.

Need continue accurately.

`requestId`, operationId, providerRequestId, providerTransactionId null, status, customerAction, expiresAt, rawResponseFingerprint (no raw response).
Failure perhaps interface method throws normalized errors; result success true only. Good.

Callback request:
providerCode trusted adapter selected
headers maybe Headers? adapters route uses Request. Define `ProviderCallbackInput {providerCode, environment, headers: Readonly<Record<string,string>>, rawBody, receivedAtMs}`.
Normalized callback with settlement kind.
Adapter:
readonly code rails assets, initiateDeposit, verifyAndNormalizeCallback.
No withdrawal.
Error class runtime helpful? Types file can include `ProviderAdapterErrorCode` and class. But types file primarily types. Could include helper `isPaymentProviderCode`.
Let's send complete. Ensure no accidental meta text.

Need redo final from start clean.