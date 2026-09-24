import 'server-only';

import {
  createHash,
  randomBytes,
} from 'node:crypto';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  readReadyMediaForPlayback,
  type ReadyMediaForPlayback,
} from '@/lib/media-playback-ready-reader';

import {
  buildMediaProcessedPath,
} from '@/lib/media-storage-paths';

const PLAYBACK_SESSION_COLLECTION =
  'mediaPlaybackSessions';

const PLAYBACK_SESSION_SCHEMA_VERSION =
  1;

const PLAYBACK_SESSION_TTL_MS =
  10 * 60 * 1000;

const PLAYBACK_TOKEN_PATTERN =
  /^[A-Za-z0-9_-]{43}$/;

const PLAYBACK_TOKEN_DIGEST_PATTERN =
  /^[a-f0-9]{64}$/;

const SAFE_PLAYBACK_FILE_PATTERN =
  /^(?:master\.m3u8|hls-(?:1080p|720p|480p)\.m3u8|hls-(?:1080p|720p|480p)[0-9]{10}\.ts|video-(?:1080p|720p|480p)\.mp4|thumbnail0000000000\.jpeg)$/;

const THUMBNAIL_FILE =
  'thumbnail0000000000.jpeg';

export const MEDIA_PLAYBACK_COOKIE_NAME =
  'phcl_media_playback';

export const MEDIA_PLAYBACK_COOKIE_PATH =
  '/api/media/playback';

export type MediaPlaybackSessionRecord = {
  schemaVersion: number;
  tokenDigest: string;
  mediaId: string;
  ownerId: string;
  verifiedGeneration: string;
  outputPrefix: string;
  createdAtMs: number;
  expiresAtMs: number;
  revoked: boolean;
};

export type CreatedMediaPlaybackSession = {
  token: string;
  mediaId: string;
  expiresAtMs: number;
  masterManifestUrl: string;
  mp4Urls: string[];
  thumbnailUrl: string;
};

export type AuthorizedMediaPlaybackObject = {
  mediaId: string;
  ownerId: string;
  objectPath: string;
  fileName: string;
  contentType: string;
  allowByteRanges: boolean;
};

export type MediaPlaybackSessionAuthorityDependencies = {
  readReadyMedia: (
    mediaId: string
  ) => Promise<ReadyMediaForPlayback>;

  createSessionRecord: (
    tokenDigest: string,
    record: MediaPlaybackSessionRecord
  ) => Promise<void>;

  readSessionRecord: (
    tokenDigest: string
  ) => Promise<unknown | null>;

  createToken: () => string;

  nowMs: () => number;
};

function isPlainRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isCanonicalNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.trim() === value
  );
}

function isValidTimestampMs(
  value: unknown
): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function assertAuthenticatedUid(
  authenticatedUid: string
): void {
  if (
    !isCanonicalNonEmptyString(
      authenticatedUid
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_PLAYBACK_AUTHORITY'
    );
  }
}

function assertPlaybackToken(
  token: string
): void {
  if (
    typeof token !== 'string' ||
    !PLAYBACK_TOKEN_PATTERN.test(
      token
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_PLAYBACK_SESSION'
    );
  }
}

function digestPlaybackToken(
  token: string
): string {
  assertPlaybackToken(
    token
  );

  return createHash(
    'sha256'
  )
    .update(
      token,
      'utf8'
    )
    .digest(
      'hex'
    );
}

function createPlaybackObjectUrl(
  fileName: string
): string {
  return (
    '/api/media/playback/object/' +
    encodeURIComponent(
      fileName
    )
  );
}

