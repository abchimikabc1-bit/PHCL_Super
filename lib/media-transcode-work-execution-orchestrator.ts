import 'server-only';

import {
  claimMediaTranscodeWork,
  type MediaTranscodeWorkClaim,
} from '@/lib/media-transcode-work-claim-authority';

import {
  startMediaTranscodeWorkClaimHeartbeat,
  type MediaTranscodeWorkClaimHeartbeat,
} from '@/lib/media-transcode-work-claim-heartbeat';

import {
  completeMediaTranscodeWork,
  releaseMediaTranscodeWorkClaim,
  type MediaTranscodeWorkCompletionResult,
} from '@/lib/media-transcode-work-completion-authority';

import {
  submitMediaTranscodeJob,
  type MediaTranscoderSubmissionInput,
  type MediaTranscoderSubmissionResult,
} from '@/lib/media-transcoder-adapter';

import {
  readMediaTranscoderRuntimeConfig,
  type MediaTranscoderRuntimeConfig,
} from '@/lib/media-transcoder-runtime-config';

export type MediaTranscodeWorkExecutionResult =
  MediaTranscodeWorkCompletionResult | null;

export type MediaTranscodeWorkExecutionOrchestratorDependencies = {
  nowMs: () => number;

  readMediaTranscoderRuntimeConfig: () =>
    MediaTranscoderRuntimeConfig;

  claimMediaTranscodeWork: (
    mediaId: string,
    nowMs: number
  ) => Promise<MediaTranscodeWorkClaim | null>;

  startMediaTranscodeWorkClaimHeartbeat: (
    mediaId: string,
    claimId: string
  ) => MediaTranscodeWorkClaimHeartbeat;

  submitMediaTranscodeJob: (
    input: MediaTranscoderSubmissionInput
  ) => Promise<MediaTranscoderSubmissionResult>;

  completeMediaTranscodeWork: (
    input: {
      mediaId: string;
      claimId: string;
      sourceObject: string;
      verifiedGeneration: string;
      transcoderJobName: string;
      nowMs: number;
    }
  ) => Promise<MediaTranscodeWorkCompletionResult>;

  releaseMediaTranscodeWorkClaim: (
    mediaId: string,
    claimId: string
  ) => Promise<boolean>;
};

export async function executeMediaTranscodeWorkWithDependencies(
  mediaId: string,
  dependencies:
    MediaTranscodeWorkExecutionOrchestratorDependencies
): Promise<MediaTranscodeWorkExecutionResult> {
  const claim =
    await dependencies
      .claimMediaTranscodeWork(
        mediaId,
        dependencies.nowMs()
      );

  if (claim === null) {
    return null;
  }

  let heartbeat:
    MediaTranscodeWorkClaimHeartbeat;

  try {
    heartbeat =
      dependencies
        .startMediaTranscodeWorkClaimHeartbeat(
          mediaId,
          claim.claimId
        );
  } catch (error) {
    try {
      await dependencies
        .releaseMediaTranscodeWorkClaim(
          mediaId,
          claim.claimId
        );
    } catch {
      // Preserve the original heartbeat startup failure.
    }

    throw error;
  }

  let heartbeatSettled = false;

  const stopHeartbeatAndRequireOwnership =
    async (): Promise<void> => {
      if (heartbeatSettled) {
        return;
      }

      heartbeatSettled = true;

      const ownershipRetained =
        await heartbeat.stopAndWait();

      if (!ownershipRetained) {
        throw new Error(
          'MEDIA_TRANSCODE_WORK_CLAIM_LOST'
        );
      }
    };

  try {
    const config =
      dependencies
        .readMediaTranscoderRuntimeConfig();

    const submission =
      await dependencies
        .submitMediaTranscodeJob({
          projectId:
            config.projectId,
          location:
            config.location,
          bucketName:
            config.bucketName,
          completionTopic:
            config.completionTopic,
          mediaId:
            claim.mediaId,
          sourceObject:
            claim.sourceObject,
          verifiedGeneration:
            claim.verifiedGeneration,
        });

    await stopHeartbeatAndRequireOwnership();

    return await dependencies
      .completeMediaTranscodeWork({
        mediaId:
          claim.mediaId,
        claimId:
          claim.claimId,
        sourceObject:
          claim.sourceObject,
        verifiedGeneration:
          claim.verifiedGeneration,
        transcoderJobName:
          submission.jobName,
        nowMs:
          dependencies.nowMs(),
      });
  } catch (error) {
    if (!heartbeatSettled) {
      heartbeatSettled = true;

      try {
        await heartbeat.stopAndWait();
      } catch {
        // Preserve the original execution failure.
      }
    }

    try {
      await dependencies
        .releaseMediaTranscodeWorkClaim(
          mediaId,
          claim.claimId
        );
    } catch {
      // Preserve the original execution failure.
    }

    throw error;
  }
}

const productionDependencies:
  MediaTranscodeWorkExecutionOrchestratorDependencies = {
    nowMs: () =>
      Date.now(),

    readMediaTranscoderRuntimeConfig,

    claimMediaTranscodeWork,

    startMediaTranscodeWorkClaimHeartbeat,

    submitMediaTranscodeJob,

    completeMediaTranscodeWork,

    releaseMediaTranscodeWorkClaim,
  };

export function executeMediaTranscodeWork(
  mediaId: string
): Promise<MediaTranscodeWorkExecutionResult> {
  return executeMediaTranscodeWorkWithDependencies(
    mediaId,
    productionDependencies
  );
}
