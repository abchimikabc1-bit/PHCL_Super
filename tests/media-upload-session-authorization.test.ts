import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  MediaMetadataRecord,
} from '@/lib/media-metadata-authority';

import {
  authorizeMediaUploadSessionWithDependencies,
  type MediaUploadSessionAuthorizationDependencies,
} from '@/lib/media-upload-session-authorization';

const AUTHENTICATED_UID =
  'media_upload_session_owner_001';

const OTHER_UID =
  'media_upload_session_owner_002';

const MEDIA_ID =
  'media_upload_session_authorization_001';

const SOURCE_FILE_NAME =
  'video.mp4';

const SOURCE_OBJECT =
  `media/ingest/${AUTHENTICATED_UID}/${MEDIA_ID}/${SOURCE_FILE_NAME}`;

const TRUSTED_ORIGIN =
  'https://www.phclsuper.com';

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
  'authenticated owner may create upload session for authoritative media and trusted origin',
  async () => {
    const receivedInputs: unknown[] =
      [];

    const dependencies:
      MediaUploadSessionAuthorizationDependencies = {
        readMediaMetadata: async () =>
          createMedia(),

        createMediaUploadSession: async (
          input
        ) => {
          receivedInputs.push(input);

          return {
            sourceObject:
              SOURCE_OBJECT,
            uploadUri:
              'https://upload.example.test/session',
          };
        },
      };

    const result =
      await authorizeMediaUploadSessionWithDependencies(
        AUTHENTICATED_UID,
        MEDIA_ID,
        TRUSTED_ORIGIN,
        dependencies
      );

    assert.deepEqual(
      receivedInputs,
      [
        {
          ownerId:
            AUTHENTICATED_UID,
          mediaId:
            MEDIA_ID,
          sourceFileName:
            SOURCE_FILE_NAME,
          contentType:
            'video/mp4',
          declaredSizeBytes:
            1024,
          origin:
            TRUSTED_ORIGIN,
        },
      ]
    );

    assert.deepEqual(
      result,
      {
        sourceObject:
          SOURCE_OBJECT,
        uploadUri:
          'https://upload.example.test/session',
      }
    );
  }
);

test(
  'different authenticated user cannot create upload session for media owned by another user',
  async () => {
    let createSessionCallCount =
      0;

    const dependencies:
      MediaUploadSessionAuthorizationDependencies = {
        readMediaMetadata: async () =>
          createMedia(),

        createMediaUploadSession:
          async () => {
            createSessionCallCount +=
              1;

            return {
              sourceObject:
                SOURCE_OBJECT,
              uploadUri:
                'https://upload.example.test/session',
            };
          },
      };

    await assert.rejects(
      authorizeMediaUploadSessionWithDependencies(
        OTHER_UID,
        MEDIA_ID,
        TRUSTED_ORIGIN,
        dependencies
      ),
      /MEDIA_UPLOAD_SESSION_FORBIDDEN/
    );

    assert.equal(
      createSessionCallCount,
      0
    );
  }
);

test(
  'upload authority receives authoritative metadata instead of request values',
  async () => {
    const authoritativeMediaId =
      'media_upload_session_authoritative_001';

    const authoritativeFileName =
      'authoritative-video.mp4';

    const authoritativeSourceObject =
      `media/ingest/${AUTHENTICATED_UID}/${authoritativeMediaId}/${authoritativeFileName}`;

    const media: MediaMetadataRecord = {
      ...createMedia(),
      mediaId:
        authoritativeMediaId,
      sourceObject:
        authoritativeSourceObject,
      sourceFileName:
        authoritativeFileName,
      declaredSizeBytes:
        4096,
    };

    const receivedInputs: unknown[] =
      [];

    const dependencies:
      MediaUploadSessionAuthorizationDependencies = {
        readMediaMetadata: async () =>
          media,

        createMediaUploadSession: async (
          input
        ) => {
          receivedInputs.push(input);

          return {
            sourceObject:
              authoritativeSourceObject,
            uploadUri:
              'https://upload.example.test/session',
          };
        },
      };

    await authorizeMediaUploadSessionWithDependencies(
      AUTHENTICATED_UID,
      MEDIA_ID,
      TRUSTED_ORIGIN,
      dependencies
    );

    assert.deepEqual(
      receivedInputs,
      [
        {
          ownerId:
            AUTHENTICATED_UID,
          mediaId:
            authoritativeMediaId,
          sourceFileName:
            authoritativeFileName,
          contentType:
            'video/mp4',
          declaredSizeBytes:
            4096,
          origin:
            TRUSTED_ORIGIN,
        },
      ]
    );
  }
);