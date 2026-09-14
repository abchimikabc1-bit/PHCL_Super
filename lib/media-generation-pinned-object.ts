import 'server-only';

import {
  adminStorageBucket,
} from '@/lib/firebase-admin';

type GenerationPinnedFileOptions = {
  generation: string;
};

type GenerationPinnedMediaObject =
  ReturnType<
    typeof adminStorageBucket.file
  >;

export type GenerationPinnedMediaObjectDependencies<
  TFileHandle = unknown
> = {
  createFileHandle: (
    sourceObject: string,
    options: GenerationPinnedFileOptions
  ) => TFileHandle;
};

function assertCanonicalSourceObject(
  sourceObject: string
): void {
  if (
    sourceObject.length === 0 ||
    sourceObject.trim() !== sourceObject
  ) {
    throw new Error(
      'INVALID_MEDIA_SOURCE_OBJECT'
    );
  }
}

function assertCanonicalGeneration(
  generation: string
): void {
  if (
    generation.length === 0 ||
    generation.trim() !== generation
  ) {
    throw new Error(
      'INVALID_MEDIA_GENERATION'
    );
  }
}

export function createGenerationPinnedMediaObjectWithDependencies<
  TFileHandle
>(
  sourceObject: string,
  generation: string,
  dependencies:
    GenerationPinnedMediaObjectDependencies<TFileHandle>
): TFileHandle {
  assertCanonicalSourceObject(
    sourceObject
  );

  assertCanonicalGeneration(
    generation
  );

  return dependencies.createFileHandle(
    sourceObject,
    {
      generation,
    }
  );
}

const productionDependencies:
  GenerationPinnedMediaObjectDependencies<
    GenerationPinnedMediaObject
  > = {
    createFileHandle(
      sourceObject,
      options
    ) {
      return adminStorageBucket.file(
        sourceObject,
        {
          generation:
            options.generation,
        }
      );
    },
  };

export function createGenerationPinnedMediaObject(
  sourceObject: string,
  generation: string
): GenerationPinnedMediaObject {
  return createGenerationPinnedMediaObjectWithDependencies(
    sourceObject,
    generation,
    productionDependencies
  );
}