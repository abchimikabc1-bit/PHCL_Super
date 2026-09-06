import 'server-only';

import {
  randomUUID,
} from 'node:crypto';

import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  adminAuth,
} from '@/lib/firebase-admin';

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from '@/lib/admin-session-security';

import {
  verifyTrustedDeviceSession,
} from '@/lib/admin-device-auth-security';

import {
  displayAmountToAtomic,
  runServerFinancialMutation,
} from '@/lib/server-financial-ledger';

export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

const TRUSTED_DEVICE_COOKIE =
  'phcl_admin_trusted_device';

const REQUIRED_EMULATOR_HOST =
  '127.0.0.1:8080';

const TEST_DEPOSIT_USD =
  '100000.00';

function noStoreHeaders():
HeadersInit {
  return {
    'Cache-Control':
      'no-store, no-cache, must-revalidate, private',

    Pragma:
      'no-cache',

    Expires:
      '0',
  };
}

function json(
  body:
    Record<string, unknown>,

  status =
    200,
): NextResponse {
  return NextResponse.json(
    body,
    {
      status,

      headers:
        noStoreHeaders(),
    },
  );
}

async function requireAdminAccess(
  request:
    NextRequest,
): Promise<
  | {
      ok: true;
    }
  | {
      ok: false;
      response: NextResponse;
    }
> {
  const session =
    verifyAdminSessionToken(
      request.cookies.get(
        ADMIN_SESSION_COOKIE,
      )?.value,
    );

  if (
    !session
  ) {
    return {
      ok:
        false,

      response:
        json(
          {
            ok:
              false,

            error:
              'Unauthorized.',
          },
          401,
        ),
    };
  }

  const trustedSessionId =
    request.cookies.get(
      TRUSTED_DEVICE_COOKIE,
    )?.value;

  if (
    !trustedSessionId
  ) {
    return {
      ok:
        false,

      response:
        json(
          {
            ok:
              false,

            error:
              'Trusted device verification required.',
          },
          403,
        ),
    };
  }

  const trusted =
    await verifyTrustedDeviceSession(
      session.email,
      trustedSessionId,
    );

  if (
    !trusted
  ) {
    return {
      ok:
        false,

      response:
        json(
          {
            ok:
              false,

            error:
              'Trusted device verification required.',
          },
          403,
        ),
    };
  }

  return {
    ok:
      true,
  };
}

function emulatorIsAllowed():
boolean {
  return (
    process.env.NODE_ENV !==
      'production' &&
    process.env
      .FIRESTORE_EMULATOR_HOST ===
      REQUIRED_EMULATOR_HOST
  );
}

function maskEmail(
  email:
    string | undefined,
): string | null {
  if (
    !email
  ) {
    return null;
  }

  const atIndex =
    email.indexOf(
      '@',
    );

  if (
    atIndex <= 0
  ) {
    return null;
  }

  const local =
    email.slice(
      0,
      atIndex,
    );

  const domain =
    email.slice(
      atIndex + 1,
    );

  const visible =
    local.slice(
      0,
      Math.min(
        2,
        local.length,
      ),
    );

  return `${visible}***@${domain}`;
}

/*
 * GET
 *
 * Lists a small number of Firebase Auth users
 * so an authenticated PHCL Admin can identify
 * the customer UID to use for the emulator test.
 *
 * No tokens, password hashes, claims or credentials
 * are returned.
 */
export async function GET(
  request:
    NextRequest,
) {
  try {
    if (
      !emulatorIsAllowed()
    ) {
      return json(
        {
          ok:
            false,

          error:
            'Not available.',
        },
        404,
      );
    }

    const access =
      await requireAdminAccess(
        request,
      );

    if (
      access.ok ===
      false
    ) {
      return access.response;
    }

    const result =
      await adminAuth.listUsers(
        25,
      );

    const users =
      result.users.map(
        (
          user,
        ) => ({
          uid:
            user.uid,

          email:
            maskEmail(
              user.email,
            ),

          disabled:
            user.disabled,
        }),
      );

    return json(
      {
        ok:
          true,

        environment:
          'FIRESTORE_EMULATOR',

        users,

        count:
          users.length,
      },
    );
  } catch (
    error
  ) {
    console.error(
      'Unable to list emulator test users:',
      error instanceof Error
        ? error.name
        : 'UnknownError',
    );

    return json(
      {
        ok:
          false,

        error:
          'Unable to load test users.',
      },
      500,
    );
  }
}