function getPlaybackFileAuthority(
  fileName: string
): {
  contentType: string;
  allowByteRanges: boolean;
} {
  if (
    typeof fileName !== 'string' ||
    fileName.trim() !== fileName ||
    !SAFE_PLAYBACK_FILE_PATTERN.test(
      fileName
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_PLAYBACK_OBJECT'
    );
  }

  if (
    fileName.endsWith(
      '.m3u8'
    )
  ) {
    return {
      contentType:
        'application/vnd.apple.mpegurl',
      allowByteRanges:
        false,
    };
  }

  if (
    fileName.endsWith(
      '.ts'
    )
  ) {
    return {
      contentType:
        'video/mp2t',
      allowByteRanges:
        false,
    };
  }

  if (
    fileName.endsWith(
      '.mp4'
    )
  ) {
    return {
      contentType:
        'video/mp4',
      allowByteRanges:
        true,
    };
  }

  return {
    contentType:
      'image/jpeg',
    allowByteRanges:
      false,
  };
}

function parseSessionRecord(
  value: unknown,
  expectedDigest: string
): MediaPlaybackSessionRecord {
  if (
    !isPlainRecord(value) ||
    value.schemaVersion !==
      PLAYBACK_SESSION_SCHEMA_VERSION ||
    value.tokenDigest !==
      expectedDigest ||
    !PLAYBACK_TOKEN_DIGEST_PATTERN.test(
      expectedDigest
    ) ||
    !isCanonicalNonEmptyString(
      value.mediaId
    ) ||
    !isCanonicalNonEmptyString(
      value.ownerId
    ) ||
    !/^[0-9]{1,32}$/.test(
      String(
        value.verifiedGeneration ?? ''
      )
    ) ||
    !isCanonicalNonEmptyString(
      value.outputPrefix
    ) ||
    !isValidTimestampMs(
      value.createdAtMs
    ) ||
    !isValidTimestampMs(
      value.expiresAtMs
    ) ||
    value.expiresAtMs <=
      value.createdAtMs ||
    value.revoked !== false
  ) {
    throw new Error(
      'INVALID_MEDIA_PLAYBACK_SESSION'
    );
  }

  return {
    schemaVersion:
      PLAYBACK_SESSION_SCHEMA_VERSION,
    tokenDigest:
      expectedDigest,
    mediaId:
      value.mediaId,
    ownerId:
      value.ownerId,
    verifiedGeneration:
      value.verifiedGeneration as string,
    outputPrefix:
      value.outputPrefix,
    createdAtMs:
      value.createdAtMs,
    expiresAtMs:
      value.expiresAtMs,
    revoked:
      false,
  };
}

const productionDependencies:
  MediaPlaybackSessionAuthorityDependencies = {
    readReadyMedia:
      readReadyMediaForPlayback,

    createSessionRecord:
      async (
        tokenDigest,
        record
      ) => {
        await adminDb
          .collection(
            PLAYBACK_SESSION_COLLECTION
          )
          .doc(tokenDigest)
          .create(record);
      },

    readSessionRecord:
      async (tokenDigest) => {
        const snapshot =
          await adminDb
            .collection(
              PLAYBACK_SESSION_COLLECTION
            )
            .doc(tokenDigest)
            .get();

        return snapshot.exists
          ? snapshot.data() ?? null
          : null;
      },

    createToken:
      () =>
        randomBytes(32)
          .toString(
            'base64url'
          ),

    nowMs:
      () => Date.now(),
  };

