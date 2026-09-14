import 'server-only';

import {
  createGenerationPinnedMediaObject,
} from '@/lib/media-generation-pinned-object';

type GenerationPinnedReadableObject<
  TReadStream
> = {
  createReadStream: () => TReadStream;
};

export type GenerationPinnedMediaReadStreamDependencies<
  TReadStream
> = {
  createGenerationPinnedMediaObject: (
    sourceObject: string,
    generation: string
  ) => GenerationPinnedReadableObject<
    TReadStream
  >;
};

export function createGenerationPinnedMediaReadStreamWithDependencies<
  TReadStream
>(
  sourceObject: string,
  generation: string,
  dependencies:
    GenerationPinnedMediaReadStreamDependencies<
      TReadStream
    >
): TReadStream {
  const mediaObject =
    dependencies.createGenerationPinnedMediaObject(
      sourceObject,
      generation
    );

  return mediaObject.createReadStream();
}

const productionDependencies = {
  createGenerationPinnedMediaObject,
};

export function createGenerationPinnedMediaReadStream(
  sourceObject: string,
  generation: string
) {
  return createGenerationPinnedMediaReadStreamWithDependencies(
    sourceObject,
    generation,
    productionDependencies
  );
}