import 'server-only';

import {
  readMediaValidationWorkerEventarcRequestInvocation,
} from '@/lib/media-validation-worker-eventarc-invocation-reader';

import {
  handleMediaValidationWorkerRequestWithDependencies,
  type MediaValidationWorkerRequestAuthenticator,
} from '@/lib/media-validation-worker-handler';

import type {
  MediaValidationWorkExecutionResult,
} from '@/lib/media-validation-work-execution-orchestrator';

export type MediaValidationWorkerEventarcHandlerDependencies = {
  authenticateRequest:
    MediaValidationWorkerRequestAuthenticator;

  consumeMediaValidationWork: (
    mediaId: string
  ) => Promise<MediaValidationWorkExecutionResult>;
};

export function createMediaValidationWorkerEventarcRequestHandlerWithDependencies(
  dependencies:
    MediaValidationWorkerEventarcHandlerDependencies
) {
  return (
    request: Request
  ): Promise<Response> =>
    handleMediaValidationWorkerRequestWithDependencies(
      request,
      {
        authenticateRequest:
          dependencies.authenticateRequest,

        readInvocation:
          readMediaValidationWorkerEventarcRequestInvocation,

        consumeMediaValidationWork:
          dependencies.consumeMediaValidationWork,
      }
    );
}