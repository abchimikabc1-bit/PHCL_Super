import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createGenerationPinnedMediaObjectWithDependencies,
  type GenerationPinnedMediaObjectDependencies,
} from '@/lib/media-generation-pinned-object';

test(
  'creates a storage object handle pinned to the exact verified generation',
  () => {
    const calls: Array<{
      sourceObject: string;
      generation: string;
    }> = [];

    const pinnedObject = {
      marker: 'pinned-object',
    };

    const dependencies:
      GenerationPinnedMediaObjectDependencies = {
        createFileHandle(
          sourceObject,
          options
        ) {
          calls.push({
            sourceObject,
            generation:
              options.generation,
          });

          return pinnedObject;
        },
      };

    const result =
      createGenerationPinnedMediaObjectWithDependencies(
        'media/ingest/owner-123/media-123/video.mp4',
        '1740000000000000',
        dependencies
      );

    assert.equal(
      result,
      pinnedObject
    );

    assert.deepEqual(
      calls,
      [
        {
          sourceObject:
            'media/ingest/owner-123/media-123/video.mp4',
          generation:
            '1740000000000000',
        },
      ]
    );
  }
);

test(
  'rejects an empty source object before creating a storage handle',
  () => {
    let called = false;

    const dependencies:
      GenerationPinnedMediaObjectDependencies = {
        createFileHandle() {
          called = true;

          return {};
        },
      };

    assert.throws(
      () =>
        createGenerationPinnedMediaObjectWithDependencies(
          '',
          '1740000000000000',
          dependencies
        ),
      /INVALID_MEDIA_SOURCE_OBJECT/
    );

    assert.equal(
      called,
      false
    );
  }
);

test(
  'rejects a non-canonical source object before creating a storage handle',
  () => {
    let called = false;

    const dependencies:
      GenerationPinnedMediaObjectDependencies = {
        createFileHandle() {
          called = true;

          return {};
        },
      };

    assert.throws(
      () =>
        createGenerationPinnedMediaObjectWithDependencies(
          ' media/ingest/owner-123/media-123/video.mp4',
          '1740000000000000',
          dependencies
        ),
      /INVALID_MEDIA_SOURCE_OBJECT/
    );

    assert.equal(
      called,
      false
    );
  }
);

test(
  'rejects an empty generation before creating a storage handle',
  () => {
    let called = false;

    const dependencies:
      GenerationPinnedMediaObjectDependencies = {
        createFileHandle() {
          called = true;

          return {};
        },
      };

    assert.throws(
      () =>
        createGenerationPinnedMediaObjectWithDependencies(
          'media/ingest/owner-123/media-123/video.mp4',
          '',
          dependencies
        ),
      /INVALID_MEDIA_GENERATION/
    );

    assert.equal(
      called,
      false
    );
  }
);

test(
  'rejects a non-canonical generation before creating a storage handle',
  () => {
    let called = false;

    const dependencies:
      GenerationPinnedMediaObjectDependencies = {
        createFileHandle() {
          called = true;

          return {};
        },
      };

    assert.throws(
      () =>
        createGenerationPinnedMediaObjectWithDependencies(
          'media/ingest/owner-123/media-123/video.mp4',
          ' 1740000000000000',
          dependencies
        ),
      /INVALID_MEDIA_GENERATION/
    );

    assert.equal(
      called,
      false
    );
  }
);