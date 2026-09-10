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

export type ProviderSettlementKind =
  | 'DEPOSIT'
  | 'WITHDRAWAL';

export type ProviderPayerReference =
  | {
      type:
        'MSISDN';

      /**
       * Server-controlled normalized telephone number.
       *
       * Never write this value to logs, callback audits
       * or financial ledger metadata.
       */
      value:
        string;
    }
  | {
      type:
        'EMAIL';

      /**
       * Required by providers such as PayPal.
       * Treat this as private customer data.
       */
      value:
        string;
    }
  | {
      type:
        'CUSTOMER_TOKEN';

      /**
       * Opaque token previously issued by a provider.
       * It must not be treated as customer authentication.
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
       * UID, email address or PHCL account identity.
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
       * It must never contain provider secrets.
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
   * Retries must reuse this exact value.
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
   * Positive amount represented in PHCL atomic units.
   *
   * Each provider adapter converts this to the decimal
   * representation required by that provider.
   */
  amountAtomic:
    string;

  payer:
    ProviderPayerReference;

  /**
   * Optional server-controlled URLs.
   *
   * The adapter must confirm that they use an approved
   * PHCL HTTPS hostname before sending them externally.
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

  requestId:
    string;

  operationId:
    string;

  /**
   * Provider-issued request/reference identifier.
   */
  providerRequestId:
    string;

  /**
   * May be unavailable until the provider completes
   * or processes the payment.
   */
  providerTransactionId:
    string | null;

  status:
    ProviderOperationStatus;

  customerAction:
    ProviderCustomerAction | null;

  expiresAtMs:
    number | null;

  /**
   * SHA-256 fingerprint of the provider response.
   *
   * Store the fingerprint instead of raw provider data
   * that may contain private or sensitive information.
   */
  responseFingerprint:
    string;
};

/**
 * Server-controlled request for capturing a provider order
 * after the customer has completed the required approval.
 *
 * The browser must never choose requestId, providerCode,
 * providerRequestId or the provider environment.
 */
export type CaptureProviderDepositInput = {
  /**
   * Original PHCL deposit request ID.
   */
  requestId:
    string;

  /**
   * Server-generated capture idempotency key.
   * Every retry must reuse this exact value.
   */
  operationId:
    string;

  providerCode:
    PaymentProviderCode;

  environment:
    PaymentProviderEnvironment;

  /**
   * Provider order/reference created during initiation.
   */
  providerRequestId:
    string;
};

/**
 * Result of asking the provider to capture an approved order.
 *
 * SECURITY:
 *
 * This result must not directly credit a PHCL balance.
 * Financial settlement remains callback-only after an
 * authenticated provider SUCCESS event.
 */
export type ProviderDepositCaptureResult = {
  success:
    true;

  providerCode:
    PaymentProviderCode;

  environment:
    PaymentProviderEnvironment;

  requestId:
    string;

  operationId:
    string;

  providerRequestId:
    string;

  /**
   * Provider-issued capture or transaction identifier.
   * It may be unavailable while capture is pending.
   */
  providerTransactionId:
    string | null;

  status:
    ProviderOperationStatus;

  /**
   * SHA-256 fingerprint of the provider capture response.
   * Never store the raw provider response.
   */
  responseFingerprint:
    string;
};

export type ProviderCallbackRequest = {
  /**
   * Provider identity selected by a trusted server route.
   * Never obtain this value from callback JSON.
   */
  providerCode:
    PaymentProviderCode;

  environment:
    PaymentProviderEnvironment;

  /**
   * Exact raw request body before JSON parsing.
   */
  rawBody:
    string;

  /**
   * Normalized lower-case HTTP header names.
   */
  headers:
    Readonly<
      Record<
        string,
        string
      >
    >;

  receivedAtMs:
    number;
};

export type NormalizedProviderCallback = {
  providerCode:
    PaymentProviderCode;

  environment:
    PaymentProviderEnvironment;

  kind:
    ProviderSettlementKind;

  requestId:
    string;

  providerEventId:
    string;

  providerTransactionId:
    string | null;

  outcome:
    ProviderCallbackOutcome;

  failureReason:
    string | null;

  /**
   * SHA-256 fingerprint of the exact authenticated
   * provider callback body.
   */
  payloadFingerprint:
    string;
};

export type PaymentProviderAdapter = {
  readonly providerCode:
    PaymentProviderCode;

  readonly environment:
    PaymentProviderEnvironment;

  readonly supportedRails:
    readonly PaymentProviderRail[];

  readonly supportedAssets:
    readonly FinancialAsset[];

  /**
   * Initiates a provider deposit request.
   *
   * This method must not credit a PHCL balance.
   * Credit occurs only after a verified SUCCESS callback.
   */
  initiateDeposit(
    input:
      InitiateProviderDepositInput,
  ):
    Promise<
      ProviderDepositInitiationResult
    >;

  /**
   * Optionally captures an approved provider order.
   *
   * Mobile-money adapters that do not use a separate capture
   * step may omit this method.
   *
   * This method must never mutate a PHCL balance or ledger.
   */
  captureDeposit?(
    input:
      CaptureProviderDepositInput,
  ):
    Promise<
      ProviderDepositCaptureResult
    >;

  /**
   * Verifies the provider's native callback security
   * and converts it to the PHCL canonical callback.
   *
   * This method must not mutate financial balances.
   */
  verifyAndNormalizeCallback(
    request:
      ProviderCallbackRequest,
  ):
    Promise<
      NormalizedProviderCallback
    >;
};

export type ProviderAdapterErrorCode =
  | 'PROVIDER_NOT_SUPPORTED'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'PROVIDER_CONFIGURATION_INVALID'
  | 'PROVIDER_ROUTE_NOT_SUPPORTED'
  | 'PROVIDER_REQUEST_INVALID'
  | 'PROVIDER_AUTHENTICATION_FAILED'
  | 'PROVIDER_REQUEST_FAILED'
  | 'PROVIDER_RESPONSE_INVALID'
  | 'PROVIDER_CALLBACK_UNAUTHORIZED'
  | 'PROVIDER_CALLBACK_INVALID'
  | 'PROVIDER_CALLBACK_EXPIRED'
  | 'PROVIDER_OPERATION_CONFLICT'
  | 'PROVIDER_TEMPORARILY_UNAVAILABLE';

export class ProviderAdapterError
  extends Error {
  readonly code:
    ProviderAdapterErrorCode;

  readonly retryable:
    boolean;

  constructor(
    code:
      ProviderAdapterErrorCode,
    options?: {
      retryable?:
        boolean;

      cause?:
        unknown;
    },
  ) {
    super(
      code,
      options?.cause !==
        undefined
        ? {
            cause:
              options.cause,
          }
        : undefined,
    );

    this.name =
      'ProviderAdapterError';

    this.code =
      code;

    this.retryable =
      options?.retryable ??
      false;
  }
}

export function isPaymentProviderCode(
  value:
    unknown,
): value is PaymentProviderCode {
  return (
    typeof value ===
      'string' &&
    PAYMENT_PROVIDER_CODES.includes(
      value as
        PaymentProviderCode,
    )
  );
}