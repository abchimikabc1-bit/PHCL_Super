import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSeekableMediaProbeInputWithDependencies,
  type SeekableMediaProbeInputDependencies,
} from '@/lib/media-seekable-probe-input';

const SOURCE_OBJECT =
  'media/ingest/owner-123/media-123/video.mp4';

const GENERATION =
  '1740000000000000';

test(
  'creates seekable probe input from the exact generation-pinned media stream',
  async () => {
    const readStream = {
      kind: 'generation-pinned-stream',
    };

    const calls: Array<{
      sourceObject: string;
      generation: string;
    }> = [];

    const dependencies:
      SeekableMediaProbeInputDependencies<
        typeof readStream
      > = {
        createGenerationPinnedMediaReadStream(
          sourceObject,
          generation
        ) {
          calls.push({
            sourceObject,
            generation,
          });

          return readStream;
        },

        async materializeReadStream(
          stream
        ) {
          assert.equal(
            stream,
            readStream
          );

          return {
            filePath:
              '/controlled/media-probe/input.mp4',
            cleanup: async () => {},
          };
        },
      };

    const result =
      await createSeekableMediaProbeInputWithDependencies(
        SOURCE_OBJECT,
        GENERATION,
        dependencies
      );

    assert.deepEqual(calls, [
      {
        sourceObject: SOURCE_OBJECT,
        generation: GENERATION,
      },
    ]);

    assert.equal(
      result.filePath,
      '/controlled/media-probe/input.mp4'
    );

    assert.equal(
      typeof result.cleanup,
      'function'
    );
  }
);

test(
  'does not accept caller-authored local file paths',
  () => {
    assert.equal(
      createSeekableMediaProbeInputWithDependencies
        .length,
      3
    );
  }
);