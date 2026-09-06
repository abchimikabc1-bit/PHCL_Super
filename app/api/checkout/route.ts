import 'server-only';

import {
  NextResponse,
} from 'next/server';

import {
  authenticateFirebaseUser,
} from '@/lib/firebase-user-auth';

import {
  runServerCheckoutTransaction,
} from '@/lib/server-checkout-transaction';

export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

const MAX_REQUEST_BODY_BYTES =
  16_384;

const MAX_QUOTE_ID_LENGTH =
  160;

const MAX_OPERATION_ID_LENGTH =
  160;

type CheckoutRequestBody = {
  quoteId?: unknown;

  operationId?: unknown;
};

function noStoreJson(
  body: unknown,
  status:
    number,
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        'Cache-Control':
          'no-store, max-age=0',

        Pragma:
          'no-cache',
      },
    },
  );
}

function isPlainObject(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      'object' &&
    value !== null &&
    !Array.isArray(
      value,
    )
  );
}

function normalizeQuoteId(
  value: unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'Invalid payment quote ID.',
    );
  }

  const normalized =
    value.trim();

  if (
    !normalized ||
    normalized.length >
      MAX_QUOTE_ID_LENGTH ||
    normalized.includes(
      '/',
    )
  ) {
    throw new Error(
      'Invalid payment quote ID.',
    );
  }

  return normalized;
}

function normalizeOperationId(
  value: unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'Invalid checkout operation ID.',
    );
  }

  const normalized =
    value.trim();

  if (
    !normalized ||
    normalized.length >
      MAX_OPERATION_ID_LENGTH ||
    !/^[A-Za-z0-9._:-]+$/.test(
      normalized,
    )
  ) {
    throw new Error(
      'Invalid checkout operation ID.',
    );
  }

  return normalized;
}

async function readJsonBody(
  request:
    Request,
): Promise<CheckoutRequestBody> {
  const contentLength =
    request.headers.get(
      'content-length',
    );

  if (
    contentLength
  ) {
    const parsed =
      Number(
        contentLength,
      );

    if (
      !Number.isFinite(
        parsed,
      ) ||
      parsed < 0 ||
      parsed >
        MAX_REQUEST_BODY_BYTES
    ) {
      throw new Error(
        'Checkout request is too large.',
      );
    }
  }

  const raw =
    await request.text();

  if (
    !raw ||
    new TextEncoder()
      .encode(
        raw,
      )
      .byteLength >
        MAX_REQUEST_BODY_BYTES
  ) {
    throw new Error(
      'Invalid checkout request.',
    );
  }

  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        raw,
      );
  } catch {
    throw new Error(
      'Invalid checkout request.',
    );
  }

  if (
    !isPlainObject(
      parsed,
    )
  ) {
    throw new Error(
      'Invalid checkout request.',
    );
  }

  return parsed;
}

/**
 * ============================================================
 * PHCL SUPER — SECURE CHECKOUT API
 * ============================================================
 *
 * SECURITY BOUNDARY
 *
 * Browser/client may submit ONLY:
 *
 * - quoteId
 * - operationId
 *
 * customerUid is ALWAYS derived from the verified Firebase
 * bearer token and is NEVER trusted from request JSON.
 *
 * Prices, tax, fees, exchange rates, payment amount, balance,
 * stock and order status are all resolved server-side through
 * the authoritative checkout transaction coordinator.
 */
export async function POST(
  request:
    Request,
) {
  const auth =
    await authenticateFirebaseUser(
      request,
    );

   if (
  !auth.authenticated
) {
    return noStoreJson(
      {
        error:
          'Authentication required.',
      },
      401,
    );
  }

  let body:
    CheckoutRequestBody;

  try {
    body =
      await readJsonBody(
        request,
      );
  } catch {
    return noStoreJson(
      {
        error:
          'Invalid checkout request.',
      },
      400,
    );
  }

  let quoteId:
    string;

  let operationId:
    string;

  try {
    quoteId =
      normalizeQuoteId(
        body.quoteId,
      );

    operationId =
      normalizeOperationId(
        body.operationId,
      );
  } catch {
    return noStoreJson(
      {
        error:
          'Invalid checkout request.',
      },
      400,
    );
  }

  try {
    const result =
      await runServerCheckoutTransaction({
        customerUid:
          auth.user.uid,

        quoteId,

        operationId,
      });

    return noStoreJson(
      result,
      200,
    );
  } catch (
    error
  ) {
    /**
     * Do not leak internal Firestore, ledger, stock or
     * infrastructure details to the browser.
     *
     * A small allowlist of safe business errors is mapped
     * to stable client-facing responses.
     */
    const message =
      error instanceof Error
        ? error.message
        : '';

    if (
      /insufficient funds/i.test(
        message,
      )
    ) {
      return noStoreJson(
        {
          error:
            'Insufficient funds.',
        },
        409,
      );
    }

    if (
      /does not belong/i.test(
        message,
      )
    ) {
      return noStoreJson(
        {
          error:
            'Payment quote is not available for this account.',
        },
        403,
      );
    }

    if (
      /expired/i.test(
        message,
      )
    ) {
      return noStoreJson(
        {
          error:
            'Payment quote has expired.',
        },
        409,
      );
    }

    if (
      /already been consumed/i.test(
        message,
      )
    ) {
      return noStoreJson(
        {
          error:
            'Payment quote has already been used.',
        },
        409,
      );
    }

    if (
      /unavailable for purchase|units? available|product not found/i.test(
        message,
      )
    ) {
      return noStoreJson(
        {
          error:
            'One or more products are unavailable.',
        },
        409,
      );
    }

    if (
      /operation ID has already been used/i.test(
        message,
      ) ||
      /different checkout/i.test(
        message,
      )
    ) {
      return noStoreJson(
        {
          error:
            'Checkout operation conflict.',
        },
        409,
      );
    }

    return noStoreJson(
      {
        error:
          'Unable to complete checkout.',
      },
      500,
    );
  }
}

export async function GET() {
  return noStoreJson(
    {
      error:
        'Method not allowed.',
    },
    405,
  );
}

export async function PUT() {
  return noStoreJson(
    {
      error:
        'Method not allowed.',
    },
    405,
  );
}

export async function PATCH() {
  return noStoreJson(
    {
      error:
        'Method not allowed.',
    },
    405,
  );
}

export async function DELETE() {
  return noStoreJson(
    {
      error:
        'Method not allowed.',
    },
    405,
  );
}
