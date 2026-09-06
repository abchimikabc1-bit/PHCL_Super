import 'server-only';

import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  getAlertNotificationHistory,
  getAlertPreferences,
  getAlertStats,
  sendAlertNotification,
  type AlertNotification,
} from '@/lib/alert-service';

import {
  generatePerformanceAlerts,
  type CoreWebVitals,
  type ImageMetrics,
  type PerformanceReport,
} from '@/lib/performance-analytics';

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
  32 * 1024;

const MAX_HISTORY_LIMIT = 100;

type AdminAuthResult =
  | {
      ok: true;
      email: string;
    }
  | {
      ok: false;
      response: NextResponse;
    };

type BodyReadResult =
  | {
      ok: true;
      report: PerformanceReport;
    }
  | {
      ok: false;
      response: NextResponse;
    };

const WEB_VITAL_RATINGS = new Set([
  'good',
  'needs-improvement',
  'poor',
]);

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): NextResponse {
  const response = NextResponse.json(
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
): value is Record<string, unknown> {
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
    prototype === Object.prototype ||
    prototype === null
  );
}

function ensureAllowedKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): void {
  const allowedSet =
    new Set(allowed);

  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      throw new Error(
        'INVALID_REQUEST',
      );
    }
  }
}

function readFiniteNumber(
  value: unknown,
  options?: {
    min?: number;
    max?: number;
  },
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  if (
    options?.min !== undefined &&
    value < options.min
  ) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  if (
    options?.max !== undefined &&
    value > options.max
  ) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  return value;
}

function readSafeInteger(
  value: unknown,
  options?: {
    min?: number;
    max?: number;
  },
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value)
  ) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  if (
    options?.min !== undefined &&
    value < options.min
  ) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  if (
    options?.max !== undefined &&
    value > options.max
  ) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  return value;
}

function sanitizeUrl(
  value: unknown,
): string {
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
    !normalized ||
    normalized.length > 2048
  ) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  if (
    parsed.protocol !== 'https:' &&
    parsed.protocol !== 'http:'
  ) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  if (
    parsed.username ||
    parsed.password
  ) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  return parsed.toString();
}

function sanitizeVitalMetric<
  TName extends
    CoreWebVitals[keyof CoreWebVitals]['name'],
>(
  value: unknown,
  expectedName: TName,
): {
  name: TName;
  value: number;
  rating:
    | 'good'
    | 'needs-improvement'
    | 'poor';
} {
  if (!isPlainObject(value)) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  ensureAllowedKeys(
    value,
    [
      'name',
      'value',
      'rating',
    ],
  );

  if (
    value.name !== expectedName
  ) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  if (
    typeof value.rating !==
      'string' ||
    !WEB_VITAL_RATINGS.has(
      value.rating,
    )
  ) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  return {
    name: expectedName,
    value: readFiniteNumber(
      value.value,
      {
        min: 0,
      },
    ),
    rating:
      value.rating as
        | 'good'
        | 'needs-improvement'
        | 'poor',
  };
}

function sanitizeCoreWebVitals(
  value: unknown,
): CoreWebVitals {
  if (!isPlainObject(value)) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  ensureAllowedKeys(
    value,
    [
      'lcp',
      'fid',
      'cls',
      'ttfb',
    ],
  );

  return {
    lcp: sanitizeVitalMetric(
      value.lcp,
      'Largest Contentful Paint',
    ),
    fid: sanitizeVitalMetric(
      value.fid,
      'First Input Delay',
    ),
    cls: sanitizeVitalMetric(
      value.cls,
      'Cumulative Layout Shift',
    ),
    ttfb: sanitizeVitalMetric(
      value.ttfb,
      'Time to First Byte',
    ),
  };
}

