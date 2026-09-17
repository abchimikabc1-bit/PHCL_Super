import 'server-only';

import {
  readMediaContentValidationEvidence,
  type MediaContentValidationEvidence,
} from '@/lib/media-content-validation-evidence-authority';

import {
  evaluateMediaContentValidation,
  type MediaContentProbe,
  type MediaContentValidationResult,
} from '@/lib/media-content-validation';

import {
  claimMediaValidationWork,
  type MediaValidationWorkClaim,
} from '@/lib/media-validation-work-claim-authority';

import {
  startMediaValidationWorkClaimHeartbeat,
  type MediaValidationWorkClaimHeartbeat,
} from '@/lib/media-validation-work-claim-heartbeat';

import {
  completeMediaValidationWork,
  releaseMediaValidationWorkClaim,
} from '@/lib/media-validation-work-completion-authority';

import type {
  MediaContentValidationTransitionResult,
} from '@/lib/media-content-validation-transition-authority';

export type MediaValidationWorkExecutionResult =
  MediaContentValidationTransitionResult | null;

export type MediaValidationWorkExecutionOrchestratorDependencies = {
  nowMs: () => number;

  claimMediaValidationWork: (
    mediaId: string,
    nowMs: number
  ) => Promise<MediaValidationWorkClaim | null>;

  startMediaValidationWorkClaimHeartbeat: (
    mediaId: string,
    claimId: string
  ) => MediaValidationWorkClaimHeartbeat;

  readMediaContentValidationEvidence: (
    mediaId: string
  ) => Promise<MediaContentValidationEvidence>;

  evaluateMediaContentValidation: (
    probe: MediaContentProbe
  ) => MediaContentValidationResult;

  completeMediaValidationWork: (
    input: {
      mediaId: string;
      claimId: string;
      sourceObject: string;
      verifiedGeneration: string;
      validation: MediaContentValidationResult;
      nowMs: number;
    }
  ) => Promise<MediaContentValidationTransitionResult>;

  releaseMediaValidationWorkClaim: (
    mediaId: string,
    claimId: string
  ) => Promise<boolean>;
};

export async function executeMediaValidationWorkWithDependencies(
  mediaId: string,
  dependencies:
    MediaValidationWorkExecutionOrchestratorDependencies
): Promise<MediaValidationWorkExecutionResult> {
  const claim =
    await dependencies.claimMediaValidationWork(
      mediaId,
      dependencies.nowMs()
    );

  if (claim === null) {
    return null;
  }

  let heartbeat:
    MediaValidationWorkClaimHeartbeat;

  try {
    heartbeat =
      dependencies
        .startMediaValidationWorkClaimHeartbeat(
          mediaId,
          claim.claimId
        );
  } catch (error) {
    try {
      await dependencies
        .releaseMediaValidationWorkClaim(
          mediaId,
          claim.claimId
        );
    } catch {
      // Preserve the original heartbeat start failure.
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
          'MEDIA_VALIDATION_WORK_CLAIM_LOST'
        );
      }
    };

  try {
    const evidence =
      await dependencies
        .readMediaContentValidationEvidence(
          mediaId
        );

    const validation =
      dependencies
        .evaluateMediaContentValidation(
          evidence.probe
        );

    await stopHeartbeatAndRequireOwnership();

    return await dependencies
      .completeMediaValidationWork({
        mediaId:
          evidence.mediaId,

        claimId:
          claim.claimId,

        sourceObject:
          evidence.sourceObject,

        verifiedGeneration:
          evidence.verifiedGeneration,

        validation,

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
        .releaseMediaValidationWorkClaim(
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
  MediaValidationWorkExecutionOrchestratorDependencies = {
    nowMs: () =>
      Date.now(),

    claimMediaValidationWork,

    startMediaValidationWorkClaimHeartbeat,

    readMediaContentValidationEvidence,

    evaluateMediaContentValidation,

    completeMediaValidationWork,

    releaseMediaValidationWorkClaim,
  };

export async function executeMediaValidationWork(
  mediaId: string
): Promise<MediaValidationWorkExecutionResult> {
  return executeMediaValidationWorkWithDependencies(
    mediaId,
    productionDependencies
  );
}
