import 'server-only';

import {
  normalizeMediaContentProbe,
} from '@/lib/media-content-probe-normalizer';

import type {
  MediaContentProbe,
} from '@/lib/media-content-validation';

export type MediaRuntimeProbeDependencies = {
  executeProbe: (
    sourceObject: string,
    generation: string
  ) => Promise<unknown>;
};

export async function probeMediaObjectWithRuntimeDependencies(
  sourceObject: string,
  generation: string,
  dependencies: MediaRuntimeProbeDependencies
): Promise<MediaContentProbe> {
  const rawProbe =
    await dependencies.executeProbe(
      sourceObject,
      generation
    );

  return normalizeMediaContentProbe(
    rawProbe
  );
}