function sanitizeImageMetrics(
  value: unknown,
): ImageMetrics {
  if (!isPlainObject(value)) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  ensureAllowedKeys(
    value,
    [
      'totalImages',
      'lazyLoadedImages',
      'priorityImages',
      'averageLoadTime',
      'totalImageBandwidth',
      'compressedImageBandwidth',
      'bandwidthSavings',
    ],
  );

  const totalImages =
    readSafeInteger(
      value.totalImages,
      {
        min: 0,
        max: 100_000,
      },
    );

  const lazyLoadedImages =
    readSafeInteger(
      value.lazyLoadedImages,
      {
        min: 0,
        max: totalImages,
      },
    );

  const priorityImages =
    readSafeInteger(
      value.priorityImages,
      {
        min: 0,
        max: totalImages,
      },
    );

  return {
    totalImages,
    lazyLoadedImages,
    priorityImages,

    averageLoadTime:
      readFiniteNumber(
        value.averageLoadTime,
        {
          min: 0,
        },
      ),

    totalImageBandwidth:
      readFiniteNumber(
        value.totalImageBandwidth,
        {
          min: 0,
        },
      ),

    compressedImageBandwidth:
      readFiniteNumber(
        value.compressedImageBandwidth,
        {
          min: 0,
        },
      ),

    bandwidthSavings:
      readFiniteNumber(
        value.bandwidthSavings,
        {
          min: 0,
          max: 100,
        },
      ),
  };
}

function sanitizeNavigationTiming(
  value: unknown,
): PerformanceReport['navigationTiming'] {
  if (!isPlainObject(value)) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  ensureAllowedKeys(
    value,
    [
      'dns',
      'tcp',
      'ttfb',
      'domInteractive',
      'domComplete',
      'pageLoadTime',
    ],
  );

  return {
    dns: readFiniteNumber(
      value.dns,
      {
        min: 0,
      },
    ),

    tcp: readFiniteNumber(
      value.tcp,
      {
        min: 0,
      },
    ),

    ttfb: readFiniteNumber(
      value.ttfb,
      {
        min: 0,
      },
    ),

    domInteractive:
      readFiniteNumber(
        value.domInteractive,
        {
          min: 0,
        },
      ),

    domComplete:
      readFiniteNumber(
        value.domComplete,
        {
          min: 0,
        },
      ),

    pageLoadTime:
      readFiniteNumber(
        value.pageLoadTime,
        {
          min: 0,
        },
      ),
  };
}

function sanitizePerformanceReport(
  value: unknown,
): PerformanceReport {
  if (!isPlainObject(value)) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  ensureAllowedKeys(
    value,
    [
      'timestamp',
      'url',
      'device',
      'coreWebVitals',
      'imageMetrics',
      'navigationTiming',
    ],
  );

  const timestamp =
    readFiniteNumber(
      value.timestamp,
      {
        min: 0,
      },
    );

  if (
    value.device !== 'mobile' &&
    value.device !== 'tablet' &&
    value.device !== 'desktop'
  ) {
    throw new Error(
      'INVALID_REQUEST',
    );
  }

  return {
    timestamp,
    url: sanitizeUrl(
      value.url,
    ),
    device: value.device,
    coreWebVitals:
      sanitizeCoreWebVitals(
        value.coreWebVitals,
      ),
    imageMetrics:
      sanitizeImageMetrics(
        value.imageMetrics,
      ),
    navigationTiming:
      sanitizeNavigationTiming(
        value.navigationTiming,
      ),
  };
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
          error: 'Unauthorized.',
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

  if (!trustedDeviceValid) {
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
    email: adminSession.email,
  };
}

function sanitizeNotification(
  notification: AlertNotification,
) {
  return {
    id: notification.id,
    timestamp:
      notification.timestamp,

    alert: {
      metric:
        notification.alert.metric,
      severity:
        notification.alert.severity,
      value:
        notification.alert.value,
      threshold:
        notification.alert.threshold,
      message:
        notification.alert.message,
    },

    channel:
      notification.channel,

    status:
      notification.status,

    /*
     * Deliberately omit:
     * - recipient
     * - errorMessage
     *
     * recipient may currently contain
     * email, phone or Slack webhook URL.
     */
  };
}

