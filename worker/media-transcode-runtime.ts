import 'server-only';

import type {
  Server,
} from 'node:http';

import {
  createProductionMediaTranscodeWorkerEventarcRequestHandler,
} from '@/lib/media-transcode-worker-eventarc-production';

import type {
  MediaTranscodeWorkerRequestAuthenticator,
} from '@/lib/media-transcode-worker-handler';

import {
  createMediaValidationWorkerHttpServer,
  listenMediaValidationWorkerHttpServer,
  readMediaValidationWorkerPort,
} from './media-validation-server';

export type MediaTranscodeWorkerRuntimeDependencies = {
  authenticateRequest:
    MediaTranscodeWorkerRequestAuthenticator;
};

export function createMediaTranscodeWorkerRuntimeServer(
  dependencies:
    MediaTranscodeWorkerRuntimeDependencies
): Server {
  const handler =
    createProductionMediaTranscodeWorkerEventarcRequestHandler(
      dependencies.authenticateRequest
    );

  return createMediaValidationWorkerHttpServer(
    handler
  );
}

export async function startMediaTranscodeWorkerRuntime(
  dependencies:
    MediaTranscodeWorkerRuntimeDependencies,
  portValue: string | undefined
): Promise<Server> {
  const port =
    readMediaValidationWorkerPort(
      portValue
    );

  const server =
    createMediaTranscodeWorkerRuntimeServer(
      dependencies
    );

  await listenMediaValidationWorkerHttpServer(
    server,
    port
  );

  return server;
}
