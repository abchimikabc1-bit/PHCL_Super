import 'server-only';

import type {
  Server,
} from 'node:http';

import {
  createProductionMediaValidationWorkerEventarcRequestHandler,
} from '@/lib/media-validation-worker-eventarc-production';

import type {
  MediaValidationWorkerRequestAuthenticator,
} from '@/lib/media-validation-worker-handler';

import {
  createMediaValidationWorkerHttpServer,
  listenMediaValidationWorkerHttpServer,
  readMediaValidationWorkerPort,
} from './media-validation-server';

export type MediaValidationWorkerRuntimeDependencies = {
  authenticateRequest:
    MediaValidationWorkerRequestAuthenticator;
};

export function createMediaValidationWorkerRuntimeServer(
  dependencies:
    MediaValidationWorkerRuntimeDependencies
): Server {
  const handler =
    createProductionMediaValidationWorkerEventarcRequestHandler(
      dependencies.authenticateRequest
    );

  return createMediaValidationWorkerHttpServer(
    handler
  );
}

export async function startMediaValidationWorkerRuntime(
  dependencies:
    MediaValidationWorkerRuntimeDependencies,
  portValue:
    string | undefined
): Promise<Server> {
  const port =
    readMediaValidationWorkerPort(
      portValue
    );

  const server =
    createMediaValidationWorkerRuntimeServer(
      dependencies
    );

  await listenMediaValidationWorkerHttpServer(
    server,
    port
  );

  return server;
}