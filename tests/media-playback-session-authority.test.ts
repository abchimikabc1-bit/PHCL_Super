import assert from 'node:assert/strict';
import test from 'node:test';

import {
  authorizeMediaPlaybackObjectWithDependencies,
  createMediaPlaybackSessionWithDependencies,
  type MediaPlaybackSessionAuthorityDependencies,
  type MediaPlaybackSessionRecord,
} from '@/lib/media-playback-session-authority';

import type {
  ReadyMediaForPlayback,
} from '@/lib/media-playback-ready-reader';

const MEDIA_ID =
  'efc7cf40-9dc5-4a0f-ae48-2259337eefc9';

const OWNER_ID =
  'ckjB6QzXeYTwsvy6RNLyCsqNPu53';

const GENERATION =
  '1790254933642665';

const TOKEN =
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

const NOW_MS =
  1_790_255_000_000;

const OUTPUT_PREFIX =
  `media/processed/${MEDIA_ID}/`;

function createReadyMedia():
  ReadyMediaForPlayback {
  return {
    mediaId:
      MEDIA_ID,
    ownerId:
      OWNER_ID,
    status:
      'READY',
    verifiedGeneration:
      GENERATION,
    transcoderJobName:
      'projects/823513556612/locations/me-central1/jobs/2d933b50-daf1-49c0-90bd-0f6da9a51fb6',
    outputPrefix:
      OUTPUT_PREFIX,
    masterManifestObject:
      `${OUTPUT_PREFIX}master.m3u8`,
    hlsManifestObjects: [
      `${OUTPUT_PREFIX}hls-1080p.m3u8`,
      `${OUTPUT_PREFIX}hls-720p.m3u8`,
      `${OUTPUT_PREFIX}hls-480p.m3u8`,
    ],
    mp4Objects: [
      `${OUTPUT_PREFIX}video-1080p.mp4`,
      `${OUTPUT_PREFIX}video-720p.mp4`,
      `${OUTPUT_PREFIX}video-480p.mp4`,
    ],
    thumbnailObject:
      `${OUTPUT_PREFIX}thumbnail0000000000.jpeg`,
    completedAtMs:
      1_790_254_972_300,
  };
}

function createDependencies(): {
  dependencies:
    MediaPlaybackSessionAuthorityDependencies;
  records:
    Map<string, MediaPlaybackSessionRecord>;
} {
  const records =
    new Map<
      string,
      MediaPlaybackSessionRecord
    >();

  return {
    records,
    dependencies: {
      readReadyMedia:
        async () =>
          createReadyMedia(),
      createSessionRecord:
        async (
          tokenDigest,
          record
        ) => {
          assert.equal(
            records.has(
              tokenDigest
            ),
            false
          );

          records.set(
            tokenDigest,
            record
          );
        },
      readSessionRecord:
        async (tokenDigest) =>
          records.get(
            tokenDigest
          ) ?? null,
      createToken:
        () => TOKEN,
      nowMs:
        () => NOW_MS,
    },
  };
}

test(
  'creates an owner bound short lived playback session',
  async () => {
    const {
      dependencies,
      records,
    } =
      createDependencies();

    const result =
      await createMediaPlaybackSessionWithDependencies(
        OWNER_ID,
        MEDIA_ID,
        dependencies
      );

    assert.equal(
      result.token,
      TOKEN
    );
    assert.equal(
      result.mediaId,
      MEDIA_ID
    );
    assert.equal(
      result.expiresAtMs,
      NOW_MS + 600_000
    );
    assert.equal(
      result.masterManifestUrl,
      '/api/media/playback/object/master.m3u8'
    );
    assert.deepEqual(
      result.mp4Urls,
      [
        '/api/media/playback/object/video-1080p.mp4',
        '/api/media/playback/object/video-720p.mp4',
        '/api/media/playback/object/video-480p.mp4',
      ]
    );
    assert.equal(
      records.size,
      1
    );

    const [record] =
      [...records.values()];

    assert.equal(
      record?.ownerId,
      OWNER_ID
    );
    assert.equal(
      record?.mediaId,
      MEDIA_ID
    );
    assert.equal(
      record?.tokenDigest.length,
      64
    );
    assert.equal(
      JSON.stringify(record)
        .includes(TOKEN),
      false
    );
  }
);

