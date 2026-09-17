import 'server-only';

export type MediaValidationWorkerEventarcRequest = {
  specversion: string;
  id: string;
  type: string;
  source: string;
  document: string;
};

function invalidEventarcRequest(): never {
  throw new Error(
    'INVALID_EVENTARC_REQUEST'
  );
}

function readRequiredCloudEventHeader(
  request: Request,
  name: string
): string {
  const value =
    request.headers.get(
      name
    );

  if (
    value === null ||
    value.length === 0
  ) {
    return invalidEventarcRequest();
  }

  return value;
}

export function readMediaValidationWorkerEventarcRequest(
  request: Request
): MediaValidationWorkerEventarcRequest {
  return {
    specversion:
      readRequiredCloudEventHeader(
        request,
        'ce-specversion'
      ),

    id:
      readRequiredCloudEventHeader(
        request,
        'ce-id'
      ),

    type:
      readRequiredCloudEventHeader(
        request,
        'ce-type'
      ),

    source:
      readRequiredCloudEventHeader(
        request,
        'ce-source'
      ),

    document:
      readRequiredCloudEventHeader(
        request,
        'ce-document'
      ),
  };
}