async function readRequestBody(
  request: NextRequest,
): Promise<BodyReadResult> {
  const contentType =
    request.headers
      .get('content-type')
      ?.split(';')[0]
      ?.trim()
      .toLowerCase();

  if (
    contentType !==
    'application/json'
  ) {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error: 'Invalid request.',
        },
        400,
      ),
    };
  }

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
          error: 'Invalid request.',
        },
        400,
      ),
    };
  }

  if (
    new TextEncoder().encode(
      rawBody,
    ).byteLength >
    MAX_REQUEST_BODY_BYTES
  ) {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error: 'Invalid request.',
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
          error: 'Invalid request.',
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
          error: 'Invalid request.',
        },
        400,
      ),
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error: 'Invalid request.',
        },
        400,
      ),
    };
  }

  try {
    ensureAllowedKeys(
      parsed,
      ['performanceReport'],
    );

    return {
      ok: true,
      report:
        sanitizePerformanceReport(
          parsed.performanceReport,
        ),
    };
  } catch {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          error: 'Invalid request.',
        },
        400,
      ),
    };
  }
}

function readHistoryLimit(
  request: NextRequest,
):
  | {
      ok: true;
      limit: number;
    }
  | {
      ok: false;
      response: NextResponse;
    } {
  const raw =
    request.nextUrl.searchParams.get(
      'limit',
    );

  if (raw === null) {
    return {
      ok: true,
      limit: 50,
    };
  }

  if (!/^\d{1,3}$/.test(raw)) {
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

  const limit = Number(raw);

  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > MAX_HISTORY_LIMIT
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

  return {
    ok: true,
    limit,
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

    const action =
      request.nextUrl.searchParams.get(
        'action',
      );

    if (
      action !== null &&
      action !== 'history' &&
      action !== 'stats'
    ) {
      return jsonResponse(
        {
          success: false,
          error: 'Invalid request.',
        },
        400,
      );
    }

    if (action === 'history') {
      const limitResult =
        readHistoryLimit(request);

      if (
        limitResult.ok === false
      ) {
        return limitResult.response;
      }

      const history =
        getAlertNotificationHistory(
          limitResult.limit,
        );

      return jsonResponse({
        success: true,
        notifications:
          history.map(
            sanitizeNotification,
          ),
      });
    }

    if (action === 'stats') {
      const stats =
        getAlertStats();

      return jsonResponse({
        success: true,
        stats,
      });
    }

    const stats =
      getAlertStats();

    const recentNotifications =
      getAlertNotificationHistory(
        10,
      );

    return jsonResponse({
      success: true,
      stats,
      recentNotifications:
        recentNotifications.map(
          sanitizeNotification,
        ),
    });
  } catch (error) {
    console.error(
      '[PHCL Alerts] GET failed:',
      error instanceof Error
        ? error.name
        : 'UnknownError',
    );

    return jsonResponse(
      {
        success: false,
        error:
          'Unable to retrieve alerts.',
      },
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    /*
     * Authenticate before reading any
     * attacker-controlled request body.
     */
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

    const alerts =
      generatePerformanceAlerts(
        bodyResult.report,
      );

    const preferences =
      getAlertPreferences();

    if (
      preferences.enabledChannels
        .length === 0
    ) {
      return jsonResponse({
        success: true,
        message:
          'No alert channels configured.',
        alertsGenerated:
          alerts.length,
        alertsSent: 0,
        notifications: [],
      });
    }

    const filteredAlerts =
      alerts.filter(
        (alert) => {
          if (
            preferences.thresholdSeverity ===
            'critical'
          ) {
            return (
              alert.severity ===
              'critical'
            );
          }

          return true;
        },
      );

    const notifications:
      ReturnType<
        typeof sanitizeNotification
      >[] = [];

    for (
      const alert of
      filteredAlerts
    ) {
      const sent =
        await sendAlertNotification(
          alert,
          preferences,
        );

      notifications.push(
        ...sent.map(
          sanitizeNotification,
        ),
      );
    }

    return jsonResponse({
      success: true,
      alertsGenerated:
        alerts.length,
      alertsSent:
        filteredAlerts.length,
      notifications,
    });
  } catch (error) {
    console.error(
      '[PHCL Alerts] POST failed:',
      error instanceof Error
        ? error.name
        : 'UnknownError',
    );

    return jsonResponse(
      {
        success: false,
        error:
          'Unable to process alerts.',
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