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

const DEVELOPMENT_ORIGIN =
  'http://localhost:3000';

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

function createDependencies(
  receivedInputs: unknown[] = []
): MediaUploadSessionAuthorizationDependencies {
  return {
    readMediaMetadata:
      async () =>
        createMedia(),

    createMediaUploadSession:
      async (input) => {
        receivedInputs.push(
          input
        );

        return {
          sourceObject:
            SOURCE_OBJECT,

          uploadUri:
            'https://upload.example.test/session',
        };
      },
  };
}

test(
  'authenticated owner may create upload session for authoritative media and trusted HTTPS origin',
  async () => {
    const receivedInputs:
      unknown[] = [];

    const result =
      await authorizeMediaUploadSessionWithDependencies(
        AUTHENTICATED_UID,
        MEDIA_ID,
        TRUSTED_ORIGIN,
        createDependencies(
          receivedInputs
        )
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
  'authenticated owner may create upload session from exact localhost origin in development',
  async () => {
    const receivedInputs:
      unknown[] = [];

    await authorizeMediaUploadSessionWithDependencies(
      AUTHENTICATED_UID,
      MEDIA_ID,
      DEVELOPMENT_ORIGIN,
      createDependencies(
        receivedInputs
      )
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
            DEVELOPMENT_ORIGIN,
        },
      ]
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
        readMediaMetadata:
          async () =>
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

    const media:
      MediaMetadataRecord = {
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

    const receivedInputs:
      unknown[] = [];

    const dependencies:
      MediaUploadSessionAuthorizationDependencies = {
        readMediaMetadata:
          async () =>
            media,

        createMediaUploadSession:
          async (input) => {
            receivedInputs.push(
              input
            );

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

test(
  'rejects malformed and untrusted upload-session origins',
  async () => {
    const unsafeOrigins = [
      '',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://192.168.100.39:3000',
      'http://www.phclsuper.com',
      'https://user:pass@www.phclsuper.com',
      'https://www.phclsuper.com/',
      'https://www.phclsuper.com/path',
      'https://www.phclsuper.com?query=1',
      'not-a-url',
    ];

    for (
      const unsafeOrigin
      of unsafeOrigins
    ) {
      await assert.rejects(
        authorizeMediaUploadSessionWithDependencies(
          AUTHENTICATED_UID,
          MEDIA_ID,
          unsafeOrigin,
          createDependencies()
        ),
        /INVALID_MEDIA_UPLOAD_SESSION_ORIGIN/
      );
    }
  }
);
