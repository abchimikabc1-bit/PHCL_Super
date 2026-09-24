import 'server-only';

export const MEDIA_TRANSCODE_EVENTARC_PATH =
  '/' as const;

export const MEDIA_TRANSCODE_COMPLETION_PATH =
  '/media-transcode-completion' as const;

export type MediaTranscodeRequestHandler =
  (
    request: Request
  ) => Promise<Response>;

export type MediaTranscodeWorkerRequestRouterDependencies = {
  handleEventarcRequest:
    MediaTranscodeRequestHandler;

  handleCompletionRequest:
    MediaTranscodeRequestHandler;
};

function noStoreResponse(
  status: number
): Response {
  return new Response(
    null,
    {
      status,

      headers: {
        'Cache-Control':
          'no-store, max-age=0',

        Pragma:
          'no-cache',
      },
    }
  );
}

export function createMediaTranscodeWorkerRequestRouter(
  dependencies:
    MediaTranscodeWorkerRequestRouterDependencies
): MediaTranscodeRequestHandler {
  return async (
    request: Request
  ): Promise<Response> => {
    if (
      request.method !==
      'POST'
    ) {
      return noStoreResponse(
        405
      );
    }

    const pathname =
      new URL(
        request.url
      ).pathname;

    if (
      pathname ===
      MEDIA_TRANSCODE_EVENTARC_PATH
    ) {
      return dependencies
        .handleEventarcRequest(
          request
        );
    }

    if (
      pathname ===
      MEDIA_TRANSCODE_COMPLETION_PATH
    ) {
      return dependencies
        .handleCompletionRequest(
          request
        );
    }

    return noStoreResponse(
      404
    );
  };
}
