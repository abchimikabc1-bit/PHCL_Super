import 'server-only';

import {
  executeMediaTranscodeWork,
  type MediaTranscodeWorkExecutionResult,
} from '@/lib/media-transcode-work-execution-orchestrator';

export type MediaTranscodeWorkConsumerDependencies = {
  executeMediaTranscodeWork: (
    mediaId: string
  ) => Promise<MediaTranscodeWorkExecutionResult>;
};

export function consumeMediaTranscodeWorkWithDependencies(
  mediaId: string,
  dependencies:
    MediaTranscodeWorkConsumerDependencies
): Promise<MediaTranscodeWorkExecutionResult> {
  return dependencies
    .executeMediaTranscodeWork(
      mediaId
    );
}

const productionDependencies:
  MediaTranscodeWorkConsumerDependencies = {
    executeMediaTranscodeWork,
  };

export function consumeMediaTranscodeWork(
  mediaId: string
): Promise<MediaTranscodeWorkExecutionResult> {
  return consumeMediaTranscodeWorkWithDependencies(
    mediaId,
    productionDependencies
  );
}
