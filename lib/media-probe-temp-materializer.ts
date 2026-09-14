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
  pipeline,
} from 'node:stream/promises';

import type {
  SeekableMediaProbeInput,
} from '@/lib/media-seekable-probe-input';

const MEDIA_PROBE_TEMP_PREFIX =
  'phcl-media-probe-';

const MEDIA_PROBE_INPUT_FILE =
  'input.mp4';

export type MediaProbeTempMaterializerDependencies<
  TReadStream,
  TWriteStream
> = {
  createTemporaryDirectory:
    () => Promise<string>;

  createTemporaryWriteStream: (
    filePath: string
  ) => TWriteStream;

  pipeline: (
    source: TReadStream,
    destination: TWriteStream
  ) => Promise<void>;

  removeTemporaryDirectory: (
    directoryPath: string
  ) => Promise<void>;
};

export async function materializeMediaProbeReadStreamWithDependencies<
  TReadStream,
  TWriteStream
>(
  readStream: TReadStream,
  dependencies:
    MediaProbeTempMaterializerDependencies<
      TReadStream,
      TWriteStream
    >
): Promise<SeekableMediaProbeInput> {
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

    await dependencies.pipeline(
      readStream,
      writeStream
    );
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

const productionDependencies = {
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

  async pipeline(
    source: NodeJS.ReadableStream,
    destination: NodeJS.WritableStream
  ) {
    await pipeline(
      source,
      destination
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
    productionDependencies
  );
}