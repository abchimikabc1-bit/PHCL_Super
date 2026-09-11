import {
  NextResponse,
} from 'next/server';

import {
  authenticateFirebaseUser,
} from '@/lib/firebase-user-auth';

import {
  initiateMediaIngest,
} from '@/lib/media-ingest-authority';

import {
  readMediaIngestRequest,
} from '@/lib/media-ingest-request';

function noStoreJson(
  body: unknown,
  status: number
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
    }
  );
}

export async function POST(
  request: Request
) {
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

  let body;

  try {
    body =
      await readMediaIngestRequest(
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
            'Media ingest request is too large.',
        },
        413
      );
    }

    return noStoreJson(
      {
        error:
          'Invalid media ingest request.',
      },
      400
    );
  }

  try {
    const media =
      await initiateMediaIngest({
        ownerId:
          auth.user.uid,

        sourceFileName:
          body.sourceFileName,
      });

    return noStoreJson(
      {
        mediaId:
          media.mediaId,

        sourceObject:
          media.sourceObject,

        status:
          media.status,
      },
      201
    );
  } catch {
    return noStoreJson(
      {
        error:
          'Unable to initiate media ingest.',
      },
      400
    );
  }
}
