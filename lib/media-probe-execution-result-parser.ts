import 'server-only';

import {
  executeMediaProbe,
} from '@/lib/media-probe-execution';

import {
  adaptMediaProbeProcessResult,
} from '@/lib/media-probe-result-adapter';

import type {
  MediaContentProbe,
} from '@/lib/media-content-validation';

import type {
  MediaProbeProcessResult,
} from '@/lib/media-probe-process';

export type MediaProbeExecutionResultParserDependencies = {
  executeMediaProbe: (
    sourceObject: string,
    generation: string
  ) => Promise<MediaProbeProcessResult>;
};

export async function executeAndParseMediaProbeWithDependencies(
  sourceObject: string,
  generation: string,
  dependencies:
    MediaProbeExecutionResultParserDependencies
): Promise<MediaContentProbe> {
  const processResult =
    await dependencies.executeMediaProbe(
      sourceObject,
      generation
    );

  return adaptMediaProbeProcessResult(
    processResult
  );
}

const productionDependencies:
  MediaProbeExecutionResultParserDependencies = {
    executeMediaProbe,
  };

export async function executeAndParseMediaProbe(
  sourceObject: string,
  generation: string
): Promise<MediaContentProbe> {
  return executeAndParseMediaProbeWithDependencies(
    sourceObject,
    generation,
    productionDependencies
  );
}