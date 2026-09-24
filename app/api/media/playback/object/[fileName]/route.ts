import {
  Readable,
} from 'node:stream';

import type {
  NextRequest,
} from 'next/server';

import {
  authorizeMediaPlaybackObject,
  MEDIA_PLAYBACK_COOKIE_NAME,
} from '@/lib/media-playback-session-authority';

import {
  createMediaPlaybackStorageStream,
} from '@/lib/media-playback-storage-stream';

type MediaPlaybackObjectRouteContext = {
  params: Promise<{
    fileName: string;
  }>;
};

function privateErrorResponse(
  status: number,
  diagnostic?: string
): Response {
  const headers:
    Record<string, string> = {
      'Cache-Control':
        'private, no-store, max-age=0',
      Pragma:
        'no-cache',
      'X-Content-Type-Options':
        'nosniff',
    };

  if (
    process.env.NODE_ENV ===
      'development' &&
    diagnostic
  ) {
    headers[
      'X-PHCL-Playback-Diagnostic'
    ] = diagnostic;
  }

  return new Response(
    null,
    {
      status,
      headers,
    }
  );
}

function readSafeDiagnostic(
  error: unknown,
  fallback: string
): string {
  if (
    error instanceof Error &&
    /^[A-Z0-9_]{1,96}$/.test(
      error.message
    )
  ) {
    return error.message;
  }

  return fallback;
}

function logDevelopmentDiagnostic(
  stage: 'AUTHORITY' | 'STORAGE',
  diagnostic: string
): void {
  if (
    process.env.NODE_ENV !==
    'development'
  ) {
    return;
  }

  console.warn(
    '[PHCL Media Playback]',
    stage,
    diagnostic
  );
}

async function handleMediaPlaybackObject(
  request: NextRequest,
  context: MediaPlaybackObjectRouteContext,
  method: 'GET' | 'HEAD'
): Promise<Response> {
  const token =
    request.cookies.get(
      MEDIA_PLAYBACK_COOKIE_NAME
    )?.value;

  if (!token) {
    return privateErrorResponse(
      401,
      'MISSING_MEDIA_PLAYBACK_COOKIE'
    );
  }

  const {
    fileName,
  } =
    await context.params;

  let authority:
    Awaited<
      ReturnType<
        typeof authorizeMediaPlaybackObject
      >
    >;

  try {
    authority =
      await authorizeMediaPlaybackObject(
        token,
        fileName
      );
  } catch (error) {
    const diagnostic =
      readSafeDiagnostic(
        error,
        'MEDIA_PLAYBACK_AUTHORITY_FAILED'
      );

    logDevelopmentDiagnostic(
      'AUTHORITY',
      diagnostic
    );

    return privateErrorResponse(
      403,
      diagnostic
    );
  }

  try {
    const storageResult =
      await createMediaPlaybackStorageStream({
        objectPath:
          authority.objectPath,
        contentType:
          authority.contentType,
        allowByteRanges:
          authority.allowByteRanges,
        method,
        rangeHeader:
          request.headers.get(
            'range'
          ),
      });

    const webBody =
      storageResult.body === null
        ? null
        : Readable.toWeb(
            storageResult.body
          ) as ReadableStream<Uint8Array>;

    return new Response(
      webBody,
      {
        status:
          storageResult.status,
        headers:
          storageResult.headers,
      }
    );
  } catch (error) {
    const diagnostic =
      readSafeDiagnostic(
        error,
        'MEDIA_PLAYBACK_STORAGE_FAILED'
      );

    logDevelopmentDiagnostic(
      'STORAGE',
      diagnostic
    );

    return privateErrorResponse(
      404,
      diagnostic
    );
  }
}

export function GET(
  request: NextRequest,
  context: MediaPlaybackObjectRouteContext
): Promise<Response> {
  return handleMediaPlaybackObject(
    request,
    context,
    'GET'
  );
}

export function HEAD(
  request: NextRequest,
  context: MediaPlaybackObjectRouteContext
): Promise<Response> {
  return handleMediaPlaybackObject(
    request,
    context,
    'HEAD'
  );
}
