import 'server-only';

import {
  NextResponse,
} from 'next/server';

import {
  authenticateFirebaseUser,
} from '@/lib/firebase-user-auth';

import {
  createServerPaymentQuote,
  type PaymentQuoteAsset,
} from '@/lib/server-payment-quote';

import {
  saveServerPaymentQuote,
} from '@/lib/server-payment-quote-store';

export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

const MAX_BODY_LENGTH =
  32_768;

function jsonResponse(
  body: unknown,
  status = 200,
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
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isPaymentAsset(
  value: unknown,
): value is PaymentQuoteAsset {
  return (
    value === 'USD' ||
    value === 'TZS' ||
    value === 'NTZS' ||
    value === 'PI'
  );
}

async function readJsonBody(
  request: Request,
): Promise<unknown> {
  const contentLength =
    request.headers.get(
      'content-length',
    );

  if (contentLength) {
    const parsed =
      Number(contentLength);

    if (
      Number.isFinite(parsed) &&
      parsed >
        MAX_BODY_LENGTH
    ) {
      throw new Error(
        'REQUEST_TOO_LARGE',
      );
    }
  }

  const text =
    await request.text();

  if (
    text.length >
    MAX_BODY_LENGTH
  ) {
    throw new Error(
      'REQUEST_TOO_LARGE',
    );
  }

  if (!text.trim()) {
    throw new Error(
      'INVALID_JSON',
    );
  }

  try {
    return JSON.parse(
      text,
    ) as unknown;
  } catch {
    throw new Error(
      'INVALID_JSON',
    );
  }
}

/**
 * POST /api/payment/quote
 *
 * Requires:
 *
 * Authorization:
 * Bearer <Firebase ID token>
 *
 * Body:
 *
 * {
 *   "items": [
 *     {
 *       "productId": 17,
 *       "quantity": 2
 *     }
 *   ],
 *   "paymentAsset": "TZS"
 * }
 *
 * SECURITY:
 *
 * - User identity comes only from
 *   verified Firebase token.
 *
 * - Browser does not supply
 *   canonical product price.
 *
 * - Browser does not supply
 *   baseAmountUsd.
 *
 * - Browser does not supply
 *   exchange rate.
 *
 * - Browser does not supply
 *   paymentAmount.
 *
 * - Quote ownership is persisted
 *   server-side.
 */
export async function POST(
  request: Request,
) {
  const auth =
    await authenticateFirebaseUser(
      request,
    );

  if (!auth.authenticated) {
    return jsonResponse(
      {
        error:
          'Authentication required.',
      },
      401,
    );
  }

  let body: unknown;

  try {
    body =
      await readJsonBody(
        request,
      );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        'REQUEST_TOO_LARGE'
    ) {
      return jsonResponse(
        {
          error:
            'Request body is too large.',
        },
        413,
      );
    }

    return jsonResponse(
      {
        error:
          'Invalid JSON request body.',
      },
      400,
    );
  }

  if (
    !isPlainObject(body)
  ) {
    return jsonResponse(
      {
        error:
          'Invalid payment quote request.',
      },
      400,
    );
  }

  if (
    !Array.isArray(
      body.items,
    )
  ) {
    return jsonResponse(
      {
        error:
          'Marketplace items are required.',
      },
      400,
    );
  }

  if (
    !isPaymentAsset(
      body.paymentAsset,
    )
  ) {
    return jsonResponse(
      {
        error:
          'Unsupported payment asset.',
      },
      400,
    );
  }

  try {
    const quote =
      await createServerPaymentQuote({
        items:
          body.items as Array<{
            productId: number;
            quantity: number;
          }>,

        paymentAsset:
          body.paymentAsset,
      });

    const storedQuote =
      await saveServerPaymentQuote(
        auth.user.uid,
        quote,
      );

    return jsonResponse(
      {
        success: true,

        quote: {
          ...storedQuote.quote,

          customerUid:
            storedQuote.customerUid,
        },
      },
      200,
    );
  } catch {
    /**
     * Do not expose catalogue,
     * Firestore, quote-store or
     * internal financial errors
     * directly to clients.
     */
    return jsonResponse(
      {
        error:
          'Unable to create payment quote.',
      },
      400,
    );
  }
}

/**
 * Quote creation is POST-only.
 */
export async function GET() {
  return jsonResponse(
    {
      error:
        'Method not allowed.',
    },
    405,
  );
}