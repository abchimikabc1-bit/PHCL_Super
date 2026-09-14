import 'server-only';

import {
  createSeekableMediaProbeInput,
  type SeekableMediaProbeInput,
} from '@/lib/media-seekable-probe-input';

import type {
  MediaProbeProcessResult,
} from '@/lib/media-probe-process';

export type MediaProbeExecutionDependencies = {
  createSeekableMediaProbeInput: (
    sourceObject: string,
    generation: string
  ) => Promise<SeekableMediaProbeInput>;

  executeProbeProcess: (
    filePath: string
  ) => Promise<MediaProbeProcessResult>;
};

export async function executeMediaProbeWithDependencies(
  sourceObject: string,
  generation: string,
  dependencies: MediaProbeExecutionDependencies
): Promise<MediaProbeProcessResult> {
  const input =
    await dependencies.createSeekableMediaProbeInput(
      sourceObject,
      generation
    );

  try {
    return await dependencies.executeProbeProcess(
      input.filePath
    );
  } finally {
    await input.cleanup();
  }
}

const productionDependencies:
  MediaProbeExecutionDependencies = {
    createSeekableMediaProbeInput,

    async executeProbeProcess() {
      throw new Error(
        'MEDIA_PROBE_PROCESS_NOT_CONFIGURED'
      );
    },
  };

export async function executeMediaProbe(
  sourceObject: string,
  generation: string
): Promise<MediaProbeProcessResult> {
  return executeMediaProbeWithDependencies(
    sourceObject,
    generation,
    productionDependencies
  );
}