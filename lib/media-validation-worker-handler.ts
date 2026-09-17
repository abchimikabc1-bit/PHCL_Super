import 'server-only';

import {
  readMediaValidationWorkerInvocation,
  type MediaValidationWorkerInvocation,
} from '@/lib/media-validation-worker-invocation';

import {
  consumeMediaValidationWork,
} from '@/lib/media-validation-work-consumer';

import type {
  MediaValidationWorkExecutionResult,
} from '@/lib/media-validation-work-execution-orchestrator';

export type MediaValidationWorkerHandlerDependencies = {
  authenticateRequest: (
    request: Request
  ) => Promise<boolean>;

  readInvocation: (
    request: Request
  ) => Promise<MediaValidationWorkerInvocation>;

  consumeMediaValidationWork: (
    mediaId: string
  ) => Promise<MediaValidationWorkExecutionResult>;
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

export async function handleMediaValidationWorkerRequestWithDependencies(
  request: Request,
  dependencies:
    MediaValidationWorkerHandlerDependencies
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
    MediaValidationWorkerInvocation;

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
    .consumeMediaValidationWork(
      invocation.mediaId
    );

  return noStoreResponse(
    204
  );
}

export type MediaValidationWorkerRequestAuthenticator =
  (
    request: Request
  ) => Promise<boolean>;

export function createMediaValidationWorkerRequestHandler(
  authenticateRequest:
    MediaValidationWorkerRequestAuthenticator
) {
  const dependencies:
    MediaValidationWorkerHandlerDependencies = {
      authenticateRequest,

      readInvocation:
        readMediaValidationWorkerInvocation,

      consumeMediaValidationWork,
    };

  return (
    request: Request
  ): Promise<Response> =>
    handleMediaValidationWorkerRequestWithDependencies(
      request,
      dependencies
    );
}