import 'server-only';

import type {
  Server,
} from 'node:http';

import {
  createMediaTranscodePlatformAdmission,
  createPlatformAdmittedMediaTranscodeAuthenticator,
  MEDIA_TRANSCODE_PLATFORM_AUTHORITY,
} from './media-transcode-platform-binding';

import {
  startMediaTranscodeWorkerRuntime,
} from './media-transcode-runtime';

export async function startMediaTranscodeWorker(): Promise<Server> {
  const admission =
    createMediaTranscodePlatformAdmission(
      MEDIA_TRANSCODE_PLATFORM_AUTHORITY
    );

  const authenticateRequest =
    createPlatformAdmittedMediaTranscodeAuthenticator(
      admission
    );

  return startMediaTranscodeWorkerRuntime(
    {
      authenticateRequest,
    },
    process.env.PORT
  );
}
