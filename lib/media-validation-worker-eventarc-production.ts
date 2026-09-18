import 'server-only';

import {
  createMediaValidationWorkerEventarcRequestHandlerWithDependencies,
} from '@/lib/media-validation-worker-eventarc-handler';

import {
  consumeMediaValidationWork,
} from '@/lib/media-validation-work-consumer';

import type {
  MediaValidationWorkerRequestAuthenticator,
} from '@/lib/media-validation-worker-handler';

export function createProductionMediaValidationWorkerEventarcRequestHandler(
  authenticateRequest:
    MediaValidationWorkerRequestAuthenticator
) {
  return createMediaValidationWorkerEventarcRequestHandlerWithDependencies(
    {
      authenticateRequest,
      consumeMediaValidationWork,
    }
  );
}