import 'server-only';

import {
  readMediaTranscodeWorkerEventarcInvocation,
} from '@/lib/media-transcode-worker-eventarc-adapter';

import {
  readMediaValidationWorkerEventarcRequest,
} from '@/lib/media-validation-worker-eventarc-request';

import type {
  MediaTranscodeWorkerInvocation,
} from '@/lib/media-transcode-worker-invocation';

export async function readMediaTranscodeWorkerEventarcRequestInvocation(
  request: Request
): Promise<MediaTranscodeWorkerInvocation> {
  const event =
    readMediaValidationWorkerEventarcRequest(
      request
    );

  return readMediaTranscodeWorkerEventarcInvocation(
    event
  );
}
