import 'server-only';

import {
  createMediaTranscodeWorkerEventarcRequestHandlerWithDependencies,
} from '@/lib/media-transcode-worker-eventarc-handler';

import {
  consumeMediaTranscodeWork,
} from '@/lib/media-transcode-work-consumer';

import type {
  MediaTranscodeWorkerRequestAuthenticator,
} from '@/lib/media-transcode-worker-handler';

export function createProductionMediaTranscodeWorkerEventarcRequestHandler(
  authenticateRequest:
    MediaTranscodeWorkerRequestAuthenticator
) {
  return createMediaTranscodeWorkerEventarcRequestHandlerWithDependencies(
    {
      authenticateRequest,
      consumeMediaTranscodeWork,
    }
  );
}
