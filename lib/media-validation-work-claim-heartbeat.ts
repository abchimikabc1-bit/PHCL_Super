import 'server-only';

import {
  renewMediaValidationWorkClaim,
  type MediaValidationWorkClaim,
} from '@/lib/media-validation-work-claim-authority';

const MEDIA_VALIDATION_WORK_HEARTBEAT_INTERVAL_MS =
  60_000;

export type MediaValidationWorkClaimHeartbeat = {
  stopAndWait: () => Promise<boolean>;
};

export type MediaValidationWorkClaimHeartbeatDependencies = {
  nowMs: () => number;

  schedule: (
    callback: () => void,
    delayMs: number
  ) => unknown;

  clear: (
    timer: unknown
  ) => void;

  renewMediaValidationWorkClaim: (
    mediaId: string,
    claimId: string,
    nowMs: number
  ) => Promise<MediaValidationWorkClaim | null>;
};

export function startMediaValidationWorkClaimHeartbeatWithDependencies(
  mediaId: string,
  claimId: string,
  dependencies:
    MediaValidationWorkClaimHeartbeatDependencies
): MediaValidationWorkClaimHeartbeat {
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
                      .renewMediaValidationWorkClaim(
                        mediaId,
                        claimId,
                        dependencies.nowMs()
                      );

                  if (
                    renewedClaim === null
                  ) {
                    ownershipRetained =
                      false;

                    return;
                  }
                } catch {
                  ownershipRetained =
                    false;

                  return;
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
          MEDIA_VALIDATION_WORK_HEARTBEAT_INTERVAL_MS
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
  MediaValidationWorkClaimHeartbeatDependencies = {
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

    renewMediaValidationWorkClaim,
  };

export function startMediaValidationWorkClaimHeartbeat(
  mediaId: string,
  claimId: string
): MediaValidationWorkClaimHeartbeat {
  return startMediaValidationWorkClaimHeartbeatWithDependencies(
    mediaId,
    claimId,
    productionDependencies
  );
}