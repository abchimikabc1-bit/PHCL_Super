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
  transitionMediaContentValidation,
  type MediaContentValidationTransitionResult,
  type TransitionMediaContentValidationInput,
} from '@/lib/media-content-validation-transition-authority';

export type MediaContentValidationPersistenceOrchestratorDependencies = {
  readMediaContentValidationEvidence: (
    mediaId: string
  ) => Promise<MediaContentValidationEvidence>;

  evaluateMediaContentValidation: (
    probe: MediaContentProbe
  ) => MediaContentValidationResult;

  transitionMediaContentValidation: (
    input: TransitionMediaContentValidationInput
  ) => Promise<MediaContentValidationTransitionResult>;
};

export async function persistMediaContentValidationWithDependencies(
  mediaId: string,
  dependencies:
    MediaContentValidationPersistenceOrchestratorDependencies
): Promise<MediaContentValidationTransitionResult> {
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

  return dependencies
    .transitionMediaContentValidation({
      mediaId:
        evidence.mediaId,

      sourceObject:
        evidence.sourceObject,

      verifiedGeneration:
        evidence.verifiedGeneration,

      validation,
    });
}

const productionDependencies:
  MediaContentValidationPersistenceOrchestratorDependencies = {
    readMediaContentValidationEvidence,
    evaluateMediaContentValidation,
    transitionMediaContentValidation,
  };

export async function persistMediaContentValidation(
  mediaId: string
): Promise<MediaContentValidationTransitionResult> {
  return persistMediaContentValidationWithDependencies(
    mediaId,
    productionDependencies
  );
}