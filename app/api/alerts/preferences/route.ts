import 'server-only';

import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  getAlertPreferences,
  updateAlertPreferences,
  type AlertPreferences,
} from '@/lib/alert-service';

import {
  verifyTrustedDeviceSession,
} from '@/lib/admin-device-auth-security';

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from '@/lib/admin-session-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TRUSTED_DEVICE_COOKIE =
  'phcl_admin_trusted_device';

const MAX_REQUEST_BODY_BYTES =
  16 * 1024;

const MIN_BATCH_INTERVAL_MS =
  10_000;

const MAX_BATCH_INTERVAL_MS =
  24 * 60 * 60 * 1000;

const ALLOWED_CHANNELS = new Set<
  AlertPreferences['enabledChannels'][number]
>([
  'email',
  'slack',
  'sms',
]);

type AlertPreferencesUpdateBody = {
  enabledChannels?:
    AlertPreferences['enabledChannels'];
  emailAddress?: string;
  slackWebhookUrl?: string;
  phoneNumber?: string;
  thresholdSeverity?:
    AlertPreferences['thresholdSeverity'];
  batchAlerts?: boolean;
  batchIntervalMs?: number;
};

type BodyReadResult =
  | {
      ok: true;
      body: AlertPreferencesUpdateBody;
    }
  | {
      ok: false;
      response: NextResponse;
    };

type AdminAuthResult =
  | {
      ok: true;
      email: string;
    }
  | {
      ok: false;
      response: NextResponse;
    };

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): NextResponse {
  const response =
    NextResponse.json(
      body,
      {
        status,
      },
    );

  response.headers.set(
    'Cache-Control',
    'no-store, max-age=0',
  );

  response.headers.set(
    'Pragma',
    'no-cache',
  );

  return response;
}

function isPlainObject(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(value);

  return (
    prototype ===
      Object.prototype ||
    prototype === null
  );
}

function normalizeOptionalText(
  value: unknown,
  maxLength: number,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== 'string'
  ) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  const normalized =
    value.trim();

  if (
    normalized.length >
    maxLength
  ) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  return normalized;
}

function validateEmail(
  value: string | undefined,
): string | undefined {
  if (
    value === undefined ||
    value === ''
  ) {
    return value;
  }

  if (
    value.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value,
    )
  ) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  return value.toLowerCase();
}

function validatePhoneNumber(
  value: string | undefined,
): string | undefined {
  if (
    value === undefined ||
    value === ''
  ) {
    return value;
  }

  if (
    value.length > 32 ||
    !/^\+?[0-9 ()-]{7,32}$/.test(
      value,
    )
  ) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  return value;
}

function validateSlackWebhookUrl(
  value: string | undefined,
): string | undefined {
  if (
    value === undefined ||
    value === ''
  ) {
    return value;
  }

  if (value.length > 2048) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.hash
  ) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  if (
    parsed.hostname
      .toLowerCase() !==
    'hooks.slack.com'
  ) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  if (
    !parsed.pathname.startsWith(
      '/services/',
    )
  ) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  return parsed.toString();
}

function sanitizeUpdateBody(
  value: Record<
    string,
    unknown
  >,
): AlertPreferencesUpdateBody {
  const allowedKeys =
    new Set([
      'enabledChannels',
      'emailAddress',
      'slackWebhookUrl',
      'phoneNumber',
      'thresholdSeverity',
      'batchAlerts',
      'batchIntervalMs',
    ]);

  for (
    const key of
    Object.keys(value)
  ) {
    if (
      !allowedKeys.has(key)
    ) {
      throw new Error(
        'INVALID_REQUEST',
      );
    }
  }

  const result:
    AlertPreferencesUpdateBody =
      {};

  if (
    value.enabledChannels !==
    undefined
  ) {
    if (
      !Array.isArray(
        value.enabledChannels,
      )
    ) {
      throw new Error(
        'INVALID_REQUEST',
      );
    }

    if (
      value.enabledChannels
        .length > 3
    ) {
      throw new Error(
        'INVALID_REQUEST',
      );
    }

    const channels:
      AlertPreferences['enabledChannels'] =
        [];

    for (
      const channel of
      value.enabledChannels
    ) {
      if (
        typeof channel !==
          'string' ||
        !ALLOWED_CHANNELS.has(
          channel as
            AlertPreferences['enabledChannels'][number],
        )
      ) {
        throw new Error(
          'INVALID_REQUEST',
        );
      }

      const normalized =
        channel as
          AlertPreferences['enabledChannels'][number];

      if (
        !channels.includes(
          normalized,
        )
      ) {
        channels.push(
          normalized,
        );
      }
    }

    result.enabledChannels =
      channels;
  }

  if (
    value.emailAddress !==
    undefined
  ) {
    result.emailAddress =
      validateEmail(
        normalizeOptionalText(
          value.emailAddress,
          254,
        ),
      );
  }

  if (
    value.slackWebhookUrl !==
    undefined
  ) {
    result.slackWebhookUrl =
      validateSlackWebhookUrl(
        normalizeOptionalText(
          value.slackWebhookUrl,
          2048,
        ),
      );
  }

  if (
    value.phoneNumber !==
    undefined
  ) {
    result.phoneNumber =
      validatePhoneNumber(
        normalizeOptionalText(
          value.phoneNumber,
          32,
        ),
      );
  }

  if (
    value.thresholdSeverity !==
    undefined
  ) {
    if (
      value.thresholdSeverity !==
        'critical' &&
      value.thresholdSeverity !==
        'warning'
    ) {
      throw new Error(
        'INVALID_REQUEST',
      );
    }

    result.thresholdSeverity =
      value.thresholdSeverity;
  }

  if (
    value.batchAlerts !==
    undefined
  ) {
    if (
      typeof value.batchAlerts !==
      'boolean'
    ) {
      throw new Error(
        'INVALID_REQUEST',
      );
    }

    result.batchAlerts =
      value.batchAlerts;
  }

  if (
    value.batchIntervalMs !==
    undefined
  ) {
    if (
      typeof value.batchIntervalMs !==
        'number' ||
      !Number.isSafeInteger(
        value.batchIntervalMs,
      ) ||
      value.batchIntervalMs <
        MIN_BATCH_INTERVAL_MS ||
      value.batchIntervalMs >
        MAX_BATCH_INTERVAL_MS
    ) {
      throw new Error(
        'INVALID_REQUEST',
      );
    }

    result.batchIntervalMs =
      value.batchIntervalMs;
  }

  return result;
}

