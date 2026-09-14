import 'server-only';

import {
  createGenerationPinnedMediaReadStream,
} from '@/lib/media-generation-pinned-read-stream';

import {
  materializeMediaProbeReadStream,
} from '@/lib/media-probe-temp-materializer';

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
  materializeReadStream:
    materializeMediaProbeReadStream,
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