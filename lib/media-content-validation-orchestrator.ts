import 'server-only';

import {
  probeValidatingMediaContent,
} from '@/lib/media-content-probe-authority';

import {
  evaluateMediaContentValidation,
  type MediaContentProbe,
  type MediaContentValidationResult,
} from '@/lib/media-content-validation';

export type MediaContentValidationOrchestratorDependencies = {
  probeValidatingMediaContent: (
    mediaId: string
  ) => Promise<MediaContentProbe>;

  evaluateMediaContentValidation: (
    probe: MediaContentProbe
  ) => MediaContentValidationResult;
};

export async function validateMediaContentWithDependencies(
  mediaId: string,
  dependencies:
    MediaContentValidationOrchestratorDependencies
): Promise<MediaContentValidationResult> {
  const probe =
    await dependencies
      .probeValidatingMediaContent(
        mediaId
      );

  return dependencies
    .evaluateMediaContentValidation(
      probe
    );
}

const productionDependencies:
  MediaContentValidationOrchestratorDependencies = {
    probeValidatingMediaContent,
    evaluateMediaContentValidation,
  };

export async function validateMediaContent(
  mediaId: string
): Promise<MediaContentValidationResult> {
  return validateMediaContentWithDependencies(
    mediaId,
    productionDependencies
  );
}