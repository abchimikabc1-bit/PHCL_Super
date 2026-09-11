import {
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import {
  buildMediaIngestPath,
  buildMediaProcessedPath,
  buildMediaQuarantinePath,
  buildMediaThumbnailPath,
  createMediaId,
} from '@/lib/media-storage-paths';

test(
  'media storage paths build canonical server-controlled roots',
  () => {
    assert.equal(
      buildMediaIngestPath(
        'user_123',
        'media_456',
        'video.mp4'
      ),
      'media/ingest/user_123/media_456/video.mp4'
    );

    assert.equal(
      buildMediaProcessedPath(
        'media_456',
        'fallback.mp4'
      ),
      'media/processed/media_456/fallback.mp4'
    );

    assert.equal(
      buildMediaThumbnailPath(
        'media_456',
        'thumbnail.jpg'
      ),
      'media/thumbnails/media_456/thumbnail.jpg'
    );

    assert.equal(
      buildMediaQuarantinePath(
        'media_456',
        'rejected.mp4'
      ),
      'media/quarantine/media_456/rejected.mp4'
    );
  }
);

test(
  'media storage paths reject unsafe identifiers',
  () => {
    const unsafeIds = [
      '',
      '.',
      '..',
      '../user',
      '..\\user',
      '/user',
      'user/path',
      'user\\path',
      'user name',
      'user?name',
      'a'.repeat(129),
    ];

    for (
      const unsafeId
      of unsafeIds
    ) {
      assert.throws(
        () =>
          buildMediaProcessedPath(
            unsafeId,
            'video.mp4'
          )
      );
    }
  }
);

test(
  'media storage paths reject unsafe file names',
  () => {
    const unsafeFileNames = [
      '',
      '.',
      '..',
      '../video.mp4',
      '..\\video.mp4',
      '/video.mp4',
      'folder/video.mp4',
      'folder\\video.mp4',
      'video name.mp4',
      '.hidden.mp4',
      'video?.mp4',
      'a'.repeat(256),
    ];

    for (
      const unsafeFileName
      of unsafeFileNames
    ) {
      assert.throws(
        () =>
          buildMediaIngestPath(
            'user_123',
            'media_456',
            unsafeFileName
          )
      );
    }
  }
);

test(
  'media storage paths accept maximum identifier and file name boundaries',
  () => {
    const maximumId =
      'a'.repeat(128);

    const maximumFileName =
      `a${'b'.repeat(254)}`;

    assert.equal(
      buildMediaProcessedPath(
        maximumId,
        maximumFileName
      ),
      `media/processed/${maximumId}/${maximumFileName}`
    );
  }
);

test(
  'createMediaId returns unique safe identifiers',
  () => {
    const firstMediaId =
      createMediaId();

    const secondMediaId =
      createMediaId();

    assert.notEqual(
      firstMediaId,
      secondMediaId
    );

    assert.match(
      firstMediaId,
      /^[A-Za-z0-9_-]{1,128}$/
    );

    assert.match(
      secondMediaId,
      /^[A-Za-z0-9_-]{1,128}$/
    );
  }
);