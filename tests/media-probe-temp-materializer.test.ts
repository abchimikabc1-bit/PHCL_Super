import assert from 'node:assert/strict';

import {
  join,
} from 'node:path';

import {
  Readable,
  Writable,
} from 'node:stream';

import {
  pipeline as pipelineStreams,
} from 'node:stream/promises';

import test from 'node:test';

import {
  createMediaProbeByteLimitTransform,
  materializeMediaProbeReadStreamWithDependencies,
  type MediaProbeTempMaterializerDependencies,
} from '@/lib/media-probe-temp-materializer';

type ControlledAbortSignal = {
  aborted: boolean;
};

type ControlledAbortController = {
  signal: ControlledAbortSignal;
  abort(): void;
};

function createControlledAbortController(): ControlledAbortController {
  const signal: ControlledAbortSignal = {
    aborted: false,
  };

  return {
    signal,

    abort() {
      signal.aborted = true;
    },
  };
}

test(
  'materializes the entire source through the byte limiter under one controlled pipeline',
  async () => {
    const readStream = {
      kind: 'media-read-stream',
    };

    const byteLimitTransform = {
      kind: 'byte-limit-transform',
    };

    const writeStream = {
      kind: 'temporary-write-stream',
    };

    const abortController =
      createControlledAbortController();

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
        typeof byteLimitTransform,
        typeof writeStream,
        ControlledAbortSignal
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

        createByteLimitTransform(
          maxBytes
        ) {
          assert.equal(
            maxBytes,
            1024
          );

          calls.push(
            `createByteLimitTransform:${maxBytes}`
          );

          return byteLimitTransform;
        },

        createAbortController() {
          calls.push(
            'createAbortController'
          );

          return abortController;
        },

        scheduleAbort(
          controller,
          timeoutMs
        ) {
          assert.equal(
            controller,
            abortController
          );

          assert.equal(
            timeoutMs,
            5000
          );

          calls.push(
            `scheduleAbort:${timeoutMs}`
          );

          return {
            kind: 'timer',
          };
        },

        clearScheduledAbort(timer) {
          assert.deepEqual(
            timer,
            {
              kind: 'timer',
            }
          );

          calls.push(
            'clearScheduledAbort'
          );
        },

        async pipeline(
          source,
          limiter,
          destination,
          options
        ) {
          assert.equal(
            source,
            readStream
          );

          assert.equal(
            limiter,
            byteLimitTransform
          );

          assert.equal(
            destination,
            writeStream
          );

          assert.equal(
            options.signal,
            abortController.signal
          );

          calls.push(
            'pipeline'
          );
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
        {
          maxBytes: 1024,
          timeoutMs: 5000,
        },
        dependencies
      );

    assert.equal(
      result.filePath,
      expectedFilePath
    );

    assert.deepEqual(calls, [
      'createTemporaryDirectory',
      `createTemporaryWriteStream:${expectedFilePath}`,
      'createByteLimitTransform:1024',
      'createAbortController',
      'scheduleAbort:5000',
      'pipeline',
      'clearScheduledAbort',
    ]);

    await result.cleanup();

    assert.deepEqual(calls, [
      'createTemporaryDirectory',
      `createTemporaryWriteStream:${expectedFilePath}`,
      'createByteLimitTransform:1024',
      'createAbortController',
      'scheduleAbort:5000',
      'pipeline',
      'clearScheduledAbort',
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

    const byteLimitTransform = {
      kind: 'byte-limit-transform',
    };

    const abortController =
      createControlledAbortController();

    const removed: string[] = [];

    const temporaryDirectory =
      '/controlled/tmp/probe-failed';

    let abortTimerCleared = false;

    const dependencies:
      MediaProbeTempMaterializerDependencies<
        typeof readStream,
        typeof byteLimitTransform,
        object,
        ControlledAbortSignal
      > = {
        async createTemporaryDirectory() {
          return temporaryDirectory;
        },

        createTemporaryWriteStream() {
          return {};
        },

        createByteLimitTransform() {
          return byteLimitTransform;
        },

        createAbortController() {
          return abortController;
        },

        scheduleAbort() {
          return {
            kind: 'timer',
          };
        },

        clearScheduledAbort() {
          abortTimerCleared = true;
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
          {
            maxBytes: 1024,
            timeoutMs: 5000,
          },
          dependencies
        ),
      /PIPELINE_FAILED/
    );

    assert.equal(
      abortTimerCleared,
      true
    );

    assert.deepEqual(
      removed,
      [
        temporaryDirectory,
      ]
    );
  }
);

test(
  'passes the source limiter destination and abort signal through one pipeline',
  async () => {
    const readStream = {
      kind: 'media-read-stream',
    };

    const byteLimitTransform = {
      kind: 'byte-limit-transform',
    };

    const writeStream = {
      kind: 'temporary-write-stream',
    };

    const abortController =
      createControlledAbortController();

    let scheduledTimeoutMs:
      number | null = null;

    let receivedSignal:
      ControlledAbortSignal | null = null;

    let receivedSource:
      typeof readStream | null = null;

    let receivedLimiter:
      typeof byteLimitTransform | null = null;

    let receivedDestination:
      typeof writeStream | null = null;

    let cleared = false;

    const dependencies:
      MediaProbeTempMaterializerDependencies<
        typeof readStream,
        typeof byteLimitTransform,
        typeof writeStream,
        ControlledAbortSignal
      > = {
        async createTemporaryDirectory() {
          return '/controlled/tmp/probe-deadline';
        },

        createTemporaryWriteStream() {
          return writeStream;
        },

        createByteLimitTransform() {
          return byteLimitTransform;
        },

        createAbortController() {
          return abortController;
        },

        scheduleAbort(
          controller,
          timeoutMs
        ) {
          assert.equal(
            controller,
            abortController
          );

          scheduledTimeoutMs =
            timeoutMs;

          return {
            kind: 'timer',
          };
        },

        clearScheduledAbort() {
          cleared = true;
        },

        async pipeline(
          source,
          limiter,
          destination,
          options
        ) {
          receivedSource =
            source;

          receivedLimiter =
            limiter;

          receivedDestination =
            destination;

          receivedSignal =
            options.signal;
        },

        async removeTemporaryDirectory() {},
      };

    const result =
      await materializeMediaProbeReadStreamWithDependencies(
        readStream,
        {
          maxBytes: 2048,
          timeoutMs: 7000,
        },
        dependencies
      );

    assert.equal(
      scheduledTimeoutMs,
      7000
    );

    assert.equal(
      receivedSource,
      readStream
    );

    assert.equal(
      receivedLimiter,
      byteLimitTransform
    );

    assert.equal(
      receivedDestination,
      writeStream
    );

    assert.equal(
      receivedSignal,
      abortController.signal
    );

    assert.equal(
      cleared,
      true
    );

    await result.cleanup();
  }
);

test(
  'applies the configured byte ceiling to the limiter before materialization',
  async () => {
    const readStream = {
      kind: 'media-read-stream',
    };

    const byteLimitTransform = {
      kind: 'byte-limit-transform',
    };

    const abortController =
      createControlledAbortController();

    let receivedMaxBytes:
      number | null = null;

    const dependencies:
      MediaProbeTempMaterializerDependencies<
        typeof readStream,
        typeof byteLimitTransform,
        object,
        ControlledAbortSignal
      > = {
        async createTemporaryDirectory() {
          return '/controlled/tmp/probe-byte-limit';
        },

        createTemporaryWriteStream() {
          return {};
        },

        createByteLimitTransform(
          maxBytes
        ) {
          receivedMaxBytes =
            maxBytes;

          return byteLimitTransform;
        },

        createAbortController() {
          return abortController;
        },

        scheduleAbort() {
          return {
            kind: 'timer',
          };
        },

        clearScheduledAbort() {},

        async pipeline(
          source,
          limiter
        ) {
          assert.equal(
            source,
            readStream
          );

          assert.equal(
            limiter,
            byteLimitTransform
          );
        },

        async removeTemporaryDirectory() {},
      };

    const result =
      await materializeMediaProbeReadStreamWithDependencies(
        readStream,
        {
          maxBytes: 4096,
          timeoutMs: 5000,
        },
        dependencies
      );

    assert.equal(
      receivedMaxBytes,
      4096
    );

    await result.cleanup();
  }
);

test(
  'clears the deadline and cleans up the temporary directory when bounded materialization rejects',
  async () => {
    const readStream = {
      kind: 'media-read-stream',
    };

    const byteLimitTransform = {
      kind: 'byte-limit-transform',
    };

    const abortController =
      createControlledAbortController();

    const calls: string[] = [];

    const temporaryDirectory =
      '/controlled/tmp/probe-bounded-failure';

    const dependencies:
      MediaProbeTempMaterializerDependencies<
        typeof readStream,
        typeof byteLimitTransform,
        object,
        ControlledAbortSignal
      > = {
        async createTemporaryDirectory() {
          return temporaryDirectory;
        },

        createTemporaryWriteStream() {
          return {};
        },

        createByteLimitTransform() {
          return byteLimitTransform;
        },

        createAbortController() {
          return abortController;
        },

        scheduleAbort() {
          return {
            kind: 'timer',
          };
        },

        clearScheduledAbort() {
          calls.push(
            'clearScheduledAbort'
          );
        },

        async pipeline(
          source,
          limiter
        ) {
          assert.equal(
            source,
            readStream
          );

          assert.equal(
            limiter,
            byteLimitTransform
          );

          throw new Error(
            'MEDIA_PROBE_MATERIALIZATION_LIMIT_EXCEEDED'
          );
        },

        async removeTemporaryDirectory(
          directoryPath
        ) {
          calls.push(
            `removeTemporaryDirectory:${directoryPath}`
          );
        },
      };

    await assert.rejects(
      () =>
        materializeMediaProbeReadStreamWithDependencies(
          readStream,
          {
            maxBytes: 1024,
            timeoutMs: 5000,
          },
          dependencies
        ),
      /MEDIA_PROBE_MATERIALIZATION_LIMIT_EXCEEDED/
    );

    assert.deepEqual(calls, [
      'clearScheduledAbort',
      `removeTemporaryDirectory:${temporaryDirectory}`,
    ]);
  }
);

test(
  'allows bytes through the byte-limit transform up to the exact configured ceiling',
  async () => {
    const received: Buffer[] = [];

    const limiter =
      createMediaProbeByteLimitTransform(
        6
      );

    const destination =
      new Writable({
        write(
          chunk,
          _encoding,
          callback
        ) {
          received.push(
            Buffer.from(chunk)
          );

          callback();
        },
      });

    await pipelineStreams(
      Readable.from([
        Buffer.from('abc'),
        Buffer.from('def'),
      ]),
      limiter,
      destination
    );

    assert.equal(
      Buffer.concat(
        received
      ).toString(),
      'abcdef'
    );
  }
);

test(
  'rejects the first chunk that would exceed the configured byte ceiling',
  async () => {
    const received: Buffer[] = [];

    const limiter =
      createMediaProbeByteLimitTransform(
        5
      );

    const destination =
      new Writable({
        write(
          chunk,
          _encoding,
          callback
        ) {
          received.push(
            Buffer.from(chunk)
          );

          callback();
        },
      });

    await assert.rejects(
      () =>
        pipelineStreams(
          Readable.from([
            Buffer.from('abc'),
            Buffer.from('def'),
          ]),
          limiter,
          destination
        ),
      /MEDIA_PROBE_MATERIALIZATION_LIMIT_EXCEEDED/
    );

    assert.equal(
      Buffer.concat(
        received
      ).toString(),
      'abc'
    );
  }
);