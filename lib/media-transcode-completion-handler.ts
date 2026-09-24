import 'server-only';

import type {
  MediaTranscodeCompletionExecutionResult,
} from '@/lib/media-transcode-completion-orchestrator';

import type {
  MediaTranscodeCompletionInvocation,
} from '@/lib/media-transcode-completion-pubsub-invocation';

import type {
  MediaTranscodeWorkerRequestAuthenticator,
} from '@/lib/media-transcode-worker-handler';

export type MediaTranscodeCompletionHandlerDependencies = {
  authenticateRequest:
    MediaTranscodeWorkerRequestAuthenticator;

  readInvocation: (
    request: Request
  ) => Promise<MediaTranscodeCompletionInvocation>;

  executeMediaTranscodeCompletion: (
    invocation: MediaTranscodeCompletionInvocation
  ) => Promise<MediaTranscodeCompletionExecutionResult>;
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

export async function handleMediaTranscodeCompletionRequestWithDependencies(
  request: Request,
  dependencies:
    MediaTranscodeCompletionHandlerDependencies
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
    MediaTranscodeCompletionInvocation;

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
    .executeMediaTranscodeCompletion(
      invocation
    );

  return noStoreResponse(
    204
  );
}
