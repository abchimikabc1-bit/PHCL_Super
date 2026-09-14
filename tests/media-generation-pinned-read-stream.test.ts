import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createGenerationPinnedMediaReadStreamWithDependencies,
} from '@/lib/media-generation-pinned-read-stream';

test(
  'creates a read stream from the exact generation-pinned media object',
  () => {
    const expectedStream = {
      kind: 'readable',
    };

    const calls: Array<{
      sourceObject: string;
      generation: string;
    }> = [];

    const actual =
      createGenerationPinnedMediaReadStreamWithDependencies(
        'media/ingest/user-1/media-1/video.mp4',
        '1740000000000000',
        {
          createGenerationPinnedMediaObject(
            sourceObject,
            generation
          ) {
            calls.push({
              sourceObject,
              generation,
            });

            return {
              createReadStream() {
                return expectedStream;
              },
            };
          },
        }
      );

    assert.equal(
      actual,
      expectedStream
    );

    assert.deepEqual(
      calls,
      [
        {
          sourceObject:
            'media/ingest/user-1/media-1/video.mp4',
          generation:
            '1740000000000000',
        },
      ]
    );
  }
);

test(
  'does not add a byte range or disable integrity validation',
  () => {
    let receivedArguments:
      | unknown[]
      | null = null;

    const expectedStream = {
      kind: 'readable',
    };

    const actual =
      createGenerationPinnedMediaReadStreamWithDependencies(
        'media/ingest/user-1/media-1/video.mp4',
        '1740000000000000',
        {
          createGenerationPinnedMediaObject() {
            return {
              createReadStream(
                ...args: unknown[]
              ) {
                receivedArguments =
                  args;

                return expectedStream;
              },
            };
          },
        }
      );

    assert.equal(
      actual,
      expectedStream
    );

    assert.deepEqual(
      receivedArguments,
      []
    );
  }
);