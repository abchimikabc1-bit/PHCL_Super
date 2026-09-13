import assert from 'node:assert/strict';
import test from 'node:test';

import type { MediaUploadVerificationResult } from '@/lib/media-upload-verification';
import type {
  TransitionVerifiedMediaInput,
  VerifiedMediaTransitionResult,
} from '@/lib/media-upload-transition-authority';

import {
  finalizeMediaUploadWithDependencies,
  type MediaUploadFinalizationDependencies,
} from '@/lib/media-upload-finalization';

const MEDIA_ID = 'media_finalization_test_001';
const SOURCE_OBJECT =
  'media/ingest/media_finalization_owner_001/media_finalization_test_001/video.mp4';
const GENERATION = '123456789';

function createDependencies(
  verificationResult: MediaUploadVerificationResult
): {
  dependencies: MediaUploadFinalizationDependencies;
  transitionInputs: TransitionVerifiedMediaInput[];
} {
  const transitionInputs: TransitionVerifiedMediaInput[] = [];

  const dependencies: MediaUploadFinalizationDependencies = {
    verifyUploadedMediaObject: async () => verificationResult,

    transitionVerifiedMediaToValidating: async (
      input: TransitionVerifiedMediaInput
    ): Promise<VerifiedMediaTransitionResult> => {
      transitionInputs.push(input);

      return {
        mediaId: input.mediaId,
        status: 'VALIDATING',
        verifiedGeneration: input.generation,
      };
    },
  };

  return {
    dependencies,
    transitionInputs,
  };
}

test(
  'verified upload advances to VALIDATING using only authoritative verification values',
  async () => {
    const verificationResult: MediaUploadVerificationResult = {
      verified: true,
      mediaId: MEDIA_ID,
      sourceObject: SOURCE_OBJECT,
      generation: GENERATION,
    };

    const { dependencies, transitionInputs } =
      createDependencies(verificationResult);

    const result = await finalizeMediaUploadWithDependencies(
      MEDIA_ID,
      dependencies
    );

    assert.deepEqual(transitionInputs, [
      {
        mediaId: MEDIA_ID,
        sourceObject: SOURCE_OBJECT,
        generation: GENERATION,
      },
    ]);

    assert.deepEqual(result, {
      mediaId: MEDIA_ID,
      status: 'VALIDATING',
      verifiedGeneration: GENERATION,
    });
  }
);

test(
  'verification failure does not call the transition authority',
  async () => {
    const verificationResult: MediaUploadVerificationResult = {
      verified: false,
      reason: 'OBJECT_NOT_FOUND',
    };

    const { dependencies, transitionInputs } =
      createDependencies(verificationResult);

    await assert.rejects(
      finalizeMediaUploadWithDependencies(
        MEDIA_ID,
        dependencies
      ),
      /MEDIA_UPLOAD_VERIFICATION_FAILED/
    );

    assert.equal(transitionInputs.length, 0);
  }
);