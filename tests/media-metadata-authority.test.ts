import {
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import {
  createMediaMetadata,
} from '@/lib/media-metadata-authority';

test(
  'media metadata authority rejects unsafe owner identity before Firestore access',
  async () => {
    await assert.rejects(
      createMediaMetadata({
        ownerId:
          '../user',

        mediaId:
          'media_123',

        sourceFileName:
          'video.mp4',

        contentType:
          'video/mp4',

        declaredSizeBytes:
          1024,
      }),
      /userId is invalid/
    );
  }
);

test(
  'media metadata authority rejects unsafe media identity before Firestore access',
  async () => {
    await assert.rejects(
      createMediaMetadata({
        ownerId:
          'user_123',

        mediaId:
          '../media',

        sourceFileName:
          'video.mp4',

        contentType:
          'video/mp4',

        declaredSizeBytes:
          1024,
      }),
      /mediaId is invalid/
    );
  }
);

test(
  'media metadata authority rejects unsafe source file name before Firestore access',
  async () => {
    await assert.rejects(
      createMediaMetadata({
        ownerId:
          'user_123',

        mediaId:
          'media_123',

        sourceFileName:
          '../video.mp4',

        contentType:
          'video/mp4',

        declaredSizeBytes:
          1024,
      }),
      /Media file name is invalid/
    );
  }
);

test(
  'media metadata authority rejects non-canonical ownership metadata before Firestore access',
  async () => {
    const unsafeInputs = [
      {
        ownerId:
          ' user_123',

        mediaId:
          'media_123',

        sourceFileName:
          'video.mp4',

        contentType:
          'video/mp4',

        declaredSizeBytes:
          1024,
      },
      {
        ownerId:
          'user_123 ',

        mediaId:
          'media_123',

        sourceFileName:
          'video.mp4',

        contentType:
          'video/mp4',

        declaredSizeBytes:
          1024,
      },
      {
        ownerId:
          'user_123',

        mediaId:
          ' media_123',

        sourceFileName:
          'video.mp4',

        contentType:
          'video/mp4',

        declaredSizeBytes:
          1024,
      },
      {
        ownerId:
          'user_123',

        mediaId:
          'media_123 ',

        sourceFileName:
          'video.mp4',

        contentType:
          'video/mp4',

        declaredSizeBytes:
          1024,
      },
      {
        ownerId:
          'user_123',

        mediaId:
          'media_123',

        sourceFileName:
          ' video.mp4',

        contentType:
          'video/mp4',

        declaredSizeBytes:
          1024,
      },
      {
        ownerId:
          'user_123',

        mediaId:
          'media_123',

        sourceFileName:
          'video.mp4 ',

        contentType:
          'video/mp4',

        declaredSizeBytes:
          1024,
      },
    ];

    for (
      const input
      of unsafeInputs
    ) {
      await assert.rejects(
        createMediaMetadata(
          input
        )
      );
    }
  }
);