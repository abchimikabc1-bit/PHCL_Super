import 'server-only';

import {
  NextResponse,
} from 'next/server';

import {
  authenticateFirebaseUser,
} from '@/lib/firebase-user-auth';

import {
  getServerVerificationFacts,
} from '@/lib/server-verification-facts';

import {
  assessVerificationRequirements,
} from '@/lib/server-verification-requirements';

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

/**
 * GET /api/user/verification
 *
 * SECURITY MODEL
 *
 * 1. Firebase ID token is required.
 * 2. UID is derived exclusively from the
 *    verified Firebase token.
 * 3. Browser cannot supply:
 *    - UID
 *    - KYC/KYS/KYB status
 *    - account age
 *    - order count
 *    - transaction count
 *    - 2FA state
 *    - passkey state
 *    - referral count
 *    - trust score
 * 4. Verification facts are collected only
 *    from trusted server-side sources.
 * 5. This route performs READS only.
 * 6. This route NEVER approves KYC/KYS/KYB.
 */
export async function GET(
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
      },
      401,
    );
  }

  try {
    const facts =
      await getServerVerificationFacts(
        auth.user.uid,
      );

    const assessment =
      assessVerificationRequirements(
        facts,
      );

    /**
     * SECURITY:
     *
     * Return only customer-safe assessment
     * information.
     *
     * Do not expose:
     * - internal risk metadata
     * - fraud rules
     * - compliance notes
     * - raw Firestore documents
     * - Firebase token contents
     * - server implementation details
     */
    return jsonResponse({
      success: true,

      verification: {
        kyc: {
          applicable:
            assessment.kyc
              .applicable,

          status:
            assessment.kyc
              .status,

          progressPercent:
            assessment.kyc
              .progressPercent,

          eligibleToStart:
            assessment.kyc
              .eligibleToStart,

          requirements:
            assessment.kyc
              .requirements.map(
                (
                  requirement,
                ) => ({
                  key:
                    requirement.key,

                  label:
                    requirement.label,

                  met:
                    requirement.met,

                  current:
                    requirement
                      .current,

                  target:
                    requirement
                      .target,
                }),
              ),
        },

        kys: {
          applicable:
            assessment.kys
              .applicable,

          status:
            assessment.kys
              .status,

          progressPercent:
            assessment.kys
              .progressPercent,

          eligibleToStart:
            assessment.kys
              .eligibleToStart,

          requirements:
            assessment.kys
              .requirements.map(
                (
                  requirement,
                ) => ({
                  key:
                    requirement.key,

                  label:
                    requirement.label,

                  met:
                    requirement.met,

                  current:
                    requirement
                      .current,

                  target:
                    requirement
                      .target,
                }),
              ),
        },

        kyb: {
          applicable:
            assessment.kyb
              .applicable,

          status:
            assessment.kyb
              .status,

          progressPercent:
            assessment.kyb
              .progressPercent,

          eligibleToStart:
            assessment.kyb
              .eligibleToStart,

          requirements:
            assessment.kyb
              .requirements.map(
                (
                  requirement,
                ) => ({
                  key:
                    requirement.key,

                  label:
                    requirement.label,

                  met:
                    requirement.met,

                  current:
                    requirement
                      .current,

                  target:
                    requirement
                      .target,
                }),
              ),
        },
      },

      trust: {
        level:
          assessment.trust.level,

        name:
          assessment.trust.name,

        score:
          assessment.trust.score,

        nextLevel:
          assessment.trust
            .nextLevel,
      },

      security: {
        twoFactorEnabled:
          assessment.security
            .twoFactorEnabled,

        biometricOrPasskeyEnabled:
          assessment.security
            .biometricOrPasskeyEnabled,

        strongAuthenticationReady:
          assessment.security
            .strongAuthenticationReady,
      },
    });
  } catch (
    error: unknown
  ) {
    /**
     * DEVELOPMENT DIAGNOSTIC ONLY.
     *
     * Browser still receives only the
     * generic error below.
     *
     * Never log Firebase ID tokens,
     * Authorization headers, cookies
     * or credentials.
     */
    if (
      process.env.NODE_ENV !==
      'production'
    ) {
      console.error(
        '[PHCL Verification Assessment]',
        error instanceof Error
          ? error.message
          : 'Unknown verification error.',
      );
    }

    return jsonResponse(
      {
        error:
          'Unable to load verification status.',
      },
      500,
    );
  }
}

/**
 * This endpoint is READ ONLY.
 *
 * KYC/KYS/KYB approval and security
 * enrollment must use dedicated protected
 * server workflows.
 */
export async function POST() {
  return jsonResponse(
    {
      error:
        'Verification mutation is not allowed through this endpoint.',
    },
    405,
  );
}

export async function PUT() {
  return jsonResponse(
    {
      error:
        'Verification mutation is not allowed through this endpoint.',
    },
    405,
  );
}

export async function PATCH() {
  return jsonResponse(
    {
      error:
        'Verification mutation is not allowed through this endpoint.',
    },
    405,
  );
}

export async function DELETE() {
  return jsonResponse(
    {
      error:
        'Verification mutation is not allowed through this endpoint.',
    },
    405,
  );
}