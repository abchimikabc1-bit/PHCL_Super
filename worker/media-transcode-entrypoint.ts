import 'server-only';

import {
  runMediaTranscodeWorkerProcess,
} from './media-transcode-main';

export type MediaTranscodeWorkerEntrypointDependencies = {
  runProcess: () => Promise<void>;
};

export async function startMediaTranscodeWorkerEntrypointWithDependencies(
  dependencies:
    MediaTranscodeWorkerEntrypointDependencies
): Promise<void> {
  try {
    await dependencies.runProcess();
  } catch {
    process.exitCode =
      1;

    throw new Error(
      'MEDIA_TRANSCODE_WORKER_STARTUP_FAILED'
    );
  }
}

const productionDependencies:
  MediaTranscodeWorkerEntrypointDependencies = {
    runProcess:
      runMediaTranscodeWorkerProcess,
  };

export function startMediaTranscodeWorkerEntrypoint(): Promise<void> {
  return startMediaTranscodeWorkerEntrypointWithDependencies(
    productionDependencies
  );
}
