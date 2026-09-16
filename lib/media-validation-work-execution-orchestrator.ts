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