import 'server-only';

import {
  readValidatingMedia,
  type ValidatingMediaRecord,
} from '@/lib/media-validating-reader';

import type {
  MediaContentProbe,
} from '@/lib/media-content-validation';

export type MediaContentProbeAuthorityDependencies = {
  readValidatingMedia: (
    mediaId: string
  ) => Promise<ValidatingMediaRecord>;

  probeMediaObject: (
    sourceObject: string,
    generation: string
  ) => Promise<MediaContentProbe>;
};

export async function probeValidatingMediaContentWithDependencies(
  mediaId: string,
  dependencies: MediaContentProbeAuthorityDependencies
): Promise<MediaContentProbe> {
  const media =
    await dependencies.readValidatingMedia(
      mediaId
    );

  return dependencies.probeMediaObject(
    media.sourceObject,
    media.verifiedGeneration
  );
}

const productionDependencies:
  MediaContentProbeAuthorityDependencies = {
    readValidatingMedia,

    async probeMediaObject() {
      throw new Error(
        'MEDIA_CONTENT_PROBE_NOT_CONFIGURED'
      );
    },
  };

export async function probeValidatingMediaContent(
  mediaId: string
): Promise<MediaContentProbe> {
  return probeValidatingMediaContentWithDependencies(
    mediaId,
    productionDependencies
  );
}