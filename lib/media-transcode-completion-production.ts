import 'server-only';

import {
  handleMediaTranscodeCompletionRequestWithDependencies,
} from '@/lib/media-transcode-completion-handler';

import {
  executeMediaTranscodeCompletion,
} from '@/lib/media-transcode-completion-orchestrator';

import {
  readMediaTranscodeCompletionPubSubInvocation,
} from '@/lib/media-transcode-completion-pubsub-invocation';

import type {
  MediaTranscodeWorkerRequestAuthenticator,
} from '@/lib/media-transcode-worker-handler';

export function createProductionMediaTranscodeCompletionRequestHandler(
  authenticateRequest:
    MediaTranscodeWorkerRequestAuthenticator
) {
  return (
    request: Request
  ): Promise<Response> =>
    handleMediaTranscodeCompletionRequestWithDependencies(
      request,
      {
        authenticateRequest,

        readInvocation:
          readMediaTranscodeCompletionPubSubInvocation,

        executeMediaTranscodeCompletion,
      }
    );
}
