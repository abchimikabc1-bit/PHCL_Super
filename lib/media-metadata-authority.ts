import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase-admin';
import { buildMediaIngestPath } from '@/lib/media-storage-paths';

const MEDIA_COLLECTION = 'media';

const MEDIA_SCHEMA_VERSION = 2;

const MEDIA_CONTENT_TYPE = 'video/mp4';

const MAX_MEDIA_SIZE_BYTES = 524_288_000;

export const MEDIA_INITIAL_STATUS = 'UPLOADING' as const;

export type MediaInitialStatus =
  typeof MEDIA_INITIAL_STATUS;

export type MediaMetadataRecord = {
  schemaVersion: number;
  mediaId: string;
  ownerId: string;
  sourceObject: string;
  sourceFileName: string;
  contentType: string;
  declaredSizeBytes: number;
  status: MediaInitialStatus;
  createdAtMs: number;
  updatedAtMs: number;
};

export type CreateMediaMetadataInput = {
  ownerId: string;
  mediaId: string;
  sourceFileName: string;
  contentType: string;
  declaredSizeBytes: number;
};

export async function createMediaMetadata(
  input: CreateMediaMetadataInput
): Promise<MediaMetadataRecord> {
  const sourceObject = buildMediaIngestPath(
    input.ownerId,
    input.mediaId,
    input.sourceFileName
  );

  if (input.contentType !== MEDIA_CONTENT_TYPE) {
    throw new Error(
      'Media content type is unsupported.'
    );
  }

  if (
    !Number.isSafeInteger(input.declaredSizeBytes) ||
    input.declaredSizeBytes <= 0 ||
    input.declaredSizeBytes > MAX_MEDIA_SIZE_BYTES
  ) {
    throw new Error(
      'Media declared size is invalid.'
    );
  }

  const now = Date.now();

  const record: MediaMetadataRecord = {
    schemaVersion: MEDIA_SCHEMA_VERSION,
    mediaId: input.mediaId,
    ownerId: input.ownerId,
    sourceObject,
    sourceFileName: input.sourceFileName,
    contentType: input.contentType,
    declaredSizeBytes: input.declaredSizeBytes,
    status: MEDIA_INITIAL_STATUS,
    createdAtMs: now,
    updatedAtMs: now,
  };

  const mediaRef = adminDb
    .collection(MEDIA_COLLECTION)
    .doc(input.mediaId);

  await adminDb.runTransaction(
    async (transaction) => {
      const existing =
        await transaction.get(mediaRef);

      if (existing.exists) {
        throw new Error(
          'MEDIA_ALREADY_EXISTS'
        );
      }

      transaction.create(mediaRef, {
        ...record,
        serverCreatedAt:
          FieldValue.serverTimestamp(),
        serverUpdatedAt:
          FieldValue.serverTimestamp(),
      });
    }
  );

  return record;
}