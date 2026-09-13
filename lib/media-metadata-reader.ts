import 'server-only';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  buildMediaIngestPath,
} from '@/lib/media-storage-paths';

import type {
  MediaMetadataRecord,
} from '@/lib/media-metadata-authority';

const MEDIA_COLLECTION =
  'media';

const MEDIA_SCHEMA_VERSION =
  2;

const MEDIA_CONTENT_TYPE =
  'video/mp4';

const MAX_MEDIA_SIZE_BYTES =
  524_288_000;

const MEDIA_UPLOAD_STATUS =
  'UPLOADING';

function isPlainRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isValidTimestampMs(
  value: unknown
): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function parseMediaMetadata(
  value: unknown,
  requestedMediaId: string
): MediaMetadataRecord {
  if (!isPlainRecord(value)) {
    throw new Error(
      'INVALID_MEDIA_METADATA'
    );
  }

  if (
    value.schemaVersion !==
      MEDIA_SCHEMA_VERSION ||
    typeof value.mediaId !==
      'string' ||
    typeof value.ownerId !==
      'string' ||
    typeof value.sourceObject !==
      'string' ||
    typeof value.sourceFileName !==
      'string' ||
    value.contentType !==
      MEDIA_CONTENT_TYPE ||
    typeof value.declaredSizeBytes !==
      'number' ||
    !Number.isSafeInteger(
      value.declaredSizeBytes
    ) ||
    value.declaredSizeBytes <= 0 ||
    value.declaredSizeBytes >
      MAX_MEDIA_SIZE_BYTES ||
    value.status !==
      MEDIA_UPLOAD_STATUS ||
    !isValidTimestampMs(
      value.createdAtMs
    ) ||
    !isValidTimestampMs(
      value.updatedAtMs
    ) ||
    value.mediaId !==
      requestedMediaId
  ) {
    throw new Error(
      'INVALID_MEDIA_METADATA'
    );
  }

  let canonicalSourceObject:
    string;

  try {
    canonicalSourceObject =
      buildMediaIngestPath(
        value.ownerId,
        value.mediaId,
        value.sourceFileName
      );
  } catch {
    throw new Error(
      'INVALID_MEDIA_METADATA'
    );
  }

  if (
    value.sourceObject !==
    canonicalSourceObject
  ) {
    throw new Error(
      'INVALID_MEDIA_METADATA'
    );
  }

  return {
    schemaVersion:
      value.schemaVersion,

    mediaId:
      value.mediaId,

    ownerId:
      value.ownerId,

    sourceObject:
      value.sourceObject,

    sourceFileName:
      value.sourceFileName,

    contentType:
      value.contentType,

    declaredSizeBytes:
      value.declaredSizeBytes,

    status:
      value.status,

    createdAtMs:
      value.createdAtMs,

    updatedAtMs:
      value.updatedAtMs,
  };
}

export async function readMediaMetadataForVerification(
  mediaId: string
): Promise<MediaMetadataRecord> {
  /*
   * Validate the requested identity before
   * using it as authoritative lookup input.
   *
   * Safe placeholder owner/file values are
   * used only to invoke the canonical mediaId
   * validation already owned by the path layer.
   */
  try {
    buildMediaIngestPath(
      'verification',
      mediaId,
      'verification.mp4'
    );
  } catch {
    throw new Error(
      'INVALID_MEDIA_METADATA'
    );
  }

  const snapshot =
    await adminDb
      .collection(MEDIA_COLLECTION)
      .doc(mediaId)
      .get();

  if (!snapshot.exists) {
    throw new Error(
      'MEDIA_NOT_FOUND'
    );
  }

  return parseMediaMetadata(
    snapshot.data(),
    mediaId
  );
}