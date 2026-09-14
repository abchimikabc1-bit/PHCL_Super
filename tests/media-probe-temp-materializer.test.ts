import assert from 'node:assert/strict';
import {
  join,
} from 'node:path';
import test from 'node:test';

import {
  materializeMediaProbeReadStreamWithDependencies,
  type MediaProbeTempMaterializerDependencies,
} from '@/lib/media-probe-temp-materializer';

test(
  'materializes a media read stream into a controlled temporary file',
  async () => {
    const readStream = {
      kind: 'media-read-stream',
    };

    const writeStream = {
      kind: 'temporary-write-stream',
    };

    const calls: string[] = [];

    const temporaryDirectory =
      '/controlled/tmp/probe-123';

    const expectedFilePath = join(
      temporaryDirectory,
      'input.mp4'
    );

    const dependencies:
      MediaProbeTempMaterializerDependencies<
        typeof readStream,
        typeof writeStream
      > = {
        async createTemporaryDirectory() {
          calls.push(
            'createTemporaryDirectory'
          );

          return temporaryDirectory;
        },

        createTemporaryWriteStream(
          filePath
        ) {
          calls.push(
            `createTemporaryWriteStream:${filePath}`
          );

          return writeStream;
        },

        async pipeline(
          source,
          destination
        ) {
          assert.equal(
            source,
            readStream
          );

          assert.equal(
            destination,
            writeStream
          );

          calls.push('pipeline');
        },

        async removeTemporaryDirectory(
          directoryPath
        ) {
          calls.push(
            `removeTemporaryDirectory:${directoryPath}`
          );
        },
      };

    const result =
      await materializeMediaProbeReadStreamWithDependencies(
        readStream,
        dependencies
      );

    assert.equal(
      result.filePath,
      expectedFilePath
    );

    assert.deepEqual(calls, [
      'createTemporaryDirectory',
      `createTemporaryWriteStream:${expectedFilePath}`,
      'pipeline',
    ]);

    await result.cleanup();

    assert.deepEqual(calls, [
      'createTemporaryDirectory',
      `createTemporaryWriteStream:${expectedFilePath}`,
      'pipeline',
      `removeTemporaryDirectory:${temporaryDirectory}`,
    ]);
  }
);

test(
  'removes the temporary directory when materialization fails',
  async () => {
    const readStream = {
      kind: 'media-read-stream',
    };

    const removed: string[] = [];

    const temporaryDirectory =
      '/controlled/tmp/probe-failed';

    const dependencies:
      MediaProbeTempMaterializerDependencies<
        typeof readStream,
        object
      > = {
        async createTemporaryDirectory() {
          return temporaryDirectory;
        },

        createTemporaryWriteStream() {
          return {};
        },

        async pipeline() {
          throw new Error(
            'PIPELINE_FAILED'
          );
        },

        async removeTemporaryDirectory(
          directoryPath
        ) {
          removed.push(
            directoryPath
          );
        },
      };

    await assert.rejects(
      () =>
        materializeMediaProbeReadStreamWithDependencies(
          readStream,
          dependencies
        ),
      /PIPELINE_FAILED/
    );

    assert.deepEqual(
      removed,
      [
        temporaryDirectory,
      ]
    );
  }
);