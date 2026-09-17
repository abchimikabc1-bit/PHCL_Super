import 'server-only';

import type {
  MediaValidationWorkerInvocation,
} from '@/lib/media-validation-worker-invocation';

const FIRESTORE_DOCUMENT_CREATED_EVENT_TYPE =
  'google.cloud.firestore.document.v1.created';

const MEDIA_VALIDATION_WORK_DOCUMENT_PREFIX =
  'mediaValidationWork/';

type MediaValidationWorkerCloudEvent = {
  specversion?: unknown;
  id?: unknown;
  type?: unknown;
  source?: unknown;
  document?: unknown;
};

function invalidEvent(): never {
  throw new Error(
    'INVALID_EVENT'
  );
}

export function readMediaValidationWorkerEventarcInvocation(
  event: unknown
): MediaValidationWorkerInvocation {
  if (
    typeof event !== 'object' ||
    event === null ||
    Array.isArray(event)
  ) {
    return invalidEvent();
  }

  const cloudEvent =
    event as MediaValidationWorkerCloudEvent;

  if (
    cloudEvent.type !==
    FIRESTORE_DOCUMENT_CREATED_EVENT_TYPE
  ) {
    return invalidEvent();
  }

  if (
    typeof cloudEvent.document !==
    'string'
  ) {
    return invalidEvent();
  }

  if (
    !cloudEvent.document.startsWith(
      MEDIA_VALIDATION_WORK_DOCUMENT_PREFIX
    )
  ) {
    return invalidEvent();
  }

  const mediaId =
    cloudEvent.document.slice(
      MEDIA_VALIDATION_WORK_DOCUMENT_PREFIX.length
    );

  if (
    mediaId.length === 0 ||
    mediaId.includes('/')
  ) {
    return invalidEvent();
  }

  return {
    mediaId,
  };
}