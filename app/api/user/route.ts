import 'server-only';

import {
  NextResponse,
} from 'next/server';

import {
  adminAuth,
  adminDb,
} from '@/lib/firebase-admin';

export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

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

function getBearerToken(
  request: Request,
): string | null {
  const authorization =
    request.headers.get(
      'authorization',
    );

  if (!authorization) {
    return null;
  }

  const match =
    authorization.match(
      /^Bearer\s+(.+)$/i,
    );

  const token =
    match?.[1]?.trim();

  return token || null;
}

async function getAuthenticatedUid(
  request: Request,
): Promise<string | null> {
  const token =
    getBearerToken(
      request,
    );

  if (!token) {
    return null;
  }

  try {
    /**
     * SECURITY:
     *
     * The UID comes from the verified
     * Firebase ID token.
     *
     * Never trust a UID supplied by
     * query string or request body.
     */
    const decodedToken =
      await adminAuth.verifyIdToken(
        token,
        true,
      );

    return (
      decodedToken.uid ||
      null
    );
  } catch {
    return null;
  }
}

/**
 * GET /api/user
 *
 * Returns the authenticated user's
 * own profile.
 *
 * Required header:
 *
 * Authorization:
 * Bearer <Firebase ID token>
 *
 * IMPORTANT:
 *
 * There is intentionally no ?uid=
 * parameter. Identity is derived
 * exclusively from the verified
 * Firebase ID token.
 */
export async function GET(
  request: Request,
) {
  const uid =
    await getAuthenticatedUid(
      request,
    );

  if (!uid) {
    return jsonResponse(
      {
        error:
          'Authentication required.',
      },
      401,
    );
  }

  try {
    const snapshot =
      await adminDb
        .collection('users')
        .doc(uid)
        .get();

    if (!snapshot.exists) {
      return jsonResponse(
        {
          error:
            'User profile not found.',
        },
        404,
      );
    }

    const data =
      snapshot.data();

    if (!data) {
      return jsonResponse(
        {
          error:
            'User profile not found.',
        },
        404,
      );
    }

    /**
     * SECURITY:
     *
     * Return only explicitly approved
     * self-profile fields.
     *
     * Do not return the entire
     * Firestore document because it
     * may later contain internal risk,
     * KYC/KYS/KYB, fraud, compliance,
     * admin or security metadata.
     */
    const profile = {
      uid,

      displayName:
        typeof data.displayName ===
        'string'
          ? data.displayName
          : null,

      email:
        typeof data.email ===
        'string'
          ? data.email
          : null,

      photoURL:
        typeof data.photoURL ===
        'string'
          ? data.photoURL
          : null,

      phoneNumber:
        typeof data.phoneNumber ===
        'string'
          ? data.phoneNumber
          : null,

      balances:
        typeof data.balances ===
          'object' &&
        data.balances !== null &&
        !Array.isArray(
          data.balances,
        )
          ? data.balances
          : {},
    };

    return jsonResponse({
      success: true,

      profile,
    });
  } catch {
    /**
     * Do not leak Firestore/Admin SDK
     * internal error messages to the
     * browser.
     */
    return jsonResponse(
      {
        error:
          'Unable to load user profile.',
      },
      500,
    );
  }
}

/**
 * Financial balance mutation through
 * this legacy route is intentionally
 * disabled.
 *
 * Credits/debits must later pass
 * through the authoritative financial
 * ledger + idempotent checkout/refund/
 * transfer settlement layer.
 */
export async function POST() {
  return jsonResponse(
    {
      error:
        'Direct balance mutation is not allowed.',
    },
    405,
  );
}