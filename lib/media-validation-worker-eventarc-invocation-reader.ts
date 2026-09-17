import 'server-only';

import {
  readMediaValidationWorkerEventarcInvocation,
} from '@/lib/media-validation-worker-eventarc-adapter';

import {
  readMediaValidationWorkerEventarcRequest,
} from '@/lib/media-validation-worker-eventarc-request';

import type {
  MediaValidationWorkerInvocation,
} from '@/lib/media-validation-worker-invocation';

export async function readMediaValidationWorkerEventarcRequestInvocation(
  request: Request
): Promise<MediaValidationWorkerInvocation> {
  const event =
    readMediaValidationWorkerEventarcRequest(
      request
    );

  return readMediaValidationWorkerEventarcInvocation(
    event
  );
}