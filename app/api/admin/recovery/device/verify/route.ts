import {
  NextRequest,
  NextResponse,
} from 'next/server';

import type {
  RegistrationResponseJSON,
} from '@simplewebauthn/server';

import {
  verifyRecoveryDeviceRegistration,
} from '@/lib/admin-device-security';

import {
  createTrustedDeviceSessionForDevice,
  finalizeRecoveryDeviceReplacement,
} from '@/lib/admin-device-auth-security';

import {
  consumeAdminRecoveryAccessSession,
  verifyAdminRecoveryAccessSession,
  writeAdminRecoveryAudit,
} from '@/lib/admin-recovery-access-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RECOVERY_ACCESS_COOKIE =
  'phcl_admin_recovery_access';

const TRUSTED_DEVICE_COOKIE =
  'phcl_admin_trusted_device';

const TRUSTED_DEVICE_MAX_AGE_SECONDS =
  60 * 60;

type RequestBody = {
  response?: RegistrationResponseJSON;
  label?: string;
};

function json(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
      },
    }
  );
}

function clearRecoveryCookie(
  response: NextResponse
): void {
  response.cookies.set(
    RECOVERY_ACCESS_COOKIE,
    '',
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    }
  );
}

function clearTrustedDeviceCookie(
  response: NextResponse
): void {
  response.cookies.set(
    TRUSTED_DEVICE_COOKIE,
    '',
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    }
  );
}

function setTrustedDeviceCookie(
  response: NextResponse,
  trustedSessionId: string
): void {
  response.cookies.set(
    TRUSTED_DEVICE_COOKIE,
    trustedSessionId,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        'production',
      sameSite: 'strict',
      path: '/',
      maxAge:
        TRUSTED_DEVICE_MAX_AGE_SECONDS,
    }
  );
}

function getClientIp(
  request: NextRequest
): string {
  const forwardedFor =
    request.headers.get(
      'x-forwarded-for'
    );

  if (forwardedFor) {
    return (
      forwardedFor
        .split(',')[0]
        ?.trim() || 'unknown'
    );
  }

  return (
    request.headers
      .get('x-real-ip')
      ?.trim() ||
    'unknown'
  );
}

export async function POST(
  request: NextRequest
) {
  const ipAddress =
    getClientIp(request);

  const recoveryToken =
    request.cookies.get(
      RECOVERY_ACCESS_COOKIE
    )?.value;

  if (!recoveryToken) {
    return json(
      {
        ok: false,
        code:
          'RECOVERY_AUTHORIZATION_REQUIRED',
        message:
          'Recovery authorization is required.',
      },
      401
    );
  }

  try {
    const recoverySession =
      await verifyAdminRecoveryAccessSession(
        recoveryToken
      );

    if (!recoverySession) {
      const response = json(
        {
          ok: false,
          code:
            'RECOVERY_AUTHORIZATION_INVALID',
          message:
            'Recovery authorization is invalid or expired.',
        },
        401
      );

      clearRecoveryCookie(
        response
      );

      return response;
    }

    let body: RequestBody;

    try {
      body =
        (await request.json()) as RequestBody;
    } catch {
      return json(
        {
          ok: false,
          code:
            'INVALID_REQUEST',
          message:
            'Invalid device registration request.',
        },
        400
      );
    }

    if (
      !body.response ||
      typeof body.response !==
        'object'
    ) {
      return json(
        {
          ok: false,
          code:
            'WEBAUTHN_RESPONSE_REQUIRED',
          message:
            'WebAuthn registration response is required.',
        },
        400
      );
    }

    const label =
      typeof body.label === 'string'
        ? body.label
            .trim()
            .slice(0, 80)
        : 'Recovered Admin Device';

    /*
     * STEP 1:
     * Verify WebAuthn and register the
     * recovered device.
     */
    const registration =
      await verifyRecoveryDeviceRegistration(
        recoverySession.email,
        body.response,
        label ||
          'Recovered Admin Device'
      );

    /*
     * STEP 2:
     * Convert registration into a true
     * replacement:
     *
     * - keep the recovered device
     * - revoke older trusted devices
     * - revoke all previously issued trusted
     *   device sessions
     */
    const replacement =
      await finalizeRecoveryDeviceReplacement(
        recoverySession.email,
        registration.deviceId
      );

    /*
     * STEP 3:
     * Create a fresh trusted-device session
     * bound specifically to the recovered
     * device.
     *
     * This occurs only after old trusted
     * sessions have been revoked.
     */
    const trustedSession =
      await createTrustedDeviceSessionForDevice(
        recoverySession.email,
        registration.deviceId
      );

    /*
     * STEP 4:
     * Consume the short-lived recovery
     * authorization only after replacement
     * and new trusted-session creation both
     * succeed.
     */
    const consumed =
      await consumeAdminRecoveryAccessSession(
        recoveryToken
      );

    if (!consumed) {
      await writeAdminRecoveryAudit(
        'recovery_failed',
        {
          email:
            recoverySession.email,
          ipAddress,
          success: false,
          reason:
            'recovery_session_consume_failed_after_trusted_session_creation',
        }
      ).catch(() => {
        // Do not replace the primary result.
      });

      const response = json(
        {
          ok: false,
          code:
            'RECOVERY_SESSION_CONSUME_FAILED',
          message:
            'Device replacement succeeded, but recovery authorization could not be finalized.',
        },
        409
      );

      /*
       * Never issue the new trusted-session
       * cookie when recovery authorization
       * could not be consumed.
       *
       * The server-side session will exist
       * until its short TTL expires, but its
       * identifier is not disclosed to the
       * client.
       */
      clearRecoveryCookie(
        response
      );

      clearTrustedDeviceCookie(
        response
      );

      return response;
    }

    await writeAdminRecoveryAudit(
      'recovery_device_registered',
      {
        email:
          consumed.email,
        ipAddress,
        success: true,
        reason:
          'emergency-recovery-replacement',
      }
    );

    await writeAdminRecoveryAudit(
      'recovery_session_used',
      {
        email:
          consumed.email,
        ipAddress,
        success: true,
        reason:
          'replacement_completed_with_new_trusted_session',
      }
    );

    const response =
      json({
        ok: true,
        verified:
          registration.verified,
        deviceId:
          registration.deviceId,
        deviceType:
          registration.credentialDeviceType,
        backedUp:
          registration.credentialBackedUp,
        revokedDevices:
          replacement.revokedDevices,
        revokedSessions:
          replacement.revokedSessions,
        trustedSessionExpiresAtMs:
          trustedSession.expiresAtMs,
      });

    /*
     * Recovery authorization is one-time.
     * Replace any stale trusted-device cookie
     * with the new recovered-device session.
     */
    clearRecoveryCookie(
      response
    );

    setTrustedDeviceCookie(
      response,
      trustedSession.trustedSessionId
    );

    return response;
  } catch (error) {
    console.error(
      'Recovery device verification failed:',
      error
    );

    await writeAdminRecoveryAudit(
      'recovery_failed',
      {
        ipAddress,
        success: false,
        reason:
          'device_replacement_verification_failed',
      }
    ).catch(() => {
      // Do not replace the primary error.
    });

    return json(
      {
        ok: false,
        code:
          'RECOVERY_DEVICE_VERIFICATION_FAILED',
        message:
          'Recovery device verification failed.',
      },
      400
    );
  }
}
