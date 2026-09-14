import 'server-only';

import {
  createGenerationPinnedMediaReadStream,
} from '@/lib/media-generation-pinned-read-stream';

export type SeekableMediaProbeInput = {
  filePath: string;
  cleanup: () => Promise<void>;
};

export type SeekableMediaProbeInputDependencies<
  TReadStream
> = {
  createGenerationPinnedMediaReadStream: (
    sourceObject: string,
    generation: string
  ) => TReadStream;

  materializeReadStream: (
    readStream: TReadStream
  ) => Promise<SeekableMediaProbeInput>;
};

export async function createSeekableMediaProbeInputWithDependencies<
  TReadStream
>(
  sourceObject: string,
  generation: string,
  dependencies:
    SeekableMediaProbeInputDependencies<
      TReadStream
    >
): Promise<SeekableMediaProbeInput> {
  const readStream =
    dependencies.createGenerationPinnedMediaReadStream(
      sourceObject,
      generation
    );

  return dependencies.materializeReadStream(
    readStream
  );
}

const productionDependencies = {
  createGenerationPinnedMediaReadStream,

  async materializeReadStream():
    Promise<SeekableMediaProbeInput> {
    throw new Error(
      'MEDIA_PROBE_INPUT_MATERIALIZER_NOT_CONFIGURED'
    );
  },
};

export async function createSeekableMediaProbeInput(
  sourceObject: string,
  generation: string
): Promise<SeekableMediaProbeInput> {
  return createSeekableMediaProbeInputWithDependencies(
    sourceObject,
    generation,
    productionDependencies
  );
}