import 'server-only';

import {
  NextResponse,
} from 'next/server';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  authenticateFirebaseUser,
} from '@/lib/firebase-user-auth';

export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control':
    'no-store, max-age=0',
  Pragma:
    'no-cache',
  Vary:
    'Authorization',
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  additionalHeaders?:
    Record<string, string>,
): NextResponse {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        ...NO_STORE_HEADERS,
        ...additionalHeaders,
      },
    },
  );
}

function getSafeString(
  value: unknown,
  maxLength: number,
): string | null {
  if (
    typeof value !==
      'string'
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .slice(
        0,
        maxLength,
      );

  return normalized || null;
}

function getSafeBalance(
  value: unknown,
): number {
  return (
    typeof value ===
      'number' &&
    Number.isFinite(value)
  )
    ? value
    : 0;
}

function getBalanceMap(
  value: unknown,
): Record<string, unknown> {
  return (
    typeof value ===
      'object' &&
    value !== null &&
    !Array.isArray(value)
  )
    ? value as
        Record<string, unknown>
    : {};
}

/**
 * GET /api/user
 *
 * Returns only the authenticated
 * customer's approved self-profile
 * projection.
 *
 * Identity authority comes exclusively
 * from a verified, non-revoked Firebase
 * ID token.
 */
export async function GET(
  request: Request,
): Promise<NextResponse> {
  const authentication =
    await authenticateFirebaseUser(
      request,
    );

  if (
    !authentication.authenticated
  ) {
    return jsonResponse(
      {
        ok: false,
        success: false,
        code:
          'AUTHENTICATION_REQUIRED',
        error:
          'Authentication required.',
      },
      401,
    );
  }

  const {
    uid,
    email:
      authenticatedEmail,
    emailVerified,
    phoneNumber:
      authenticatedPhone,
  } = authentication.user;

  try {
    const snapshot =
      await adminDb
        .collection(
          'users',
        )
        .doc(uid)
        .get();

    if (!snapshot.exists) {
      return jsonResponse(
        {
          ok: false,
          success: false,
          code:
            'USER_PROFILE_NOT_FOUND',
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
          ok: false,
          success: false,
          code:
            'USER_PROFILE_NOT_FOUND',
          error:
            'User profile not found.',
        },
        404,
      );
    }

    /*
     * If the document explicitly contains
     * a UID, it must match the UID derived
     * from the verified token.
     */
    if (
      typeof data.uid ===
        'string' &&
      data.uid !== uid
    ) {
      return jsonResponse(
        {
          ok: false,
          success: false,
          code:
            'USER_PROFILE_IDENTITY_MISMATCH',
          error:
            'User profile is unavailable.',
        },
        403,
      );
    }

    const fullName =
      getSafeString(
        data.fullName,
        120,
      ) ??
      getSafeString(
        data.displayName,
        120,
      );

    const storedEmail =
      getSafeString(
        data.email,
        320,
      );

    const storedPhone =
      getSafeString(
        data.phone,
        40,
      ) ??
      getSafeString(
        data.phoneNumber,
        40,
      );

    const photoURL =
      getSafeString(
        data.photoURL,
        2_048,
      );

    const balances =
      getBalanceMap(
        data.balances,
      );

    const safeBalances = {
      usd:
        getSafeBalance(
          balances.usd,
        ),

      tzs:
        getSafeBalance(
          balances.tzs,
        ),

      ntzs:
        getSafeBalance(
          balances.ntzs,
        ),

      pi:
        getSafeBalance(
          balances.pi,
        ),
    };

    /*
     * Preserve temporary aliases used by
     * older pages while the application
     * migrates to the canonical fields:
     *
     * fullName
     * phone
     */
    const profile = {
      uid,

      fullName,

      displayName:
        fullName,

      email:
        authenticatedEmail ??
        storedEmail,

      emailVerified,

      phone:
        storedPhone,

      phoneNumber:
        authenticatedPhone ??
        storedPhone,

      phoneVerified:
        typeof authenticatedPhone ===
          'string' &&
        authenticatedPhone
          .trim()
          .length > 0,

      photoURL,

      role:
        'user' as const,

      tier:
        data.tier ===
          'regular' ||
        data.tier ===
          'small_business' ||
        data.tier ===
          'corporate'
          ? data.tier
          : null,

      balances:
        safeBalances,
    };

    return jsonResponse({
      ok: true,
      success: true,
      profile,
    });
  } catch (error) {
    /*
     * Do not expose Firestore, Firebase
     * token or infrastructure details.
     */
    console.error(
      'Unable to load authenticated user profile:',
      error instanceof Error
        ? error.name
        : 'UNKNOWN_ERROR',
    );

    return jsonResponse(
      {
        ok: false,
        success: false,
        code:
          'USER_PROFILE_UNAVAILABLE',
        error:
          'Unable to load user profile.',
      },
      500,
    );
  }
}

/**
 * Direct profile balance mutation through
 * this legacy route is prohibited.
 *
 * Financial writes must use the
 * authoritative server-side ledger.
 */
export async function POST():
  Promise<NextResponse> {
  return jsonResponse(
    {
      ok: false,
      success: false,
      code:
        'METHOD_NOT_ALLOWED',
      error:
        'Direct balance mutation is not allowed.',
    },
    405,
    {
      Allow:
        'GET',
    },
  );
}