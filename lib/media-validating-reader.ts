import 'server-only';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  buildMediaIngestPath,
} from '@/lib/media-storage-paths';

const MEDIA_COLLECTION =
  'media';

const MEDIA_SCHEMA_VERSION =
  2;

const MEDIA_CONTENT_TYPE =
  'video/mp4';

const MAX_MEDIA_SIZE_BYTES =
  524_288_000;

const MEDIA_VALIDATING_STATUS =
  'VALIDATING' as const;

export type ValidatingMediaRecord = {
  schemaVersion: number;
  mediaId: string;
  ownerId: string;
  sourceObject: string;
  sourceFileName: string;
  contentType: string;
  declaredSizeBytes: number;
  status: typeof MEDIA_VALIDATING_STATUS;
  verifiedGeneration: string;
  createdAtMs: number;
  updatedAtMs: number;
};

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

function assertRequestedMediaId(
  mediaId: string
): void {
  try {
    buildMediaIngestPath(
      'validation',
      mediaId,
      'validation.mp4'
    );
  } catch {
    throw new Error(
      'INVALID_MEDIA_ID'
    );
  }
}

function assertValidatingMedia(
  value: unknown,
  requestedMediaId: string
): asserts value is ValidatingMediaRecord {
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
    value.mediaId !==
      requestedMediaId ||
    typeof value.ownerId !==
      'string' ||
    value.ownerId.length === 0 ||
    value.ownerId.trim() !==
      value.ownerId ||
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
    typeof value.verifiedGeneration !==
      'string' ||
    value.verifiedGeneration.length ===
      0 ||
    value.verifiedGeneration.trim() !==
      value.verifiedGeneration ||
    !isValidTimestampMs(
      value.createdAtMs
    ) ||
    !isValidTimestampMs(
      value.updatedAtMs
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_METADATA'
    );
  }

  if (
    value.status !==
    MEDIA_VALIDATING_STATUS
  ) {
    throw new Error(
      'MEDIA_INVALID_VALIDATING_STATE'
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
}

export async function readValidatingMedia(
  mediaId: string
): Promise<ValidatingMediaRecord> {
  assertRequestedMediaId(
    mediaId
  );

  const snapshot =
    await adminDb
      .collection(
        MEDIA_COLLECTION
      )
      .doc(mediaId)
      .get();

  if (!snapshot.exists) {
    throw new Error(
      'MEDIA_NOT_FOUND'
    );
  }

  const media =
    snapshot.data();

  assertValidatingMedia(
    media,
    mediaId
  );

  return {
    schemaVersion:
      media.schemaVersion,
    mediaId:
      media.mediaId,
    ownerId:
      media.ownerId,
    sourceObject:
      media.sourceObject,
    sourceFileName:
      media.sourceFileName,
    contentType:
      media.contentType,
    declaredSizeBytes:
      media.declaredSizeBytes,
    status:
      media.status,
    verifiedGeneration:
      media.verifiedGeneration,
    createdAtMs:
      media.createdAtMs,
    updatedAtMs:
      media.updatedAtMs,
  };
}