export async function createMediaPlaybackSessionWithDependencies(
  authenticatedUid: string,
  mediaId: string,
  dependencies:
    MediaPlaybackSessionAuthorityDependencies
): Promise<CreatedMediaPlaybackSession> {
  assertAuthenticatedUid(
    authenticatedUid
  );

  const media =
    await dependencies.readReadyMedia(
      mediaId
    );

  if (
    media.ownerId !==
      authenticatedUid
  ) {
    throw new Error(
      'MEDIA_PLAYBACK_FORBIDDEN'
    );
  }

  const token =
    dependencies.createToken();

  const tokenDigest =
    digestPlaybackToken(
      token
    );

  const createdAtMs =
    dependencies.nowMs();

  if (
    !isValidTimestampMs(
      createdAtMs
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_PLAYBACK_CLOCK'
    );
  }

  const expiresAtMs =
    createdAtMs +
    PLAYBACK_SESSION_TTL_MS;

  if (
    !Number.isSafeInteger(
      expiresAtMs
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_PLAYBACK_CLOCK'
    );
  }

  await dependencies.createSessionRecord(
    tokenDigest,
    {
      schemaVersion:
        PLAYBACK_SESSION_SCHEMA_VERSION,
      tokenDigest,
      mediaId:
        media.mediaId,
      ownerId:
        media.ownerId,
      verifiedGeneration:
        media.verifiedGeneration,
      outputPrefix:
        media.outputPrefix,
      createdAtMs,
      expiresAtMs,
      revoked:
        false,
    }
  );

  return {
    token,
    mediaId:
      media.mediaId,
    expiresAtMs,
    masterManifestUrl:
      createPlaybackObjectUrl(
        'master.m3u8'
      ),
    mp4Urls: [
      createPlaybackObjectUrl(
        'video-1080p.mp4'
      ),
      createPlaybackObjectUrl(
        'video-720p.mp4'
      ),
      createPlaybackObjectUrl(
        'video-480p.mp4'
      ),
    ],
    thumbnailUrl:
      createPlaybackObjectUrl(
        THUMBNAIL_FILE
      ),
  };
}

export function createMediaPlaybackSession(
  authenticatedUid: string,
  mediaId: string
): Promise<CreatedMediaPlaybackSession> {
  return createMediaPlaybackSessionWithDependencies(
    authenticatedUid,
    mediaId,
    productionDependencies
  );
}

export async function authorizeMediaPlaybackObjectWithDependencies(
  token: string,
  fileName: string,
  dependencies:
    MediaPlaybackSessionAuthorityDependencies
): Promise<AuthorizedMediaPlaybackObject> {
  const tokenDigest =
    digestPlaybackToken(
      token
    );

  const fileAuthority =
    getPlaybackFileAuthority(
      fileName
    );

  const storedValue =
    await dependencies.readSessionRecord(
      tokenDigest
    );

  if (storedValue === null) {
    throw new Error(
      'MEDIA_PLAYBACK_SESSION_NOT_FOUND'
    );
  }

  const session =
    parseSessionRecord(
      storedValue,
      tokenDigest
    );

  const nowMs =
    dependencies.nowMs();

  if (
    !isValidTimestampMs(
      nowMs
    ) ||
    nowMs >= session.expiresAtMs
  ) {
    throw new Error(
      'MEDIA_PLAYBACK_SESSION_EXPIRED'
    );
  }

  const media =
    await dependencies.readReadyMedia(
      session.mediaId
    );

  if (
    media.ownerId !==
      session.ownerId ||
    media.verifiedGeneration !==
      session.verifiedGeneration ||
    media.outputPrefix !==
      session.outputPrefix
  ) {
    throw new Error(
      'MEDIA_PLAYBACK_SESSION_MISMATCH'
    );
  }

  let objectPath:
    string;

  try {
    objectPath =
      buildMediaProcessedPath(
        media.mediaId,
        fileName
      );
  } catch {
    throw new Error(
      'INVALID_MEDIA_PLAYBACK_OBJECT'
    );
  }

  if (
    objectPath !==
      media.outputPrefix +
        fileName
  ) {
    throw new Error(
      'MEDIA_PLAYBACK_SESSION_MISMATCH'
    );
  }

  return {
    mediaId:
      media.mediaId,
    ownerId:
      media.ownerId,
    objectPath,
    fileName,
    contentType:
      fileAuthority.contentType,
    allowByteRanges:
      fileAuthority.allowByteRanges,
  };
}

export function authorizeMediaPlaybackObject(
  token: string,
  fileName: string
): Promise<AuthorizedMediaPlaybackObject> {
  return authorizeMediaPlaybackObjectWithDependencies(
    token,
    fileName,
    productionDependencies
  );
}
