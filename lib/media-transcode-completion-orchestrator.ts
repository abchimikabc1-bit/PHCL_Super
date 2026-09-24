import 'server-only';

import {
  readMediaTranscodeCompletionEvidence,
  type MediaTranscodeCompletionEvidence,
} from '@/lib/media-transcode-completion-evidence-authority';

import type {
  MediaTranscodeCompletionInvocation,
} from '@/lib/media-transcode-completion-pubsub-invocation';

import {
  readMediaTranscodeOutputEvidence,
  type MediaTranscodeOutputEvidence,
} from '@/lib/media-transcode-output-evidence';

import {
  completeMediaTranscodeProcessing,
  type CompleteMediaTranscodeProcessingInput,
  type MediaTranscodeProcessingCompletionResult,
} from '@/lib/media-transcode-processing-completion-authority';

import {
  failMediaTranscodeProcessing,
  type FailMediaTranscodeProcessingInput,
  type MediaTranscodeProcessingFailureResult,
} from '@/lib/media-transcode-processing-failure-authority';

import {
  readCompletedMediaTranscodeJob,
  type MediaTranscoderCompletedJob,
  type MediaTranscoderCompletedJobInput,
} from '@/lib/media-transcoder-adapter';

import {
  readMediaTranscoderRuntimeConfig,
  type MediaTranscoderRuntimeConfig,
} from '@/lib/media-transcoder-runtime-config';

export type MediaTranscodeCompletionExecutionResult =
  | MediaTranscodeProcessingCompletionResult
  | MediaTranscodeProcessingFailureResult
  | null;

export type MediaTranscodeCompletionOrchestratorDependencies = {
  nowMs: () => number;

  readMediaTranscodeCompletionEvidence: (
    transcoderJobName: string
  ) => Promise<MediaTranscodeCompletionEvidence | null>;

  readMediaTranscoderRuntimeConfig: () =>
    MediaTranscoderRuntimeConfig;

  readCompletedMediaTranscodeJob: (
    input: MediaTranscoderCompletedJobInput
  ) => Promise<MediaTranscoderCompletedJob>;

  readMediaTranscodeOutputEvidence: (
    mediaId: string
  ) => Promise<MediaTranscodeOutputEvidence>;

  completeMediaTranscodeProcessing: (
    input: CompleteMediaTranscodeProcessingInput
  ) => Promise<MediaTranscodeProcessingCompletionResult>;

  failMediaTranscodeProcessing: (
    input: FailMediaTranscodeProcessingInput
  ) => Promise<MediaTranscodeProcessingFailureResult>;
};

export async function executeMediaTranscodeCompletionWithDependencies(
  invocation:
    MediaTranscodeCompletionInvocation,
  dependencies:
    MediaTranscodeCompletionOrchestratorDependencies
): Promise<MediaTranscodeCompletionExecutionResult> {
  const evidence =
    await dependencies
      .readMediaTranscodeCompletionEvidence(
        invocation.jobName
      );

  if (evidence === null) {
    return null;
  }

  if (
    evidence.transcoderJobName !==
    invocation.jobName
  ) {
    throw new Error(
      'MEDIA_TRANSCODE_COMPLETION_MISMATCH'
    );
  }

  if (
    invocation.state ===
    'FAILED'
  ) {
    if (
      evidence.status ===
      'READY'
    ) {
      throw new Error(
        'MEDIA_TRANSCODE_COMPLETION_MISMATCH'
      );
    }

    return dependencies
      .failMediaTranscodeProcessing({
        mediaId:
          evidence.mediaId,
        sourceObject:
          evidence.sourceObject,
        verifiedGeneration:
          evidence.verifiedGeneration,
        transcoderJobName:
          evidence.transcoderJobName,
        nowMs:
          dependencies.nowMs(),
      });
  }

  if (
    evidence.status ===
    'TRANSCODE_FAILED'
  ) {
    throw new Error(
      'MEDIA_TRANSCODE_COMPLETION_MISMATCH'
    );
  }

  const runtimeConfig =
    dependencies
      .readMediaTranscoderRuntimeConfig();

  const completedJob =
    await dependencies
      .readCompletedMediaTranscodeJob({
        location:
          runtimeConfig.location,
        bucketName:
          runtimeConfig.bucketName,
        mediaId:
          evidence.mediaId,
        sourceObject:
          evidence.sourceObject,
        verifiedGeneration:
          evidence.verifiedGeneration,
        transcoderJobName:
          evidence.transcoderJobName,
      });

  if (
    completedJob.jobName !==
      evidence.transcoderJobName ||
    completedJob.mediaId !==
      evidence.mediaId ||
    completedJob.verifiedGeneration !==
      evidence.verifiedGeneration ||
    completedJob.state !==
      'SUCCEEDED'
  ) {
    throw new Error(
      'MEDIA_TRANSCODE_COMPLETION_MISMATCH'
    );
  }

  const outputEvidence =
    await dependencies
      .readMediaTranscodeOutputEvidence(
        evidence.mediaId
      );

  return dependencies
    .completeMediaTranscodeProcessing({
      mediaId:
        evidence.mediaId,
      sourceObject:
        evidence.sourceObject,
      verifiedGeneration:
        evidence.verifiedGeneration,
      transcoderJobName:
        evidence.transcoderJobName,
      outputEvidence,
      nowMs:
        dependencies.nowMs(),
    });
}

const productionDependencies:
  MediaTranscodeCompletionOrchestratorDependencies = {
    nowMs: () =>
      Date.now(),

    readMediaTranscodeCompletionEvidence,

    readMediaTranscoderRuntimeConfig,

    readCompletedMediaTranscodeJob,

    readMediaTranscodeOutputEvidence,

    completeMediaTranscodeProcessing,

    failMediaTranscodeProcessing,
  };

export function executeMediaTranscodeCompletion(
  invocation:
    MediaTranscodeCompletionInvocation
): Promise<MediaTranscodeCompletionExecutionResult> {
  return executeMediaTranscodeCompletionWithDependencies(
    invocation,
    productionDependencies
  );
}