async function readRequestBody(
  request: NextRequest,
): Promise<BodyReadResult> {
  const contentLength =
    request.headers.get(
      'content-length',
    );

  if (contentLength) {
    const declaredLength =
      Number(contentLength);

    if (
      !Number.isFinite(
        declaredLength,
      ) ||
      declaredLength < 0 ||
      declaredLength >
        MAX_REQUEST_BODY_BYTES
    ) {
      return {
        ok: false,
        response: jsonResponse(
          {
            success: false,
            error:
              'Invalid request.',
          },
          400,
        ),
      };
    }
  }

  let rawBody: string;

  try {
    rawBody =
      await request.text();
  } catch {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error:
            'Invalid request.',
        },
        400,
      ),
    };
  }

  const rawBodyBytes =
    new TextEncoder().encode(
      rawBody,
    ).byteLength;

  if (
    rawBodyBytes >
    MAX_REQUEST_BODY_BYTES
  ) {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error:
            'Invalid request.',
        },
        400,
      ),
    };
  }

  if (!rawBody.trim()) {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error:
            'Invalid request.',
        },
        400,
      ),
    };
  }

  let parsed: unknown;

  try {
    parsed =
      JSON.parse(rawBody);
  } catch {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error:
            'Invalid request.',
        },
        400,
      ),
    };
  }

  if (
    !isPlainObject(parsed)
  ) {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error:
            'Invalid request.',
        },
        400,
      ),
    };
  }

  try {
    return {
      ok: true,
      body:
        sanitizeUpdateBody(
          parsed,
        ),
    };
  } catch {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error:
            'Invalid request.',
        },
        400,
      ),
    };
  }
}

async function authenticateAdminRequest(
  request: NextRequest,
): Promise<AdminAuthResult> {
  const adminSessionToken =
    request.cookies.get(
      ADMIN_SESSION_COOKIE,
    )?.value;

  const adminSession =
    verifyAdminSessionToken(
      adminSessionToken,
    );

  if (!adminSession) {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
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

  if (!trustedSessionId) {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error:
            'Trusted device verification required.',
        },
        403,
      ),
    };
  }

  const trustedDeviceValid =
    await verifyTrustedDeviceSession(
      adminSession.email,
      trustedSessionId,
    );

  if (
    !trustedDeviceValid
  ) {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error:
            'Trusted device verification required.',
        },
        403,
      ),
    };
  }

  return {
    ok: true,
    email:
      adminSession.email,
  };
}

function publicPreferences(
  preferences:
    AlertPreferences,
) {
  return {
    enabledChannels:
      preferences.enabledChannels,

    thresholdSeverity:
      preferences.thresholdSeverity,

    batchAlerts:
      preferences.batchAlerts,

    batchIntervalMs:
      preferences.batchIntervalMs,

    hasEmailConfigured:
      Boolean(
        preferences.emailAddress,
      ),

    hasSlackConfigured:
      Boolean(
        preferences.slackWebhookUrl,
      ),

    hasSmsConfigured:
      Boolean(
        preferences.phoneNumber,
      ),
  };
}

export async function GET(
  request: NextRequest,
) {
  try {
    const auth =
      await authenticateAdminRequest(
        request,
      );

    if (auth.ok === false) {
      return auth.response;
    }

    const preferences =
      getAlertPreferences();

    return jsonResponse({
      success: true,
      preferences:
        publicPreferences(
          preferences,
        ),
    });
  } catch (error) {
    console.error(
      '[PHCL Alert Preferences] GET failed:',
      error instanceof Error
        ? error.name
        : 'UnknownError',
    );

    return jsonResponse(
      {
        success: false,
        error:
          'Unable to retrieve alert preferences.',
      },
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const auth =
      await authenticateAdminRequest(
        request,
      );

    if (auth.ok === false) {
      return auth.response;
    }

    const bodyResult =
      await readRequestBody(
        request,
      );

    if (
      bodyResult.ok === false
    ) {
      return bodyResult.response;
    }

    const preferences =
      updateAlertPreferences(
        bodyResult.body,
      );

    return jsonResponse({
      success: true,
      message:
        'Alert preferences updated.',
      preferences:
        publicPreferences(
          preferences,
        ),
    });
  } catch (error) {
    console.error(
      '[PHCL Alert Preferences] POST failed:',
      error instanceof Error
        ? error.name
        : 'UnknownError',
    );

    return jsonResponse(
      {
        success: false,
        error:
          'Unable to update alert preferences.',
      },
      500,
    );
  }
}

export async function PUT() {
  return jsonResponse(
    {
      success: false,
      error:
        'Method not allowed.',
    },
    405,
  );
}

export async function PATCH() {
  return jsonResponse(
    {
      success: false,
      error:
        'Method not allowed.',
    },
    405,
  );
}

export async function DELETE() {
  return jsonResponse(
    {
      success: false,
      error:
        'Method not allowed.',
    },
    405,
  );
}