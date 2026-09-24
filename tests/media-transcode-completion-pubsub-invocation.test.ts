import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readMediaTranscodeCompletionPubSubInvocation,
} from '@/lib/media-transcode-completion-pubsub-invocation';

const JOB_NAME =
  'projects/823513556612/locations/me-central1/jobs/job-123';

function encodeData(
  value: unknown
): string {
  return Buffer.from(
    JSON.stringify(value),
    'utf8'
  ).toString('base64');
}

function createRequest(
  body: string,
  contentLength?: string
): Request {
  const headers =
    new Headers({
      'content-type':
        'application/json',
    });

  if (contentLength !== undefined) {
    headers.set(
      'content-length',
      contentLength
    );
  }

  return new Request(
    'https://worker.invalid/media-transcode-completion',
    {
      method:
        'POST',
      headers,
      body,
    }
  );
}

function createEnvelope(
  state:
    'SUCCEEDED' | 'FAILED' =
      'SUCCEEDED'
) {
  return {
    message: {
      messageId:
        'message-123',
      publishTime:
        '2026-09-24T00:00:00Z',
      data:
        encodeData({
          job: {
            name:
              JOB_NAME,
            state,
          },
        }),
    },
    subscription:
      'projects/phcl-super-f0d21/subscriptions/media-transcode-complete-push',
  };
}

test(
  'reads an exact SUCCEEDED Transcoder Pub/Sub push invocation',
  async () => {
    const invocation =
      await readMediaTranscodeCompletionPubSubInvocation(
        createRequest(
          JSON.stringify(
            createEnvelope()
          )
        )
      );

    assert.deepEqual(
      invocation,
      {
        messageId:
          'message-123',
        jobName:
          JOB_NAME,
        state:
          'SUCCEEDED',
      }
    );
  }
);

test(
  'reads an exact FAILED Transcoder Pub/Sub push invocation',
  async () => {
    const invocation =
      await readMediaTranscodeCompletionPubSubInvocation(
        createRequest(
          JSON.stringify(
            createEnvelope(
              'FAILED'
            )
          )
        )
      );

    assert.equal(
      invocation.state,
      'FAILED'
    );
  }
);

test(
  'rejects malformed envelope JSON and malformed encoded job JSON',
  async () => {
    await assert.rejects(
      readMediaTranscodeCompletionPubSubInvocation(
        createRequest('{')
      ),
      /INVALID_MEDIA_TRANSCODE_COMPLETION_INVOCATION/
    );

    await assert.rejects(
      readMediaTranscodeCompletionPubSubInvocation(
        createRequest(
          JSON.stringify({
            message: {
              messageId:
                'message-123',
              data:
                Buffer.from(
                  '{',
                  'utf8'
                ).toString(
                  'base64'
                ),
            },
          })
        )
      ),
      /INVALID_MEDIA_TRANSCODE_COMPLETION_INVOCATION/
    );
  }
);

test(
  'rejects missing message identity and malformed base64',
  async () => {
    const missingIdentity =
      createEnvelope();

    delete (
      missingIdentity.message as {
        messageId?: string;
      }
    ).messageId;

    await assert.rejects(
      readMediaTranscodeCompletionPubSubInvocation(
        createRequest(
          JSON.stringify(
            missingIdentity
          )
        )
      ),
      /INVALID_MEDIA_TRANSCODE_COMPLETION_INVOCATION/
    );

    await assert.rejects(
      readMediaTranscodeCompletionPubSubInvocation(
        createRequest(
          JSON.stringify({
            message: {
              messageId:
                'message-123',
              data:
                'not-base64!',
            },
          })
        )
      ),
      /INVALID_MEDIA_TRANSCODE_COMPLETION_INVOCATION/
    );
  }
);

test(
  'rejects nonterminal state and unsafe job resource name',
  async () => {
    for (
      const job
      of [
        {
          name:
            JOB_NAME,
          state:
            'RUNNING',
        },
        {
          name:
            'projects/823513556612/locations/me-central1/jobs/job-123/nested',
          state:
            'SUCCEEDED',
        },
      ]
    ) {
      await assert.rejects(
        readMediaTranscodeCompletionPubSubInvocation(
          createRequest(
            JSON.stringify({
              message: {
                messageId:
                  'message-123',
                data:
                  encodeData({
                    job,
                  }),
              },
            })
          )
        ),
        /INVALID_MEDIA_TRANSCODE_COMPLETION_INVOCATION/
      );
    }
  }
);

test(
  'rejects oversized declared and actual request bodies',
  async () => {
    await assert.rejects(
      readMediaTranscodeCompletionPubSubInvocation(
        createRequest(
          JSON.stringify(
            createEnvelope()
          ),
          '65537'
        )
      ),
      /REQUEST_TOO_LARGE/
    );

    await assert.rejects(
      readMediaTranscodeCompletionPubSubInvocation(
        createRequest(
          JSON.stringify({
            message: {
              messageId:
                'message-123',
              data:
                'A'.repeat(
                  66_000
                ),
            },
          })
        )
      ),
      /REQUEST_TOO_LARGE/
    );
  }
);
