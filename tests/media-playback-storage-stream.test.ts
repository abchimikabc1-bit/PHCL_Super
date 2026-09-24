import assert from 'node:assert/strict';
import {
  Readable,
} from 'node:stream';
import test from 'node:test';

import {
  createMediaPlaybackStorageStreamWithDependencies,
  type MediaPlaybackStorageStreamDependencies,
} from '@/lib/media-playback-storage-stream';

const OBJECT_PATH =
  'media/processed/media-123/video-1080p.mp4';

function createDependencies(
  size: unknown = '1000'
): {
  dependencies:
    MediaPlaybackStorageStreamDependencies;
  ranges:
    Array<
      | {
          start: number;
          end: number;
        }
      | null
    >;
} {
  const ranges:
    Array<
      | {
          start: number;
          end: number;
        }
      | null
    > = [];

  return {
    ranges,
    dependencies: {
      readObjectMetadata:
        async () => ({
          exists:
            true,
          size,
        }),
      createObjectReadStream:
        (_objectPath, range) => {
          ranges.push(range);

          return Readable.from([
            Buffer.from('data'),
          ]);
        },
    },
  };
}

test(
  'creates a complete private object stream',
  async () => {
    const {
      dependencies,
      ranges,
    } =
      createDependencies();

    const result =
      await createMediaPlaybackStorageStreamWithDependencies(
        {
          objectPath:
            OBJECT_PATH,
          contentType:
            'video/mp4',
          allowByteRanges:
            true,
          method:
            'GET',
          rangeHeader:
            null,
        },
        dependencies
      );

    assert.equal(
      result.status,
      200
    );
    assert.equal(
      result.headers['Content-Length'],
      '1000'
    );
    assert.equal(
      result.headers['Accept-Ranges'],
      'bytes'
    );
    assert.ok(result.body);
    assert.deepEqual(
      ranges,
      [null]
    );
  }
);

test(
  'creates exact explicit open ended and suffix byte ranges',
  async () => {
    const cases = [
      {
        header:
          'bytes=100-199',
        expectedRange: {
          start: 100,
          end: 199,
        },
        expectedContentRange:
          'bytes 100-199/1000',
        expectedLength:
          '100',
      },
      {
        header:
          'bytes=900-',
        expectedRange: {
          start: 900,
          end: 999,
        },
        expectedContentRange:
          'bytes 900-999/1000',
        expectedLength:
          '100',
      },
      {
        header:
          'bytes=-50',
        expectedRange: {
          start: 950,
          end: 999,
        },
        expectedContentRange:
          'bytes 950-999/1000',
        expectedLength:
          '50',
      },
    ];

    for (
      const testCase
      of cases
    ) {
      const {
        dependencies,
        ranges,
      } =
        createDependencies();

      const result =
        await createMediaPlaybackStorageStreamWithDependencies(
          {
            objectPath:
              OBJECT_PATH,
            contentType:
              'video/mp4',
            allowByteRanges:
              true,
            method:
              'GET',
            rangeHeader:
              testCase.header,
          },
          dependencies
        );

      assert.equal(
        result.status,
        206
      );
      assert.equal(
        result.headers['Content-Range'],
        testCase.expectedContentRange
      );
      assert.equal(
        result.headers['Content-Length'],
        testCase.expectedLength
      );
      assert.deepEqual(
        ranges,
        [testCase.expectedRange]
      );
    }
  }
);

test(
  'returns 416 without opening storage for invalid ranges',
  async () => {
    const invalidRanges = [
      'bytes=1000-',
      'bytes=200-100',
      'bytes=-0',
      'bytes=0-1,3-4',
      'items=0-5',
    ];

    for (
      const rangeHeader
      of invalidRanges
    ) {
      const {
        dependencies,
        ranges,
      } =
        createDependencies();

      const result =
        await createMediaPlaybackStorageStreamWithDependencies(
          {
            objectPath:
              OBJECT_PATH,
            contentType:
              'video/mp4',
            allowByteRanges:
              true,
            method:
              'GET',
            rangeHeader,
          },
          dependencies
        );

      assert.equal(
        result.status,
        416
      );
      assert.equal(
        result.headers['Content-Range'],
        'bytes */1000'
      );
      assert.equal(
        result.body,
        null
      );
      assert.deepEqual(
        ranges,
        []
      );
    }
  }
);

test(
  'serves HEAD metadata without opening a storage stream',
  async () => {
    const {
      dependencies,
      ranges,
    } =
      createDependencies();

    const result =
      await createMediaPlaybackStorageStreamWithDependencies(
        {
          objectPath:
            OBJECT_PATH,
          contentType:
            'video/mp4',
          allowByteRanges:
            true,
          method:
            'HEAD',
          rangeHeader:
            'bytes=0-99',
        },
        dependencies
      );

    assert.equal(
      result.status,
      206
    );
    assert.equal(
      result.body,
      null
    );
    assert.deepEqual(
      ranges,
      []
    );
  }
);

test(
  'rejects ranges for manifests and rejects invalid storage evidence',
  async () => {
    const {
      dependencies,
    } =
      createDependencies();

    await assert.rejects(
      createMediaPlaybackStorageStreamWithDependencies(
        {
          objectPath:
            'media/processed/media-123/master.m3u8',
          contentType:
            'application/vnd.apple.mpegurl',
          allowByteRanges:
            false,
          method:
            'GET',
          rangeHeader:
            'bytes=0-10',
        },
        dependencies
      ),
      /MEDIA_PLAYBACK_RANGE_NOT_ALLOWED/
    );

    const missingDependencies =
      createDependencies()
        .dependencies;

    missingDependencies.readObjectMetadata =
      async () => ({
        exists:
          false,
        size:
          null,
      });

    await assert.rejects(
      createMediaPlaybackStorageStreamWithDependencies(
        {
          objectPath:
            OBJECT_PATH,
          contentType:
            'video/mp4',
          allowByteRanges:
            true,
          method:
            'GET',
          rangeHeader:
            null,
        },
        missingDependencies
      ),
      /MEDIA_PLAYBACK_OBJECT_NOT_FOUND/
    );
  }
);
