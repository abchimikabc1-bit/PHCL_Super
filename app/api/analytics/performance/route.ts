import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

import {
  type CoreWebVitals,
  type PerformanceReport,
  generatePerformanceAlerts,
} from '@/lib/performance-analytics';

import {
  getPerformanceReports,
  getRumSummary,
  savePerformanceReport,
} from '@/lib/rum-store';

import {
  getAlertStats,
} from '@/lib/alert-service';

import {
  verifyAdminSessionToken,
} from '@/lib/admin-session-security';

import {
  verifyTrustedDeviceSession,
} from '@/lib/admin-device-auth-security';

import {
  checkRumRateLimit,
} from '@/lib/server-rum-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_SESSION_COOKIE =
  'phcl_admin_session';

const TRUSTED_DEVICE_COOKIE =
  'phcl_admin_trusted_device';

const MAX_BODY_BYTES =
  32 * 1024;

const MAX_URL_LENGTH =
  2048;

const MAX_METRIC_VALUE =
  24 * 60 * 60 * 1000;

const VALID_DEVICES =
  new Set([
    'mobile',
    'tablet',
    'desktop',
  ]);

const VALID_RATINGS =
  new Set([
    'good',
    'needs-improvement',
    'poor',
  ]);

type PlainObject =
  Record<string, unknown>;

type AdminAccessResult =
  | {
      ok: true;
      email: string;
    }
  | {
      ok: false;
      response: NextResponse;
    };

function noStoreHeaders(): HeadersInit {
  return {
    'Cache-Control':
      'no-store, no-cache, must-revalidate, private',
    Pragma: 'no-cache',
    Expires: '0',
  };
}

function isPlainObject(
  value: unknown,
): value is PlainObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasOnlyKeys(
  value: PlainObject,
  allowedKeys: readonly string[],
): boolean {
  const allowed =
    new Set(allowedKeys);

  return Object
    .keys(value)
    .every((key) =>
      allowed.has(key),
    );
}

function isFiniteNonNegativeNumber(
  value: unknown,
  maximum =
    MAX_METRIC_VALUE,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= maximum
  );
}

function isSafeNonNegativeInteger(
  value: unknown,
  maximum = 1_000_000,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= maximum
  );
}

