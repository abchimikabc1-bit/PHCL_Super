import 'server-only';

import type {
  DecodedIdToken,
} from 'firebase-admin/auth';

import {
  adminAuth,
} from '@/lib/firebase-admin';

export interface AuthenticatedFirebaseUser {
  uid: string;

  email: string | null;

  emailVerified: boolean;

  phoneNumber: string | null;

  token: DecodedIdToken;
}

export type FirebaseUserAuthResult =
  | {
      authenticated: true;

      user:
        AuthenticatedFirebaseUser;
    }
  | {
      authenticated: false;

      reason:
        | 'MISSING_TOKEN'
        | 'INVALID_TOKEN';
    };

const MAX_BEARER_TOKEN_LENGTH =
  16_384;

type SafeFirebaseAuthDiagnostic =
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REVOKED'
  | 'USER_DISABLED'
  | 'INVALID_ARGUMENT'
  | 'INVALID_ID_TOKEN'
  | 'INVALID_SIGNATURE'
  | 'AUDIENCE_OR_PROJECT_MISMATCH'
  | 'ISSUER_MISMATCH'
  | 'CERTIFICATE_FETCH_FAILED'
  | 'ADMIN_CREDENTIAL_FAILURE'
  | 'UNKNOWN_VERIFICATION_FAILURE';

function getErrorCode(
  error: unknown,
): string {
  if (
    typeof error !==
      'object' ||
    error === null
  ) {
    return '';
  }

  const record =
    error as Record<
      string,
      unknown
    >;

  if (
    typeof record.code ===
      'string'
  ) {
    return record.code;
  }

  const errorInfo =
    record.errorInfo;

  if (
    typeof errorInfo ===
      'object' &&
    errorInfo !== null
  ) {
    const errorInfoRecord =
      errorInfo as Record<
        string,
        unknown
      >;

    if (
      typeof errorInfoRecord.code ===
        'string'
    ) {
      return errorInfoRecord.code;
    }
  }

  return '';
}

function getSafeFirebaseAuthDiagnostic(
  error: unknown,
): SafeFirebaseAuthDiagnostic {
  const code =
    getErrorCode(
      error,
    ).toLowerCase();

  if (
    code.includes(
      'id-token-expired',
    )
  ) {
    return 'TOKEN_EXPIRED';
  }

  if (
    code.includes(
      'id-token-revoked',
    )
  ) {
    return 'TOKEN_REVOKED';
  }

  if (
    code.includes(
      'user-disabled',
    )
  ) {
    return 'USER_DISABLED';
  }

  if (
    code.includes(
      'argument-error',
    )
  ) {
    return 'INVALID_ARGUMENT';
  }

  if (
    code.includes(
      'invalid-id-token',
    )
  ) {
    return 'INVALID_ID_TOKEN';
  }

  if (
    code.includes(
      'invalid-signature',
    )
  ) {
    return 'INVALID_SIGNATURE';
  }

  if (
    code.includes(
      'project-id-mismatch',
    ) ||
    code.includes(
      'audience',
    )
  ) {
    return 'AUDIENCE_OR_PROJECT_MISMATCH';
  }

  if (
    code.includes(
      'issuer',
    )
  ) {
    return 'ISSUER_MISMATCH';
  }

  if (
    code.includes(
      'certificate-fetch-failed',
    )
  ) {
    return 'CERTIFICATE_FETCH_FAILED';
  }

  if (
    code.includes(
      'credential',
    ) ||
    code.includes(
      'app-invalid-credential',
    )
  ) {
    return 'ADMIN_CREDENTIAL_FAILURE';
  }

  return 'UNKNOWN_VERIFICATION_FAILURE';
}

function logSafeFirebaseAuthDiagnostic(
  error: unknown,
): void {
  if (
    process.env.NODE_ENV !==
      'development'
  ) {
    return;
  }

  const diagnostic =
    getSafeFirebaseAuthDiagnostic(
      error,
    );

  const code =
    getErrorCode(
      error,
    );

  /**
   * SECURITY:
   *
   * This log intentionally contains only:
   * - a safe diagnostic category
   * - Firebase's short error code
   *
   * It MUST NOT log:
   * - ID tokens
   * - decoded token payloads
   * - Authorization headers
   * - service-account details
   * - private keys
   * - API keys
   */
  console.warn(
    '[PHCL Firebase Auth] verification failed:',
    diagnostic,
    code
      ? `(${code})`
      : '',
  );
}

/**
 * Extracts a Firebase ID token from:
 *
 * Authorization: Bearer <token>
 *
 * This function does not verify the
 * token. Verification happens only
 * through Firebase Admin SDK below.
 */
export function getFirebaseBearerToken(
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
      /^Bearer\s+([^\s]+)$/i,
    );

  const token =
    match?.[1]?.trim();

  if (
    !token ||
    token.length >
      MAX_BEARER_TOKEN_LENGTH
  ) {
    return null;
  }

  return token;
}

/**
 * Verifies a Firebase ID token using
 * Firebase Admin SDK.
 *
 * SECURITY:
 *
 * - UID is derived from the verified
 *   token.
 * - Never accept UID from query/body
 *   as identity authority.
 * - checkRevoked=true rejects revoked
 *   sessions/tokens.
 */
export async function authenticateFirebaseUser(
  request: Request,
): Promise<FirebaseUserAuthResult> {
  const token =
    getFirebaseBearerToken(
      request,
    );

  if (!token) {
    return {
      authenticated: false,

      reason:
        'MISSING_TOKEN',
    };
  }

  try {
    const decodedToken =
      await adminAuth.verifyIdToken(
        token,
        true,
      );

    const uid =
      typeof decodedToken.uid ===
        'string'
        ? decodedToken.uid.trim()
        : '';

    if (!uid) {
      return {
        authenticated: false,

        reason:
          'INVALID_TOKEN',
      };
    }

    return {
      authenticated: true,

      user: {
        uid,

        email:
          typeof decodedToken.email ===
            'string'
            ? decodedToken.email
            : null,

        emailVerified:
          decodedToken
            .email_verified ===
          true,

        phoneNumber:
          typeof decodedToken
            .phone_number ===
          'string'
            ? decodedToken
                .phone_number
            : null,

        token:
          decodedToken,
      },
    };
  } catch (
    error
  ) {
    logSafeFirebaseAuthDiagnostic(
      error,
    );

    /**
     * Never expose Firebase Admin
     * verification details to API callers.
     */
    return {
      authenticated: false,

      reason:
        'INVALID_TOKEN',
    };
  }
}

/**
 * Convenience helper for routes that
 * only need the authenticated UID.
 */
export async function getAuthenticatedFirebaseUid(
  request: Request,
): Promise<string | null> {
  const result =
    await authenticateFirebaseUser(
      request,
    );

  return result.authenticated
    ? result.user.uid
    : null;
}
