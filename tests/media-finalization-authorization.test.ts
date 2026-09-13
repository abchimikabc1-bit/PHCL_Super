import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  MediaMetadataRecord,
} from '@/lib/media-metadata-authority';

import {
  authorizeAndFinalizeMediaUploadWithDependencies,
  type MediaFinalizationAuthorizationDependencies,
} from '@/lib/media-finalization-authorization';

const AUTHENTICATED_UID =
  'media_finalization_owner_001';

const OTHER_UID =
  'media_finalization_owner_002';

const MEDIA_ID =
  'media_finalization_authorization_001';

const SOURCE_FILE_NAME =
  'video.mp4';

const SOURCE_OBJECT =
  `media/ingest/${AUTHENTICATED_UID}/${MEDIA_ID}/${SOURCE_FILE_NAME}`;

function createMedia(): MediaMetadataRecord {
  return {
    schemaVersion: 2,
    mediaId: MEDIA_ID,
    ownerId: AUTHENTICATED_UID,
    sourceObject: SOURCE_OBJECT,
    sourceFileName: SOURCE_FILE_NAME,
    contentType: 'video/mp4',
    declaredSizeBytes: 1024,
    status: 'UPLOADING',
    createdAtMs: 1,
    updatedAtMs: 1,
  };
}

test(
  'authenticated owner may finalize authoritative media',
  async () => {
    const finalizedMediaIds: string[] = [];

    const dependencies: MediaFinalizationAuthorizationDependencies = {
      readMediaMetadata: async () =>
        createMedia(),

      finalizeMediaUpload: async (
        mediaId: string
      ) => {
        finalizedMediaIds.push(mediaId);

        return {
          mediaId,
          status: 'VALIDATING',
          verifiedGeneration:
            '123456789',
        };
      },
    };

    const result =
      await authorizeAndFinalizeMediaUploadWithDependencies(
        AUTHENTICATED_UID,
        MEDIA_ID,
        dependencies
      );

    assert.deepEqual(
      finalizedMediaIds,
      [MEDIA_ID]
    );

    assert.deepEqual(result, {
      mediaId: MEDIA_ID,
      status: 'VALIDATING',
      verifiedGeneration:
        '123456789',
    });
  }
);

test(
  'different authenticated user cannot finalize media owned by another user',
  async () => {
    let finalizeCallCount = 0;

    const dependencies: MediaFinalizationAuthorizationDependencies = {
      readMediaMetadata: async () =>
        createMedia(),

      finalizeMediaUpload: async () => {
        finalizeCallCount += 1;

        return {
          mediaId: MEDIA_ID,
          status: 'VALIDATING',
          verifiedGeneration:
            '123456789',
        };
      },
    };

    await assert.rejects(
      authorizeAndFinalizeMediaUploadWithDependencies(
        OTHER_UID,
        MEDIA_ID,
        dependencies
      ),
      /MEDIA_FINALIZATION_FORBIDDEN/
    );

    assert.equal(
      finalizeCallCount,
      0
    );
  }
);

test(
  'finalizer receives authoritative mediaId from metadata',
  async () => {
    const authoritativeMediaId =
      'media_finalization_authoritative_001';

    const media: MediaMetadataRecord = {
      ...createMedia(),
      mediaId:
        authoritativeMediaId,
      sourceObject:
        `media/ingest/${AUTHENTICATED_UID}/${authoritativeMediaId}/${SOURCE_FILE_NAME}`,
    };

    const finalizedMediaIds: string[] =
      [];

    const dependencies: MediaFinalizationAuthorizationDependencies = {
      readMediaMetadata: async () =>
        media,

      finalizeMediaUpload: async (
        mediaId: string
      ) => {
        finalizedMediaIds.push(mediaId);

        return {
          mediaId,
          status: 'VALIDATING',
          verifiedGeneration:
            '123456789',
        };
      },
    };

    await authorizeAndFinalizeMediaUploadWithDependencies(
      AUTHENTICATED_UID,
      MEDIA_ID,
      dependencies
    );

    assert.deepEqual(
      finalizedMediaIds,
      [authoritativeMediaId]
    );
  }
);