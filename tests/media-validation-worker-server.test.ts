import 'server-only';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  closeMediaValidationWorkerHttpServer,
  createMediaValidationWorkerHttpServer,
  listenMediaValidationWorkerHttpServer,
  readMediaValidationWorkerPort,
} from '../worker/media-validation-server';

test(
  'worker port parser accepts a valid TCP port',
  () => {
    assert.equal(
      readMediaValidationWorkerPort(
        '8080'
      ),
      8080
    );

    assert.equal(
      readMediaValidationWorkerPort(
        '65535'
      ),
      65535
    );
  }
);

test(
  'worker port parser fails closed for missing or invalid ports',
  () => {
    const invalidValues:
      Array<
        string | undefined
      > = [
        undefined,
        '',
        '0',
        '65536',
        '-1',
        '8080.5',
        'abc',
        ' 8080 ',
      ];

    for (
      const value of
        invalidValues
    ) {
      assert.throws(
        () =>
          readMediaValidationWorkerPort(
            value
          )
      );
    }
  }
);

test(
  'worker HTTP server listens and closes cleanly',
  async () => {
    const server =
      createMediaValidationWorkerHttpServer(
        async () =>
          new Response(
            null,
            {
              status: 204,
            }
          )
      );

    try {
      await listenMediaValidationWorkerHttpServer(
        server,
        0,
        '127.0.0.1'
      );

      assert.equal(
        server.listening,
        true
      );

      const address =
        server.address();

      assert.ok(
        address &&
          typeof address !==
            'string'
      );

      assert.ok(
        address.port > 0
      );
    } finally {
      await closeMediaValidationWorkerHttpServer(
        server
      );
    }

    assert.equal(
      server.listening,
      false
    );
  }
);