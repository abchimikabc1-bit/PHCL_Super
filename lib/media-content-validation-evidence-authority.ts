import 'server-only';

import {
  readValidatingMedia,
  type ValidatingMediaRecord,
} from '@/lib/media-validating-reader';

import {
  probeMediaObjectWithRuntimeComposition,
} from '@/lib/media-runtime-probe-composition';

import type {
  MediaContentProbe,
} from '@/lib/media-content-validation';

export type MediaContentValidationEvidence = {
  mediaId: string;
  sourceObject: string;
  verifiedGeneration: string;
  probe: MediaContentProbe;
};

export type MediaContentValidationEvidenceAuthorityDependencies = {
  readValidatingMedia: (
    mediaId: string
  ) => Promise<ValidatingMediaRecord>;

  probeMediaObject: (
    sourceObject: string,
    generation: string
  ) => Promise<MediaContentProbe>;
};

export async function readMediaContentValidationEvidenceWithDependencies(
  mediaId: string,
  dependencies:
    MediaContentValidationEvidenceAuthorityDependencies
): Promise<MediaContentValidationEvidence> {
  const media =
    await dependencies
      .readValidatingMedia(
        mediaId
      );

  const probe =
    await dependencies
      .probeMediaObject(
        media.sourceObject,
        media.verifiedGeneration
      );

  return {
    mediaId:
      media.mediaId,

    sourceObject:
      media.sourceObject,

    verifiedGeneration:
      media.verifiedGeneration,

    probe,
  };
}

const productionDependencies:
  MediaContentValidationEvidenceAuthorityDependencies = {
    readValidatingMedia,
    probeMediaObject:
      probeMediaObjectWithRuntimeComposition,
  };

export async function readMediaContentValidationEvidence(
  mediaId: string
): Promise<MediaContentValidationEvidence> {
  return readMediaContentValidationEvidenceWithDependencies(
    mediaId,
    productionDependencies
  );
}