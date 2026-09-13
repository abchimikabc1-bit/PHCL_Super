import 'server-only';

import type { MediaUploadVerificationResult } from '@/lib/media-upload-verification';
import {
  verifyUploadedMediaObject,
} from '@/lib/media-upload-verifier';
import {
  transitionVerifiedMediaToValidating,
  type TransitionVerifiedMediaInput,
  type VerifiedMediaTransitionResult,
} from '@/lib/media-upload-transition-authority';

export type MediaUploadFinalizationDependencies = {
  verifyUploadedMediaObject: (
    mediaId: string
  ) => Promise<MediaUploadVerificationResult>;

  transitionVerifiedMediaToValidating: (
    input: TransitionVerifiedMediaInput
  ) => Promise<VerifiedMediaTransitionResult>;
};

const productionDependencies: MediaUploadFinalizationDependencies = {
  verifyUploadedMediaObject,
  transitionVerifiedMediaToValidating,
};

export async function finalizeMediaUploadWithDependencies(
  mediaId: string,
  dependencies: MediaUploadFinalizationDependencies
): Promise<VerifiedMediaTransitionResult> {
  const verification =
    await dependencies.verifyUploadedMediaObject(mediaId);

  if (verification.verified === false) {
    throw new Error(
      `MEDIA_UPLOAD_VERIFICATION_FAILED:${verification.reason}`
    );
  }

  return dependencies.transitionVerifiedMediaToValidating({
    mediaId: verification.mediaId,
    sourceObject: verification.sourceObject,
    generation: verification.generation,
  });
}

export function finalizeMediaUpload(
  mediaId: string
): Promise<VerifiedMediaTransitionResult> {
  return finalizeMediaUploadWithDependencies(
    mediaId,
    productionDependencies
  );
}