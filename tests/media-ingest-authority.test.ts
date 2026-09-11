import {
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import {
  initiateMediaIngest,
} from '@/lib/media-ingest-authority';

test(
  'media ingest authority rejects unsafe owner identity before Firestore access',
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
        initiateMediaIngest({
          ownerId,
          sourceFileName:
            'video.mp4',
        })
      );
    }
  }
);

test(
  'media ingest authority rejects unsafe source file name before Firestore access',
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
        initiateMediaIngest({
          ownerId:
            'user_123',

          sourceFileName,
        })
      );
    }
  }
);