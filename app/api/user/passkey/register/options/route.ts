import 'server-only';

import {
  NextResponse,
} from 'next/server';

import {
  authenticateFirebaseUser,
} from '@/lib/firebase-user-auth';

import {
  createCustomerPasskeyRegistrationOptions,
} from '@/lib/customer-passkey-security';

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

function getSafeRegistrationError(
  error: unknown,
): {
  status: number;
  error: string;
  code: string;
} {
  const message =
    error instanceof Error
      ? error.message
      : '';

  switch (message) {
    case 'EMAIL_VERIFICATION_REQUIRED':
      return {
        status: 403,
        error:
          'Email verification is required before Passkey enrollment.',
        code:
          'EMAIL_VERIFICATION_REQUIRED',
      };

    case 'RECENT_AUTHENTICATION_REQUIRED':
      return {
        status: 403,
        error:
          'Recent authentication is required before Passkey enrollment.',
        code:
          'RECENT_AUTHENTICATION_REQUIRED',
      };

    case 'EXISTING_PASSKEY_REQUIRES_STRONG_AUTH':
      return {
        status: 403,
        error:
          'Existing Passkey authentication is required before adding another Passkey.',
        code:
          'STRONG_AUTH_REQUIRED',
      };

    case 'INVALID_AUTHENTICATION_TIME':
      return {
        status: 403,
        error:
          'Authentication state is not eligible for Passkey enrollment.',
        code:
          'AUTHENTICATION_NOT_ELIGIBLE',
      };

    default:
      return {
        status: 500,
        error:
          'Unable to start Passkey enrollment.',
        code:
          'PASSKEY_ENROLLMENT_UNAVAILABLE',
      };
  }
}

/**
 * POST /api/user/passkey/register/options
 *
 * Starts first customer Passkey enrollment.
 *
 * SECURITY:
 *
 * - Requires a valid, non-revoked Firebase ID token.
 * - Customer UID comes only from that verified token.
 * - Browser cannot choose another customer's UID.
 * - First enrollment requires verified email.
 * - First enrollment requires recent Firebase authentication.
 * - Existing Passkey holders cannot use this bootstrap route
 *   to silently add another credential.
 * - WebAuthn challenge is generated and stored server-side.
 * - This endpoint does not approve KYC/KYS/KYB.
 * - This endpoint does not mutate wallet/ledger balances.
 */
export async function POST(
  request: Request,
) {
  const auth =
    await authenticateFirebaseUser(
      request,
    );

  if (
    !auth.authenticated
  ) {
    return jsonResponse(
      {
        error:
          'Authentication required.',
        code:
          'AUTHENTICATION_REQUIRED',
      },
      401,
    );
  }

  try {
    const registration =
      await createCustomerPasskeyRegistrationOptions(
        auth.user,
      );

    return jsonResponse(
      {
        success: true,

        challengeId:
          registration
            .challengeId,

        options:
          registration
            .options,
      },
      200,
    );
  } catch (
    error: unknown
  ) {
    const safeError =
      getSafeRegistrationError(
        error,
      );

    if (
      process.env.NODE_ENV ===
        'development' &&
      safeError.status ===
        500
    ) {
      console.warn(
        '[PHCL Customer Passkey] registration options failed:',
        error instanceof Error
          ? error.message
          : 'Unknown Passkey enrollment error.',
      );
    }

    return jsonResponse(
      {
        error:
          safeError.error,

        code:
          safeError.code,
      },
      safeError.status,
    );
  }
}

/**
 * Registration options are created only through
 * POST. No mutation/read variants are exposed.
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

export async function PUT() {
  return jsonResponse(
    {
      error:
        'Method not allowed.',
    },
    405,
  );
}

export async function PATCH() {
  return jsonResponse(
    {
      error:
        'Method not allowed.',
    },
    405,
  );
}

export async function DELETE() {
  return jsonResponse(
    {
      error:
        'Method not allowed.',
    },
    405,
  );
}