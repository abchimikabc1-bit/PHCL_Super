import {
  mock,
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import {
  adminStorageBucket,
} from '@/lib/firebase-admin';

import {
  createMediaUploadSession,
} from '@/lib/media-upload-authority';

test(
  'media upload authority rejects unsafe owner identity before Storage access',
  async () => {
    const unsafeOwnerIds = [
      '../user',
      'user/name',
      ' user_123',
      'user_123 ',
      '',
    ];

    for (
      const ownerId
      of unsafeOwnerIds
    ) {
      await assert.rejects(
        createMediaUploadSession({
          ownerId,
          mediaId:
            'media_123',
          sourceFileName:
            'video.mp4',
          contentType:
            'video/mp4',
        })
      );
    }
  }
);

test(
  'media upload authority rejects unsafe media identity before Storage access',
  async () => {
    const unsafeMediaIds = [
      '../media',
      'media/id',
      ' media_123',
      'media_123 ',
      '',
    ];

    for (
      const mediaId
      of unsafeMediaIds
    ) {
      await assert.rejects(
        createMediaUploadSession({
          ownerId:
            'user_123',
          mediaId,
          sourceFileName:
            'video.mp4',
          contentType:
            'video/mp4',
        })
      );
    }
  }
);

test(
  'media upload authority rejects unsafe source file name before Storage access',
  async () => {
    const unsafeFileNames = [
      '../video.mp4',
      'folder/video.mp4',
      ' video.mp4',
      'video.mp4 ',
      '',
    ];

    for (
      const sourceFileName
      of unsafeFileNames
    ) {
      await assert.rejects(
        createMediaUploadSession({
          ownerId:
            'user_123',
          mediaId:
            'media_123',
          sourceFileName,
          contentType:
            'video/mp4',
        })
      );
    }
  }
);

test(
  'media upload authority rejects unsupported content type before Storage access',
  async () => {
    const unsupportedContentTypes = [
      '',
      'application/octet-stream',
      'image/jpeg',
      'video/webm',
      'video/quicktime',
      ' video/mp4',
      'video/mp4 ',
      'VIDEO/MP4',
    ];

    for (
      const contentType
      of unsupportedContentTypes
    ) {
      await assert.rejects(
        createMediaUploadSession({
          ownerId:
            'user_123',
          mediaId:
            'media_123',
          sourceFileName:
            'video.mp4',
          contentType,
        })
      );
    }
  }
);

test(
  'media upload authority creates a canonical create-only resumable session',
  async () => {
    const expectedSourceObject =
      'media/ingest/user_123/media_123/video.mp4';

    let receivedOptions:
      unknown;

    const createResumableUpload =
      mock.fn(
        async (
          options: unknown
        ) => {
          receivedOptions =
            options;

          return [
            'https://upload.example.test/session',
          ];
        }
      );

    const fileMock =
      mock.method(
        adminStorageBucket,
        'file',
        (
          path: string
        ) => {
          assert.equal(
            path,
            expectedSourceObject
          );

          return {
            createResumableUpload,
          } as never;
        }
      );

    try {
      const result =
        await createMediaUploadSession({
          ownerId:
            'user_123',
          mediaId:
            'media_123',
          sourceFileName:
            'video.mp4',
          contentType:
            'video/mp4',
        });

      assert.deepEqual(
        receivedOptions,
        {
          metadata: {
            contentType:
              'video/mp4',
          },
          preconditionOpts: {
            ifGenerationMatch: 0,
          },
        }
      );

      assert.equal(
        createResumableUpload.mock.callCount(),
        1
      );

      assert.deepEqual(
        result,
        {
          sourceObject:
            expectedSourceObject,
          uploadUri:
            'https://upload.example.test/session',
        }
      );
    } finally {
      fileMock.mock.restore();
    }
  }
);