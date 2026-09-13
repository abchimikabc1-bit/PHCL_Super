import {
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import {
  verifyUploadedMediaObjectWithDependencies,
} from '@/lib/media-upload-verifier';

const authoritativeMedia = {
  schemaVersion: 2,
  mediaId: 'media_123',
  ownerId: 'user_123',
  sourceObject:
    'media/ingest/user_123/media_123/video.mp4',
  sourceFileName: 'video.mp4',
  contentType: 'video/mp4',
  declaredSizeBytes: 1_048_576,
  status: 'UPLOADING',
  createdAtMs: 1,
  updatedAtMs: 1,
} as const;

test(
  'verifies an uploaded media object using authoritative metadata and storage inspection',
  async () => {
    const result =
      await verifyUploadedMediaObjectWithDependencies(
        'media_123',
        {
          readMediaMetadata:
            async () =>
              authoritativeMedia,

          inspectMediaIngestObject:
            async (
              userId,
              mediaId,
              fileName
            ) => ({
              path:
                `media/ingest/${userId}/${mediaId}/${fileName}`,
              exists: true,
              size: 1_048_576,
              contentType: 'video/mp4',
              generation: '123456789',
            }),
        }
      );

    assert.deepEqual(
      result,
      {
        verified: true,
        mediaId: 'media_123',
        sourceObject:
          'media/ingest/user_123/media_123/video.mp4',
        generation: '123456789',
      }
    );
  }
);

test(
  'returns storage verification failure without mutating authoritative metadata',
  async () => {
    const result =
      await verifyUploadedMediaObjectWithDependencies(
        'media_123',
        {
          readMediaMetadata:
            async () =>
              authoritativeMedia,

          inspectMediaIngestObject:
            async () => ({
              path:
                authoritativeMedia.sourceObject,
              exists: true,
              size: 1_048_575,
              contentType: 'video/mp4',
              generation: '123456789',
            }),
        }
      );

    assert.deepEqual(
      result,
      {
        verified: false,
        reason: 'SIZE_MISMATCH',
      }
    );
  }
);