import {
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import {
  inspectMediaIngestObject,
  inspectMediaProcessedObject,
  inspectMediaQuarantineObject,
  inspectMediaThumbnailObject,
} from '@/lib/media-storage-authority';

test(
  'media storage authority rejects unsafe canonical path inputs before storage access',
  () => {
    assert.throws(
      () =>
        inspectMediaIngestObject(
          '../user',
          'media_123',
          'video.mp4'
        )
    );

    assert.throws(
      () =>
        inspectMediaProcessedObject(
          '../media',
          'fallback.mp4'
        )
    );

    assert.throws(
      () =>
        inspectMediaThumbnailObject(
          'media_123',
          '../thumbnail.jpg'
        )
    );

    assert.throws(
      () =>
        inspectMediaQuarantineObject(
          'media_123',
          '..\\rejected.mp4'
        )
    );
  }
);

test(
  'media storage authority reports missing canonical objects without writing',
  async () => {
    const mediaId =
      `missing_${Date.now()}`;

    const result =
      await inspectMediaProcessedObject(
        mediaId,
        'fallback.mp4'
      );

    assert.equal(
      result.path,
      `media/processed/${mediaId}/fallback.mp4`
    );

    assert.equal(
      result.exists,
      false
    );

    assert.equal(
      result.size,
      null
    );

    assert.equal(
      result.contentType,
      null
    );

    assert.equal(
      result.generation,
      null
    );
  }
);