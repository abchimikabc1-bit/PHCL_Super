import {
  NextResponse,
} from 'next/server';

import {
  authenticateFirebaseUser,
} from '@/lib/firebase-user-auth';

import {
  createMediaPlaybackSession,
  MEDIA_PLAYBACK_COOKIE_NAME,
  MEDIA_PLAYBACK_COOKIE_PATH,
} from '@/lib/media-playback-session-authority';

import {
  readMediaPlaybackSessionRequest,
} from '@/lib/media-playback-session-request';

function noStoreJson(
  body: unknown,
  status: number
): NextResponse {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        'Cache-Control':
          'no-store, max-age=0',
        Pragma:
          'no-cache',
        'X-Content-Type-Options':
          'nosniff',
      },
    }
  );
}

export async function POST(
  request: Request
): Promise<NextResponse> {
  const auth =
    await authenticateFirebaseUser(
      request
    );

  if (!auth.authenticated) {
    return noStoreJson(
      {
        error:
          'Authentication required.',
      },
      401
    );
  }

  let body:
    Awaited<
      ReturnType<
        typeof readMediaPlaybackSessionRequest
      >
    >;

  try {
    body =
      await readMediaPlaybackSessionRequest(
        request
      );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        'REQUEST_TOO_LARGE'
    ) {
      return noStoreJson(
        {
          error:
            'Media playback request is too large.',
        },
        413
      );
    }

    return noStoreJson(
      {
        error:
          'Invalid media playback request.',
      },
      400
    );
  }

  try {
    const session =
      await createMediaPlaybackSession(
        auth.user.uid,
        body.mediaId
      );

    const response =
      noStoreJson(
        {
          mediaId:
            session.mediaId,
          expiresAtMs:
            session.expiresAtMs,
          masterManifestUrl:
            session.masterManifestUrl,
          mp4Urls:
            session.mp4Urls,
          thumbnailUrl:
            session.thumbnailUrl,
        },
        201
      );

    response.cookies.set(
      MEDIA_PLAYBACK_COOKIE_NAME,
      session.token,
      {
        httpOnly:
          true,
        secure:
          process.env.NODE_ENV ===
          'production',
        sameSite:
          'strict',
        path:
          MEDIA_PLAYBACK_COOKIE_PATH,
        expires:
          new Date(
            session.expiresAtMs
          ),
        priority:
          'high',
      }
    );

    return response;
  } catch {
    /*
     * Deliberately avoid revealing whether
     * media is absent, not READY, or owned
     * by another account.
     */
    return noStoreJson(
      {
        error:
          'Unable to create media playback session.',
      },
      403
    );
  }
}
