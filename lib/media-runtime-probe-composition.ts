import 'server-only';

import {
  executeAndParseMediaProbe,
} from '@/lib/media-probe-execution-result-parser';

import {
  probeMediaObjectWithRuntimeDependencies,
} from '@/lib/media-runtime-probe-adapter';

import type {
  MediaContentProbe,
} from '@/lib/media-content-validation';

export type MediaRuntimeProbeCompositionDependencies = {
  executeAndParseMediaProbe: (
    sourceObject: string,
    generation: string
  ) => Promise<MediaContentProbe>;
};

export async function probeMediaObjectWithRuntimeCompositionDependencies(
  sourceObject: string,
  generation: string,
  dependencies:
    MediaRuntimeProbeCompositionDependencies
): Promise<MediaContentProbe> {
  return probeMediaObjectWithRuntimeDependencies(
    sourceObject,
    generation,
    {
      executeProbe:
        dependencies.executeAndParseMediaProbe,
    }
  );
}

const productionDependencies:
  MediaRuntimeProbeCompositionDependencies = {
    executeAndParseMediaProbe,
  };

export async function probeMediaObjectWithRuntimeComposition(
  sourceObject: string,
  generation: string
): Promise<MediaContentProbe> {
  return probeMediaObjectWithRuntimeCompositionDependencies(
    sourceObject,
    generation,
    productionDependencies
  );
}