/*
 * POST
 *
 * Emulator-only controlled test credit.
 *
 * Expected JSON:
 *
 * {
 *   "uid": "<Firebase UID>"
 * }
 */
export async function POST(
  request:
    NextRequest,
) {
  try {
    if (
      !emulatorIsAllowed()
    ) {
      return json(
        {
          ok:
            false,

          error:
            'Not available.',
        },
        404,
      );
    }

    const access =
      await requireAdminAccess(
        request,
      );

    if (
      access.ok ===
      false
    ) {
      return access.response;
    }

    const contentType =
      request.headers.get(
        'content-type',
      ) ?? '';

    if (
      !contentType
        .toLowerCase()
        .startsWith(
          'application/json',
        )
    ) {
      return json(
        {
          ok:
            false,

          error:
            'Invalid request.',
        },
        415,
      );
    }

    let body:
      unknown;

    try {
      body =
        await request.json();
    } catch {
      return json(
        {
          ok:
            false,

          error:
            'Invalid request.',
        },
        400,
      );
    }

    if (
      typeof body !==
        'object' ||
      body === null ||
      Array.isArray(
        body,
      )
    ) {
      return json(
        {
          ok:
            false,

          error:
            'Invalid request.',
        },
        400,
      );
    }

    const rawUid =
      (
        body as
          Record<
            string,
            unknown
          >
      ).uid;

    if (
      typeof rawUid !==
        'string'
    ) {
      return json(
        {
          ok:
            false,

          error:
            'Invalid customer UID.',
        },
        400,
      );
    }

    const uid =
      rawUid.trim();

    if (
      uid.length ===
        0 ||
      uid.length >
        128 ||
      /[/\\\u0000-\u001F\u007F]/.test(
        uid,
      )
    ) {
      return json(
        {
          ok:
            false,

          error:
            'Invalid customer UID.',
        },
        400,
      );
    }

    /*
     * Require the UID to represent a real
     * Firebase Auth identity before creating
     * emulator financial data for it.
     */
    try {
      await adminAuth.getUser(
        uid,
      );
    } catch {
      return json(
        {
          ok:
            false,

          error:
            'Customer not found.',
        },
        404,
      );
    }

    const amountAtomic =
      displayAmountToAtomic(
        TEST_DEPOSIT_USD,
        'USD',
      );

    const operationId =
      `emulator_seed_${randomUUID()}`;

    const result =
      await runServerFinancialMutation(
        {
          operationId,

          uid,

          operationType:
            'DEPOSIT',

          asset:
            'USD',

          direction:
            'CREDIT',

          amountAtomic,

          description:
            'PHCL emulator-only financial test deposit',

          metadata: {
            environment:
              'FIRESTORE_EMULATOR',

            source:
              'admin-dev-financial-seed',

            testOnly:
              true,
          },
        },
      );

    return json(
      {
        ok:
          true,

        environment:
          'FIRESTORE_EMULATOR',

        uid:
          result.uid,

        operationId:
          result.operationId,

        ledgerEntryId:
          result.ledgerEntryId,

        asset:
          result.asset,

        direction:
          result.direction,

        amountAtomic:
          result.amountAtomic,

        balanceBeforeAtomic:
          result.balanceBeforeAtomic,

        balanceAfterAtomic:
          result.balanceAfterAtomic,

        idempotent:
          result.idempotent,
      },
    );
  } catch (
    error
  ) {
    console.error(
      'Unable to seed emulator financial account:',
      error instanceof Error
        ? error.name
        : 'UnknownError',
    );

    return json(
      {
        ok:
          false,

        error:
          'Unable to create emulator financial test data.',
      },
      500,
    );
  }
}

export async function PUT() {
  return methodNotAllowed();
}

export async function PATCH() {
  return methodNotAllowed();
}

export async function DELETE() {
  return methodNotAllowed();
}

function methodNotAllowed() {
  return NextResponse.json(
    {
      ok:
        false,

      error:
        'Method not allowed.',
    },
    {
      status:
        405,

      headers: {
        ...noStoreHeaders(),

        Allow:
          'GET, POST',
      },
    },
  );
}