test(
  'rejects playback session creation for a non owner',
  async () => {
    const {
      dependencies,
      records,
    } =
      createDependencies();

    await assert.rejects(
      createMediaPlaybackSessionWithDependencies(
        'different-user',
        MEDIA_ID,
        dependencies
      ),
      /MEDIA_PLAYBACK_FORBIDDEN/
    );

    assert.equal(
      records.size,
      0
    );
  }
);

test(
  'authorizes canonical HLS MP4 and thumbnail objects',
  async () => {
    const {
      dependencies,
    } =
      createDependencies();

    await createMediaPlaybackSessionWithDependencies(
      OWNER_ID,
      MEDIA_ID,
      dependencies
    );

    const cases = [
      [
        'master.m3u8',
        'application/vnd.apple.mpegurl',
        false,
      ],
      [
        'hls-720p0000000002.ts',
        'video/mp2t',
        false,
      ],
      [
        'video-1080p.mp4',
        'video/mp4',
        true,
      ],
      [
        'thumbnail0000000000.jpeg',
        'image/jpeg',
        false,
      ],
    ] as const;

    for (
      const [
        fileName,
        contentType,
        allowByteRanges,
      ]
      of cases
    ) {
      const result =
        await authorizeMediaPlaybackObjectWithDependencies(
          TOKEN,
          fileName,
          dependencies
        );

      assert.equal(
        result.objectPath,
        OUTPUT_PREFIX + fileName
      );
      assert.equal(
        result.contentType,
        contentType
      );
      assert.equal(
        result.allowByteRanges,
        allowByteRanges
      );
    }
  }
);

test(
  'rejects forged playback object paths before storage access',
  async () => {
    const {
      dependencies,
    } =
      createDependencies();

    await createMediaPlaybackSessionWithDependencies(
      OWNER_ID,
      MEDIA_ID,
      dependencies
    );

    const forgedFileNames = [
      '../master.m3u8',
      'other.mp4',
      'hls-1080p1.ts',
      'hls-2160p0000000000.ts',
      'thumbnail.jpeg',
    ];

    for (
      const fileName
      of forgedFileNames
    ) {
      await assert.rejects(
        authorizeMediaPlaybackObjectWithDependencies(
          TOKEN,
          fileName,
          dependencies
        ),
        /INVALID_MEDIA_PLAYBACK_OBJECT/
      );
    }
  }
);

test(
  'rejects expired revoked missing and mismatched sessions',
  async () => {
    const {
      dependencies,
      records,
    } =
      createDependencies();

    await assert.rejects(
      authorizeMediaPlaybackObjectWithDependencies(
        TOKEN,
        'master.m3u8',
        dependencies
      ),
      /MEDIA_PLAYBACK_SESSION_NOT_FOUND/
    );

    await createMediaPlaybackSessionWithDependencies(
      OWNER_ID,
      MEDIA_ID,
      dependencies
    );

    dependencies.nowMs =
      () => NOW_MS + 600_000;

    await assert.rejects(
      authorizeMediaPlaybackObjectWithDependencies(
        TOKEN,
        'master.m3u8',
        dependencies
      ),
      /MEDIA_PLAYBACK_SESSION_EXPIRED/
    );

    dependencies.nowMs =
      () => NOW_MS;

    const [
      tokenDigest,
      record,
    ] =
      [...records.entries()][0] ?? [];

    assert.ok(
      tokenDigest
    );
    assert.ok(
      record
    );

    records.set(
      tokenDigest,
      {
        ...record,
        revoked:
          true,
      }
    );

    await assert.rejects(
      authorizeMediaPlaybackObjectWithDependencies(
        TOKEN,
        'master.m3u8',
        dependencies
      ),
      /INVALID_MEDIA_PLAYBACK_SESSION/
    );

    records.set(
      tokenDigest,
      {
        ...record,
        verifiedGeneration:
          '999',
      }
    );

    await assert.rejects(
      authorizeMediaPlaybackObjectWithDependencies(
        TOKEN,
        'master.m3u8',
        dependencies
      ),
      /MEDIA_PLAYBACK_SESSION_MISMATCH/
    );
  }
);
