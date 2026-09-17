import 'server-only';

import {
  createWriteStream,
} from 'node:fs';

import {
  mkdtemp,
  rm,
} from 'node:fs/promises';

import {
  tmpdir,
} from 'node:os';

import {
  join,
} from 'node:path';

import {
  Transform,
} from 'node:stream';

import {
  pipeline,
} from 'node:stream/promises';

import type {
  SeekableMediaProbeInput,
} from '@/lib/media-seekable-probe-input';

const MEDIA_PROBE_TEMP_PREFIX =
  'phcl-media-probe-';

const MEDIA_PROBE_INPUT_FILE =
  'input.mp4';

const MEDIA_PROBE_MAX_MATERIALIZED_BYTES =
  524_288_000;

const MEDIA_PROBE_MATERIALIZATION_TIMEOUT_MS =
  60_000;

export type MediaProbeMaterializationLimits = {
  maxBytes: number;
  timeoutMs: number;
};

export type MediaProbePipelineOptions<
  TAbortSignal
> = {
  signal: TAbortSignal;
};

export type MediaProbeTempMaterializerDependencies<
  TReadStream,
  TByteLimitTransform,
  TWriteStream,
  TAbortSignal
> = {
  createTemporaryDirectory:
    () => Promise<string>;

  createTemporaryWriteStream: (
    filePath: string
  ) => TWriteStream;

  createByteLimitTransform: (
    maxBytes: number
  ) => TByteLimitTransform;

  createAbortController: () => {
    signal: TAbortSignal;
    abort(): void;
  };

  scheduleAbort: (
    controller: {
      signal: TAbortSignal;
      abort(): void;
    },
    timeoutMs: number
  ) => unknown;

  clearScheduledAbort: (
    timer: unknown
  ) => void;

  pipeline: (
    source: TReadStream,
    limiter: TByteLimitTransform,
    destination: TWriteStream,
    options:
      MediaProbePipelineOptions<
        TAbortSignal
      >
  ) => Promise<void>;

  removeTemporaryDirectory: (
    directoryPath: string
  ) => Promise<void>;
};

function assertMaterializationLimits(
  limits: MediaProbeMaterializationLimits
): void {
  if (
    !Number.isSafeInteger(
      limits.maxBytes
    ) ||
    limits.maxBytes <= 0
  ) {
    throw new Error(
      'INVALID_MEDIA_PROBE_MATERIALIZATION_MAX_BYTES'
    );
  }

  if (
    !Number.isSafeInteger(
      limits.timeoutMs
    ) ||
    limits.timeoutMs <= 0
  ) {
    throw new Error(
      'INVALID_MEDIA_PROBE_MATERIALIZATION_TIMEOUT'
    );
  }
}

export function createMediaProbeByteLimitTransform(
  maxBytes: number
): Transform {
  if (
    !Number.isSafeInteger(maxBytes) ||
    maxBytes <= 0
  ) {
    throw new Error(
      'INVALID_MEDIA_PROBE_MATERIALIZATION_MAX_BYTES'
    );
  }

  let receivedBytes = 0;

  return new Transform({
    transform(
      chunk,
      _encoding,
      callback
    ) {
      const chunkBytes =
        Buffer.isBuffer(chunk)
          ? chunk.length
          : Buffer.byteLength(chunk);

      if (
        chunkBytes >
          maxBytes - receivedBytes
      ) {
        callback(
          new Error(
            'MEDIA_PROBE_MATERIALIZATION_LIMIT_EXCEEDED'
          )
        );

        return;
      }

      receivedBytes +=
        chunkBytes;

      callback(
        null,
        chunk
      );
    },
  });
}

export async function materializeMediaProbeReadStreamWithDependencies<
  TReadStream,
  TByteLimitTransform,
  TWriteStream,
  TAbortSignal
>(
  readStream: TReadStream,
  limits: MediaProbeMaterializationLimits,
  dependencies:
    MediaProbeTempMaterializerDependencies<
      TReadStream,
      TByteLimitTransform,
      TWriteStream,
      TAbortSignal
    >
): Promise<SeekableMediaProbeInput> {
  assertMaterializationLimits(
    limits
  );

  const directoryPath =
    await dependencies.createTemporaryDirectory();

  const filePath = join(
    directoryPath,
    MEDIA_PROBE_INPUT_FILE
  );

  try {
    const writeStream =
      dependencies.createTemporaryWriteStream(
        filePath
      );

    const byteLimitTransform =
      dependencies.createByteLimitTransform(
        limits.maxBytes
      );

    const abortController =
      dependencies.createAbortController();

    const abortTimer =
      dependencies.scheduleAbort(
        abortController,
        limits.timeoutMs
      );

    try {
      await dependencies.pipeline(
        readStream,
        byteLimitTransform,
        writeStream,
        {
          signal:
            abortController.signal,
        }
      );
    } finally {
      dependencies.clearScheduledAbort(
        abortTimer
      );
    }
  } catch (error) {
    await dependencies.removeTemporaryDirectory(
      directoryPath
    );

    throw error;
  }

  return {
    filePath,

    cleanup: async () => {
      await dependencies.removeTemporaryDirectory(
        directoryPath
      );
    },
  };
}

const productionDependencies:
  MediaProbeTempMaterializerDependencies<
    NodeJS.ReadableStream,
    Transform,
    NodeJS.WritableStream,
    AbortSignal
  > = {
    async createTemporaryDirectory() {
      return mkdtemp(
        join(
          tmpdir(),
          MEDIA_PROBE_TEMP_PREFIX
        )
      );
    },

    createTemporaryWriteStream(
      filePath: string
    ) {
      return createWriteStream(
        filePath,
        {
          flags: 'wx',
          mode: 0o600,
        }
      );
    },

    createByteLimitTransform(
      maxBytes
    ) {
      return createMediaProbeByteLimitTransform(
        maxBytes
      );
    },

    createAbortController() {
      return new AbortController();
    },

    scheduleAbort(
      controller,
      timeoutMs
    ) {
      return setTimeout(
        () => {
          controller.abort();
        },
        timeoutMs
      );
    },

    clearScheduledAbort(
      timer
    ) {
      clearTimeout(
        timer as ReturnType<
          typeof setTimeout
        >
      );
    },

    async pipeline(
      source,
      limiter,
      destination,
      options
    ) {
      await pipeline(
        source,
        limiter,
        destination,
        {
          signal:
            options.signal,
        }
      );
    },

    async removeTemporaryDirectory(
      directoryPath: string
    ) {
      await rm(
        directoryPath,
        {
          recursive: true,
          force: true,
        }
      );
    },
  };

export async function materializeMediaProbeReadStream(
  readStream: NodeJS.ReadableStream
): Promise<SeekableMediaProbeInput> {
  return materializeMediaProbeReadStreamWithDependencies(
    readStream,
    {
      maxBytes:
        MEDIA_PROBE_MAX_MATERIALIZED_BYTES,

      timeoutMs:
        MEDIA_PROBE_MATERIALIZATION_TIMEOUT_MS,
    },
    productionDependencies
  );
}