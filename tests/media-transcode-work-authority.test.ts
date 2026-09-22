import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMediaTranscodeWork,
} from '@/lib/media-transcode-work-authority';

test(
  'builds canonical durable media transcode work',
  () => {
    assert.deepEqual(
      buildMediaTranscodeWork(
        'media_123',
        'media/ingest/owner_123/media_123/video.mp4',
        '123456789'
      ),
      {
        workId:
          'media_123',

        mediaId:
          'media_123',

        workType:
          'MEDIA_TRANSCODE',

        sourceObject:
          'media/ingest/owner_123/media_123/video.mp4',

        verifiedGeneration:
          '123456789',
      }
    );
  }
);

test(
  'rejects invalid media transcode work identity',
  () => {
    assert.throws(
      () =>
        buildMediaTranscodeWork(
          '../media',
          'media/ingest/owner/media/video.mp4',
          '123456789'
        ),
      /INVALID_MEDIA_TRANSCODE_WORK/
    );

    assert.throws(
      () =>
        buildMediaTranscodeWork(
          'media_123',
          ' media/ingest/owner/media/video.mp4',
          '123456789'
        ),
      /INVALID_MEDIA_TRANSCODE_WORK/
    );

    assert.throws(
      () =>
        buildMediaTranscodeWork(
          'media_123',
          'media/ingest/owner/media/video.mp4',
          ''
        ),
      /INVALID_MEDIA_TRANSCODE_WORK/
    );
  }
);
