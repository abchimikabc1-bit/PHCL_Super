import 'server-only';

import {
  readMediaTranscodeWorkerEventarcRequestInvocation,
} from '@/lib/media-transcode-worker-eventarc-invocation-reader';

import {
  handleMediaTranscodeWorkerRequestWithDependencies,
  type MediaTranscodeWorkerRequestAuthenticator,
} from '@/lib/media-transcode-worker-handler';

import type {
  MediaTranscodeWorkExecutionResult,
} from '@/lib/media-transcode-work-execution-orchestrator';

export type MediaTranscodeWorkerEventarcHandlerDependencies = {
  authenticateRequest:
    MediaTranscodeWorkerRequestAuthenticator;

  consumeMediaTranscodeWork: (
    mediaId: string
  ) => Promise<MediaTranscodeWorkExecutionResult>;
};

export function createMediaTranscodeWorkerEventarcRequestHandlerWithDependencies(
  dependencies:
    MediaTranscodeWorkerEventarcHandlerDependencies
) {
  return (
    request: Request
  ): Promise<Response> =>
    handleMediaTranscodeWorkerRequestWithDependencies(
      request,
      {
        authenticateRequest:
          dependencies.authenticateRequest,

        readInvocation:
          readMediaTranscodeWorkerEventarcRequestInvocation,

        consumeMediaTranscodeWork:
          dependencies.consumeMediaTranscodeWork,
      }
    );
}
