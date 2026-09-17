import 'server-only';

import {
  executeMediaValidationWork,
  type MediaValidationWorkExecutionResult,
} from '@/lib/media-validation-work-execution-orchestrator';

export type MediaValidationWorkConsumerDependencies = {
  executeMediaValidationWork: (
    mediaId: string
  ) => Promise<MediaValidationWorkExecutionResult>;
};

export async function consumeMediaValidationWorkWithDependencies(
  mediaId: string,
  dependencies:
    MediaValidationWorkConsumerDependencies
): Promise<MediaValidationWorkExecutionResult> {
  return dependencies
    .executeMediaValidationWork(
      mediaId
    );
}

const productionDependencies:
  MediaValidationWorkConsumerDependencies = {
    executeMediaValidationWork,
  };

export async function consumeMediaValidationWork(
  mediaId: string
): Promise<MediaValidationWorkExecutionResult> {
  return consumeMediaValidationWorkWithDependencies(
    mediaId,
    productionDependencies
  );
}