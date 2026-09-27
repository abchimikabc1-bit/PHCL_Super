import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from '@/lib/admin-session-security';

import {
  verifyTrustedDeviceSession,
} from '@/lib/admin-device-auth-security';

import {
  adminDb,
} from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TRUSTED_DEVICE_COOKIE =
  'phcl_admin_trusted_device';

const MEDIA_COLLECTION =
  'media';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function noStoreJson(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        'Cache-Control':
          'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}

function toFiniteNumber(
  value: unknown
): number | null {
  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    return value;
  }

  return null;
}

function toStringOrNull(
  value: unknown
): string | null {
  return typeof value === 'string'
    ? value
    : null;
}

function toStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is string =>
      typeof entry === 'string'
  );
}

function sanitizeMediaDocument(
  value: Record<string, unknown>
) {
  return {
    mediaId:
      toStringOrNull(value.mediaId),

    ownerId:
      toStringOrNull(value.ownerId),

    sourceFileName:
      toStringOrNull(value.sourceFileName),

    contentType:
      toStringOrNull(value.contentType),

    declaredSizeBytes:
      toFiniteNumber(
        value.declaredSizeBytes
      ),

    status:
      toStringOrNull(value.status),

    schemaVersion:
      toFiniteNumber(
        value.schemaVersion
      ),

    sourceObject:
      toStringOrNull(value.sourceObject),

    verifiedGeneration:
      toStringOrNull(
        value.verifiedGeneration
      ),

    validatedGeneration:
      toStringOrNull(
        value.validatedGeneration
      ),

    validatedAtMs:
      toFiniteNumber(
        value.validatedAtMs
      ),

    validationFailureReason:
      toStringOrNull(
        value.validationFailureReason
      ),

    validationProbe:
      value.validationProbe ?? null,

    transcoderJobName:
      toStringOrNull(
        value.transcoderJobName
      ),

    transcodeSubmittedGeneration:
      toStringOrNull(
        value.transcodeSubmittedGeneration
      ),

    transcodeSubmittedAtMs:
      toFiniteNumber(
        value.transcodeSubmittedAtMs
      ),

    transcodeCompletedGeneration:
      toStringOrNull(
        value.transcodeCompletedGeneration
      ),

    transcodeCompletedAtMs:
      toFiniteNumber(
        value.transcodeCompletedAtMs
      ),

    processedOutputPrefix:
      toStringOrNull(
        value.processedOutputPrefix
      ),

    masterManifestObject:
      toStringOrNull(
        value.masterManifestObject
      ),

    hlsManifestObjects:
      toStringArray(
        value.hlsManifestObjects
      ),

    mp4Objects:
      toStringArray(
        value.mp4Objects
      ),

    thumbnailObject:
      toStringOrNull(
        value.thumbnailObject
      ),

    createdAtMs:
      toFiniteNumber(
        value.createdAtMs
      ),

    updatedAtMs:
      toFiniteNumber(
        value.updatedAtMs
      ),

    serverCreatedAt:
      value.serverCreatedAt
        ?.toString?.() ?? null,

    serverUpdatedAt:
      value.serverUpdatedAt
        ?.toString?.() ?? null,
  };
}

export async function GET(
  request: NextRequest
) {
  try {
    const sessionToken =
      request.cookies.get(
        ADMIN_SESSION_COOKIE
      )?.value;

    const session =
      verifyAdminSessionToken(
        sessionToken
      );

    if (!session) {
      return noStoreJson(
        {
          ok: false,
          code: 'UNAUTHENTICATED',
          message:
            'Admin authentication is required.',
        },
        401
      );
    }

    const trustedSessionId =
      request.cookies.get(
        TRUSTED_DEVICE_COOKIE
      )?.value;

    if (!trustedSessionId) {
      return noStoreJson(
        {
          ok: false,
          code:
            'TRUSTED_DEVICE_REQUIRED',
          message:
            'Trusted Admin device verification is required.',
        },
        403
      );
    }

    const trustedDevice =
      await verifyTrustedDeviceSession(
        session.email,
        trustedSessionId
      );

    if (!trustedDevice) {
      return noStoreJson(
        {
          ok: false,
          code:
            'TRUSTED_DEVICE_REQUIRED',
          message:
            'Trusted Admin device verification is required.',
        },
        403
      );
    }

    const searchParams =
      request.nextUrl.searchParams;

    const requestedLimit =
      Number(
        searchParams.get('limit') ??
          DEFAULT_LIMIT
      );

    const limit =
      Number.isFinite(requestedLimit)
        ? Math.min(
            MAX_LIMIT,
            Math.max(
              1,
              Math.floor(
                requestedLimit
              )
            )
          )
        : DEFAULT_LIMIT;

    const status =
      searchParams
        .get('status')
        ?.trim()
        .toUpperCase() || '';

    const search =
      searchParams
        .get('search')
        ?.trim()
        .toLowerCase() || '';

    const snapshot =
      await adminDb
        .collection(
          MEDIA_COLLECTION
        )
        .orderBy(
          'createdAtMs',
          'desc'
        )
        .limit(MAX_LIMIT)
        .get();

    let media =
      snapshot.docs.map(
        (document) =>
          sanitizeMediaDocument(
            document.data()
          )
      );

    if (status) {
      media =
        media.filter(
          (entry) =>
            entry.status === status
        );
    }

    if (search) {
      media =
        media.filter(
          (entry) => {
            const haystack = [
              entry.mediaId,
              entry.ownerId,
              entry.sourceFileName,
              entry.status,
              entry.contentType,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();

            return haystack.includes(
              search
            );
          }
        );
    }

    const totalBeforeLimit =
      media.length;

    media =
      media.slice(0, limit);

    const statusCounts =
      snapshot.docs.reduce(
        (
          counts,
          document
        ) => {
          const mediaStatus =
            document.data()
              ?.status;

          if (
            typeof mediaStatus ===
            'string'
          ) {
            counts[mediaStatus] =
              (counts[mediaStatus] ??
                0) + 1;
          }

          return counts;
        },
        {} as Record<
          string,
          number
        >
      );

    return noStoreJson({
      ok: true,

      generatedAt:
        new Date().toISOString(),

      actor: {
        role: session.role,
        email: session.email,
      },

      trustedDevice: {
        verified: true,
      },

      summary: {
        total:
          snapshot.size,
        matched:
          totalBeforeLimit,
        returned:
          media.length,
        statusCounts,
      },

      media,
    });
  } catch (error) {
    console.error(
      'Unable to load Admin Media inventory:',
      error
    );

    return noStoreJson(
      {
        ok: false,
        code:
          'MEDIA_INVENTORY_UNAVAILABLE',
        message:
          'Unable to load Admin Media inventory.',
      },
      500
    );
  }
}