function isValidUrl(
  value: unknown,
): value is string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length >
      MAX_URL_LENGTH
  ) {
    return false;
  }

  try {
    const parsed =
      new URL(value);

    return (
      (
        parsed.protocol ===
          'http:' ||
        parsed.protocol ===
          'https:'
      ) &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

function isValidVital(
  value: unknown,
  expectedName:
    CoreWebVitals[keyof CoreWebVitals]['name'],
): boolean {
  if (!isPlainObject(value)) {
    return false;
  }

  if (
    !hasOnlyKeys(
      value,
      [
        'name',
        'value',
        'rating',
      ],
    )
  ) {
    return false;
  }

  return (
    value.name === expectedName &&
    isFiniteNonNegativeNumber(
      value.value,
    ) &&
    typeof value.rating ===
      'string' &&
    VALID_RATINGS.has(
      value.rating,
    )
  );
}

function isValidPerformanceReport(
  value: unknown,
): value is PerformanceReport {
  if (!isPlainObject(value)) {
    return false;
  }

  if (
    !hasOnlyKeys(
      value,
      [
        'timestamp',
        'url',
        'device',
        'coreWebVitals',
        'imageMetrics',
        'navigationTiming',
      ],
    )
  ) {
    return false;
  }

  if (
    !isFiniteNonNegativeNumber(
      value.timestamp,
      Number.MAX_SAFE_INTEGER,
    ) ||
    !isValidUrl(value.url) ||
    typeof value.device !==
      'string' ||
    !VALID_DEVICES.has(
      value.device,
    )
  ) {
    return false;
  }

  const coreWebVitals =
    value.coreWebVitals;

  if (
    !isPlainObject(
      coreWebVitals,
    ) ||
    !hasOnlyKeys(
      coreWebVitals,
      [
        'lcp',
        'fid',
        'cls',
        'ttfb',
      ],
    ) ||
    !isValidVital(
      coreWebVitals.lcp,
      'Largest Contentful Paint',
    ) ||
    !isValidVital(
      coreWebVitals.fid,
      'First Input Delay',
    ) ||
    !isValidVital(
      coreWebVitals.cls,
      'Cumulative Layout Shift',
    ) ||
    !isValidVital(
      coreWebVitals.ttfb,
      'Time to First Byte',
    )
  ) {
    return false;
  }

  const imageMetrics =
    value.imageMetrics;

  if (
    !isPlainObject(
      imageMetrics,
    ) ||
    !hasOnlyKeys(
      imageMetrics,
      [
        'totalImages',
        'lazyLoadedImages',
        'priorityImages',
        'averageLoadTime',
        'totalImageBandwidth',
        'compressedImageBandwidth',
        'bandwidthSavings',
      ],
    ) ||
    !isSafeNonNegativeInteger(
      imageMetrics.totalImages,
    ) ||
    !isSafeNonNegativeInteger(
      imageMetrics.lazyLoadedImages,
    ) ||
    !isSafeNonNegativeInteger(
      imageMetrics.priorityImages,
    ) ||
    !isFiniteNonNegativeNumber(
      imageMetrics.averageLoadTime,
    ) ||
    !isFiniteNonNegativeNumber(
      imageMetrics.totalImageBandwidth,
      Number.MAX_SAFE_INTEGER,
    ) ||
    !isFiniteNonNegativeNumber(
      imageMetrics.compressedImageBandwidth,
      Number.MAX_SAFE_INTEGER,
    ) ||
    !isFiniteNonNegativeNumber(
      imageMetrics.bandwidthSavings,
      100,
    )
  ) {
    return false;
  }

  const navigationTiming =
    value.navigationTiming;

  if (
    !isPlainObject(
      navigationTiming,
    ) ||
    !hasOnlyKeys(
      navigationTiming,
      [
        'dns',
        'tcp',
        'ttfb',
        'domInteractive',
        'domComplete',
        'pageLoadTime',
      ],
    ) ||
    !isFiniteNonNegativeNumber(
      navigationTiming.dns,
    ) ||
    !isFiniteNonNegativeNumber(
      navigationTiming.tcp,
    ) ||
    !isFiniteNonNegativeNumber(
      navigationTiming.ttfb,
    ) ||
    !isFiniteNonNegativeNumber(
      navigationTiming.domInteractive,
    ) ||
    !isFiniteNonNegativeNumber(
      navigationTiming.domComplete,
    ) ||
    !isFiniteNonNegativeNumber(
      navigationTiming.pageLoadTime,
    )
  ) {
    return false;
  }

  return true;
}

function getClientIp(
  request: NextRequest,
): string {
  const forwardedFor =
    request.headers.get(
      'x-forwarded-for',
    );

  if (forwardedFor) {
    const firstIp =
      forwardedFor
        .split(',')[0]
        ?.trim()
        .slice(0, 100);

    if (firstIp) {
      return firstIp;
    }
  }

  const realIp =
    request.headers
      .get('x-real-ip')
      ?.trim()
      .slice(0, 100);

  return realIp || 'unknown';
}

async function requireAdminAccess(
  request: NextRequest,
): Promise<AdminAccessResult> {
  const sessionToken =
    request.cookies.get(
      ADMIN_SESSION_COOKIE,
    )?.value;

  if (!sessionToken) {
    return {
      ok: false,
      response:
        NextResponse.json(
          {
            success: false,
            error: 'Unauthorized.',
          },
          {
            status: 401,
            headers:
              noStoreHeaders(),
          },
        ),
    };
  }

  const session =
    await verifyAdminSessionToken(
      sessionToken,
    );

  if (!session) {
    return {
      ok: false,
      response:
        NextResponse.json(
          {
            success: false,
            error: 'Unauthorized.',
          },
          {
            status: 401,
            headers:
              noStoreHeaders(),
          },
        ),
    };
  }

  const trustedSessionId =
    request.cookies.get(
      TRUSTED_DEVICE_COOKIE,
    )?.value;

  if (
    !trustedSessionId ||
    !(
      await verifyTrustedDeviceSession(
        session.email,
        trustedSessionId,
      )
    )
  ) {
    return {
      ok: false,
      response:
        NextResponse.json(
          {
            success: false,
            error:
              'Trusted device verification required.',
          },
          {
            status: 403,
            headers:
              noStoreHeaders(),
          },
        ),
    };
  }

  return {
    ok: true,
    email: session.email,
  };
}

async function readBoundedJson(
  request: NextRequest,
): Promise<
  | {
      ok: true;
      value: unknown;
    }
  | {
      ok: false;
      response: NextResponse;
    }
> {
  const contentLength =
    request.headers.get(
      'content-length',
    );

  if (contentLength) {
    const parsed =
      Number(contentLength);

    if (
      !Number.isFinite(parsed) ||
      parsed < 0 ||
      parsed >
        MAX_BODY_BYTES
    ) {
      return {
        ok: false,
        response:
          NextResponse.json(
            {
              success: false,
              error:
                'Invalid performance report.',
            },
            {
              status: 413,
              headers:
                noStoreHeaders(),
            },
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
      response:
        NextResponse.json(
          {
            success: false,
            error:
              'Invalid performance report.',
          },
          {
            status: 400,
            headers:
              noStoreHeaders(),
          },
        ),
    };
  }

  if (
    rawBody.length === 0 ||
    Buffer.byteLength(
      rawBody,
      'utf8',
    ) >
      MAX_BODY_BYTES
  ) {
    return {
      ok: false,
      response:
        NextResponse.json(
          {
            success: false,
            error:
              'Invalid performance report.',
          },
          {
            status:
              rawBody.length === 0
                ? 400
                : 413,
            headers:
              noStoreHeaders(),
          },
        ),
    };
  }

  try {
    return {
      ok: true,
      value:
        JSON.parse(rawBody) as unknown,
    };
  } catch {
    return {
      ok: false,
      response:
        NextResponse.json(
          {
            success: false,
            error:
              'Invalid performance report.',
          },
          {
            status: 400,
            headers:
              noStoreHeaders(),
          },
        ),
    };
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    /*
     * This endpoint intentionally accepts
     * anonymous browser RUM telemetry.
     *
     * x-forwarded-for / x-real-ip are used
     * only as an abuse-control signal.
     * They are not treated as user identity.
     */
    const clientKey =
      getClientIp(request);

    const rateLimit =
      await checkRumRateLimit(
        clientKey,
      );

    if (!rateLimit.allowed) {
      const retryAfterSeconds =
        Math.max(
          1,
          Math.ceil(
            (
              rateLimit.resetAt -
              Date.now()
            ) /
              1000,
          ),
        );

      return NextResponse.json(
        {
          success: false,
          error:
            'Too many performance reports.',
        },
        {
          status: 429,
          headers: {
            ...noStoreHeaders(),
            'Retry-After':
              String(
                retryAfterSeconds,
              ),
          },
        },
      );
    }

    const bodyResult =
      await readBoundedJson(
        request,
      );

    if (
      bodyResult.ok === false
    ) {
      return bodyResult.response;
    }

    if (
      !isValidPerformanceReport(
        bodyResult.value,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid performance report.',
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        },
      );
    }

    /*
     * Anonymous RUM ingestion may save
     * validated telemetry only.
     *
     * It must NOT directly dispatch
     * email, Slack, or SMS alerts.
     */
    savePerformanceReport(
      bodyResult.value,
    );

    return NextResponse.json(
      {
        success: true,
      },
      {
        status: 202,
        headers:
          noStoreHeaders(),
      },
    );
  } catch (error) {
    console.error(
      'Performance RUM ingestion failed:',
      error instanceof Error
        ? error.name
        : 'UnknownError',
    );

    return NextResponse.json(
      {
        success: false,
        error:
          'Failed to save performance report.',
      },
      {
        status: 500,
        headers:
          noStoreHeaders(),
      },
    );
  }
}

export async function GET(
  request: NextRequest,
) {
  try {
    const auth =
      await requireAdminAccess(
        request,
      );

    if (auth.ok === false) {
      return auth.response;
    }

    const rawLimit =
      request.nextUrl.searchParams.get(
        'limit',
      );

    let limit = 20;

    if (rawLimit !== null) {
      if (
        !/^\d{1,3}$/.test(
          rawLimit,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid limit.',
          },
          {
            status: 400,
            headers:
              noStoreHeaders(),
          },
        );
      }

      limit =
        Number(rawLimit);

      if (
        !Number.isSafeInteger(
          limit,
        ) ||
        limit < 1 ||
        limit > 100
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid limit.',
          },
          {
            status: 400,
            headers:
              noStoreHeaders(),
          },
        );
      }
    }

    const summary =
      getRumSummary(limit);

    const reports =
      getPerformanceReports(
        limit,
      );

    const latestReport =
      reports[0];

    const alertStats =
      getAlertStats();

    return NextResponse.json(
      {
        success: true,
        summary,
        alerts:
          latestReport
            ? generatePerformanceAlerts(
                latestReport,
              )
            : [],
        alertStats,
        reports,
      },
      {
        headers:
          noStoreHeaders(),
      },
    );
  } catch (error) {
    console.error(
      'Performance analytics read failed:',
      error instanceof Error
        ? error.name
        : 'UnknownError',
    );

    return NextResponse.json(
      {
        success: false,
        error:
          'Failed to fetch performance data.',
      },
      {
        status: 500,
        headers:
          noStoreHeaders(),
      },
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
      success: false,
      error:
        'Method not allowed.',
    },
    {
      status: 405,
      headers: {
        ...noStoreHeaders(),
        Allow: 'GET, POST',
      },
    },
  );
}