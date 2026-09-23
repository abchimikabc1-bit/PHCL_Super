import 'server-only';

import type {
  MediaTranscodeWorkExecutionResult,
} from '@/lib/media-transcode-work-execution-orchestrator';

import type {
  MediaTranscodeWorkerInvocation,
} from '@/lib/media-transcode-worker-invocation';

export type MediaTranscodeWorkerRequestAuthenticator =
  (
    request: Request
  ) => Promise<boolean>;

export type MediaTranscodeWorkerHandlerDependencies = {
  authenticateRequest:
    MediaTranscodeWorkerRequestAuthenticator;

  readInvocation: (
    request: Request
  ) => Promise<MediaTranscodeWorkerInvocation>;

  consumeMediaTranscodeWork: (
    mediaId: string
  ) => Promise<MediaTranscodeWorkExecutionResult>;
};

function noStoreResponse(
  status: number
): Response {
  return new Response(
    null,
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

export async function handleMediaTranscodeWorkerRequestWithDependencies(
  request: Request,
  dependencies:
    MediaTranscodeWorkerHandlerDependencies
): Promise<Response> {
  const authenticated =
    await dependencies
      .authenticateRequest(
        request
      );

  if (!authenticated) {
    return noStoreResponse(
      401
    );
  }

  let invocation:
    MediaTranscodeWorkerInvocation;

  try {
    invocation =
      await dependencies
        .readInvocation(
          request
        );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        'REQUEST_TOO_LARGE'
    ) {
      return noStoreResponse(
        413
      );
    }

    return noStoreResponse(
      400
    );
  }

  await dependencies
    .consumeMediaTranscodeWork(
      invocation.mediaId
    );

  return noStoreResponse(
    204
  );
}
