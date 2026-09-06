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
  revokeTrustedDeviceSession,
} from '@/lib/admin-device-auth-security';

import {
  beginAdminRecoveryAccessOperation,
  completeAdminRecoveryAccessOperation,
  releaseAdminRecoveryAccessOperation,
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
  trustedSessionId: string,
  expiresAtMs: number
): void {
  const remainingSeconds =
    Math.max(
      1,
      Math.ceil(
        (
          expiresAtMs -
          Date.now()
        ) / 1000
      )
    );

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
        Math.min(
          TRUSTED_DEVICE_MAX_AGE_SECONDS,
          remainingSeconds
        ),
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
        ?.trim()
        .slice(0, 100) ||
      'unknown'
    );
  }

  return (
    request.headers
      .get('x-real-ip')
      ?.trim()
      .slice(0, 100) ||
    'unknown'
  );
}

async function safeWriteRecoveryAudit(
  event:
    | 'recovery_failed'
    | 'recovery_device_registered'
    | 'recovery_session_used',
  details: {
    email?: string;
    ipAddress: string;
    success: boolean;
    reason: string;
  }
): Promise<void> {
  try {
    await writeAdminRecoveryAudit(
      event,
      details
    );
  } catch (error) {
    console.error(
      'Unable to persist Admin recovery audit event:',
      error
    );
  }
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

  let operation:
    | Awaited<
        ReturnType<
          typeof beginAdminRecoveryAccessOperation
        >
      >
    | null = null;

  let securityStateMutated =
    false;

  let createdTrustedSessionId:
    | string
    | null = null;

  try {
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

    operation =
      await beginAdminRecoveryAccessOperation(
        recoveryToken
      );

    if (!operation) {
      return json(
        {
          ok: false,
          code:
            'RECOVERY_AUTHORIZATION_UNAVAILABLE',
          message:
            'Recovery authorization is invalid, expired, or already in use.',
        },
        409
      );
    }

    const label =
      typeof body.label ===
        'string'
        ? body.label
            .trim()
            .slice(0, 80)
        : 'Recovered Admin Device';

    const registration =
      await verifyRecoveryDeviceRegistration(
        operation.email,
        body.response,
        label ||
          'Recovered Admin Device'
      );

    securityStateMutated =
      true;

    const replacement =
      await finalizeRecoveryDeviceReplacement(
        operation.email,
        registration.deviceId
      );

    const trustedSession =
      await createTrustedDeviceSessionForDevice(
        operation.email,
        registration.deviceId
      );

    createdTrustedSessionId =
      trustedSession.trustedSessionId;

    const completed =
      await completeAdminRecoveryAccessOperation(
        recoveryToken,
        operation.operationId
      );

    if (!completed) {
      await revokeTrustedDeviceSession(
        operation.email,
        trustedSession.trustedSessionId
      ).catch(() => {
        // The trusted-session identifier is never
        // disclosed when completion fails.
      });

      const response = json(
        {
          ok: false,
          code:
            'RECOVERY_OPERATION_COMPLETION_FAILED',
          message:
            'Device replacement completed, but recovery authorization could not be finalized.',
        },
        409
      );

      clearRecoveryCookie(
        response
      );

      clearTrustedDeviceCookie(
        response
      );

      return response;
    }

    await safeWriteRecoveryAudit(
      'recovery_device_registered',
      {
        email:
          completed.email,
        ipAddress,
        success: true,
        reason:
          'emergency-recovery-replacement',
      }
    );

    await safeWriteRecoveryAudit(
      'recovery_session_used',
      {
        email:
          completed.email,
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

    clearRecoveryCookie(
      response
    );

    setTrustedDeviceCookie(
      response,
      trustedSession.trustedSessionId,
      trustedSession.expiresAtMs
    );

    return response;
  } catch (error) {
    console.error(
      'Recovery device verification failed:',
      error
    );

    if (
      operation &&
      !securityStateMutated
    ) {
      await releaseAdminRecoveryAccessOperation(
        recoveryToken,
        operation.operationId
      ).catch(() => {
        // The short lease expires automatically.
      });
    }

    if (
      operation &&
      createdTrustedSessionId
    ) {
      await revokeTrustedDeviceSession(
        operation.email,
        createdTrustedSessionId
      ).catch(() => {
        // Never expose an unfinalized session ID.
      });
    }

    await safeWriteRecoveryAudit(
      'recovery_failed',
      {
        email:
          operation?.email,
        ipAddress,
        success: false,
        reason:
          securityStateMutated
            ? 'device_replacement_partially_completed'
            : 'device_replacement_verification_failed',
      }
    );

    const response = json(
      {
        ok: false,
        code:
          securityStateMutated
            ? 'RECOVERY_REQUIRES_RECONCILIATION'
            : 'RECOVERY_DEVICE_VERIFICATION_FAILED',
        message:
          securityStateMutated
            ? 'Recovery changed the device state but could not finish. Sign in again with the replacement device or contact support.'
            : 'Recovery device verification failed.',
      },
      securityStateMutated
        ? 500
        : 400
    );

    if (securityStateMutated) {
      clearRecoveryCookie(
        response
      );

      clearTrustedDeviceCookie(
        response
      );
    }

    return response;
  }
}
