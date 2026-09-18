import 'server-only';

import {
  runMediaValidationWorkerProcess,
} from './media-validation-main';

export type MediaValidationWorkerEntrypointDependencies = {
  runProcess: () => Promise<void>;
};

export async function startMediaValidationWorkerEntrypointWithDependencies(
  dependencies:
    MediaValidationWorkerEntrypointDependencies
): Promise<void> {
  try {
    await dependencies.runProcess();
  } catch {
    process.exitCode =
      1;

    throw new Error(
      'MEDIA_VALIDATION_WORKER_STARTUP_FAILED'
    );
  }
}

const productionDependencies:
  MediaValidationWorkerEntrypointDependencies = {
    runProcess:
      runMediaValidationWorkerProcess,
  };

export function startMediaValidationWorkerEntrypoint(): Promise<void> {
  return startMediaValidationWorkerEntrypointWithDependencies(
    productionDependencies
  );
}