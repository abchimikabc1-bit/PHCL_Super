import 'server-only';

import {
  renewMediaTranscodeWorkClaim,
  type MediaTranscodeWorkClaim,
} from '@/lib/media-transcode-work-claim-authority';

const MEDIA_TRANSCODE_WORK_HEARTBEAT_INTERVAL_MS =
  60_000;

export type MediaTranscodeWorkClaimHeartbeat = {
  stopAndWait: () => Promise<boolean>;
};

export type MediaTranscodeWorkClaimHeartbeatDependencies = {
  nowMs: () => number;

  schedule: (
    callback: () => void,
    delayMs: number
  ) => unknown;

  clear: (
    timer: unknown
  ) => void;

  renewMediaTranscodeWorkClaim: (
    mediaId: string,
    claimId: string,
    nowMs: number
  ) => Promise<MediaTranscodeWorkClaim | null>;
};

export function startMediaTranscodeWorkClaimHeartbeatWithDependencies(
  mediaId: string,
  claimId: string,
  dependencies:
    MediaTranscodeWorkClaimHeartbeatDependencies
): MediaTranscodeWorkClaimHeartbeat {
  let stopped = false;
  let ownershipRetained = true;

  let timer:
    unknown | null = null;

  let inFlightRenewal:
    Promise<void> | null = null;

  const clearScheduledHeartbeat =
    (): void => {
      if (timer === null) {
        return;
      }

      const timerToClear =
        timer;

      timer = null;

      dependencies.clear(
        timerToClear
      );
    };

  const scheduleNextHeartbeat =
    (): void => {
      if (
        stopped ||
        !ownershipRetained ||
        timer !== null ||
        inFlightRenewal !== null
      ) {
        return;
      }

      timer =
        dependencies.schedule(
          () => {
            timer = null;

            if (
              stopped ||
              !ownershipRetained ||
              inFlightRenewal !== null
            ) {
              return;
            }

            const renewal =
              (async () => {
                try {
                  const renewedClaim =
                    await dependencies
                      .renewMediaTranscodeWorkClaim(
                        mediaId,
                        claimId,
                        dependencies.nowMs()
                      );

                  if (
                    renewedClaim === null
                  ) {
                    ownershipRetained =
                      false;
                  }
                } catch {
                  ownershipRetained =
                    false;
                }
              })();

            inFlightRenewal =
              renewal;

            void renewal.finally(
              () => {
                if (
                  inFlightRenewal ===
                  renewal
                ) {
                  inFlightRenewal =
                    null;
                }

                scheduleNextHeartbeat();
              }
            );
          },
          MEDIA_TRANSCODE_WORK_HEARTBEAT_INTERVAL_MS
        );
    };

  scheduleNextHeartbeat();

  return {
    stopAndWait:
      async (): Promise<boolean> => {
        stopped = true;

        clearScheduledHeartbeat();

        const renewal =
          inFlightRenewal;

        if (renewal !== null) {
          await renewal;
        }

        clearScheduledHeartbeat();

        return ownershipRetained;
      },
  };
}

const productionDependencies:
  MediaTranscodeWorkClaimHeartbeatDependencies = {
    nowMs: () =>
      Date.now(),

    schedule: (
      callback,
      delayMs
    ) =>
      setTimeout(
        callback,
        delayMs
      ),

    clear: (
      timer
    ) => {
      clearTimeout(
        timer as ReturnType<
          typeof setTimeout
        >
      );
    },

    renewMediaTranscodeWorkClaim,
  };

export function startMediaTranscodeWorkClaimHeartbeat(
  mediaId: string,
  claimId: string
): MediaTranscodeWorkClaimHeartbeat {
  return startMediaTranscodeWorkClaimHeartbeatWithDependencies(
    mediaId,
    claimId,
    productionDependencies
  );
}
