import 'server-only';

import {
  buildMediaIngestPath,
} from '@/lib/media-storage-paths';

import type {
  MediaTranscodeWorkerInvocation,
} from '@/lib/media-transcode-worker-invocation';

const FIRESTORE_DOCUMENT_CREATED_EVENT_TYPE =
  'google.cloud.firestore.document.v1.created';

const MEDIA_TRANSCODE_WORK_DOCUMENT_PREFIX =
  'mediaTranscodeWork/';

type MediaTranscodeWorkerCloudEvent = {
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

function assertMediaId(
  mediaId: string
): void {
  try {
    buildMediaIngestPath(
      'transcode-event',
      mediaId,
      'source.mp4'
    );
  } catch {
    return invalidEvent();
  }
}

export function readMediaTranscodeWorkerEventarcInvocation(
  event: unknown
): MediaTranscodeWorkerInvocation {
  if (
    typeof event !== 'object' ||
    event === null ||
    Array.isArray(event)
  ) {
    return invalidEvent();
  }

  const cloudEvent =
    event as MediaTranscodeWorkerCloudEvent;

  if (
    cloudEvent.type !==
    FIRESTORE_DOCUMENT_CREATED_EVENT_TYPE
  ) {
    return invalidEvent();
  }

  if (
    typeof cloudEvent.document !==
    'string' ||
    !cloudEvent.document.startsWith(
      MEDIA_TRANSCODE_WORK_DOCUMENT_PREFIX
    )
  ) {
    return invalidEvent();
  }

  const mediaId =
    cloudEvent.document.slice(
      MEDIA_TRANSCODE_WORK_DOCUMENT_PREFIX.length
    );

  if (
    mediaId.length === 0 ||
    mediaId.includes('/')
  ) {
    return invalidEvent();
  }

  assertMediaId(
    mediaId
  );

  return {
    mediaId,
  };
}
