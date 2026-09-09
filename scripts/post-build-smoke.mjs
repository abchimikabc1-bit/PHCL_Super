#!/usr/bin/env node

import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import {
  spawn,
} from 'node:child_process';

const root =
  process.cwd();

const requestedPort =
  process.env.SMOKE_PORT
    ? Number(
        process.env.SMOKE_PORT,
      )
    : null;

const requiredBuildFile =
  path.join(
    root,
    '.next',
    'BUILD_ID',
  );

const nextBinPath =
  path.join(
    root,
    'node_modules',
    'next',
    'dist',
    'bin',
    'next',
  );

const pageChecks = [
  {
    path: '/',
    expectedStatus: 200,
  },
  {
    path: '/marketplace',
    expectedStatus: 200,
  },
  {
    path: '/cart',
    expectedStatus: 200,
  },
  {
    path: '/checkout',
    expectedStatus: 200,
  },
  {
    path: '/product/1',
    expectedStatus: 200,
  },
  {
    path: '/admin/login',
    expectedStatus: 200,
  },
  {
    path: '/admin/products',
    expectedStatuses: [
      200,
      307,
    ],
    expectedRedirectTarget:
      '/admin/login',
  },
];

const redirectChecks = [
  {
    path: '/',
    expectedStatus: 308,
    expectedLocation:
      'https://www.phclsuper.com/',
    host:
      'phclsuper.com',
  },
  {
    path: '/marketplace',
    expectedStatus: 308,
    expectedLocation:
      'https://www.phclsuper.com/marketplace',
    host:
      'phclsuper.com',
  },
  {
    path: '/cart',
    expectedStatus: 308,
    expectedLocation:
      'https://www.phclsuper.com/cart',
    host:
      'phclsuper.com',
  },
  {
    path: '/checkout',
    expectedStatus: 308,
    expectedLocation:
      'https://www.phclsuper.com/checkout',
    host:
      'phclsuper.com',
  },
  {
    path: '/product/1',
    expectedStatus: 308,
    expectedLocation:
      'https://www.phclsuper.com/product/1',
    host:
      'phclsuper.com',
  },
  {
    path: '/admin/login',
    expectedStatus: 308,
    expectedLocation:
      'https://www.phclsuper.com/admin/login',
    host:
      'phclsuper.com',
  },
  {
    path: '/admin/products',
    expectedStatus: 308,
    expectedLocation:
      'https://www.phclsuper.com/admin/products',
    host:
      'phclsuper.com',
  },
];

const hostedDomainChecks = [
  {
    path: '/',
    expectedStatus: 200,
    host:
      'phcl-super-app-2--phcl-super-f0d21.us-east4.hosted.app',
  },
  {
    path: '/marketplace',
    expectedStatus: 200,
    host:
      'phcl-super-app-2--phcl-super-f0d21.us-east4.hosted.app',
  },
  {
    path: '/admin/login',
    expectedStatus: 200,
    host:
      'phcl-super-app-2--phcl-super-f0d21.us-east4.hosted.app',
  },
];

const apiChecks = [
  {
    path:
      '/api/provider/callback/MPESA',
    method:
      'GET',
    expectedStatus:
      405,
    expectedBodyIncludes: [
      '"code":"METHOD_NOT_ALLOWED"',
    ],
  },
  {
    path:
      '/api/provider/callback/MPESA',
    method:
      'POST',
    headers: {
      'Content-Type':
        'application/json',
    },
    body:
      JSON.stringify({
        kind:
          'DEPOSIT',

        requestId:
          'smoke-provider-request',

        providerEventId:
          'smoke-provider-event',

        providerTransactionId:
          'smoke-provider-transaction',

        outcome:
          'SUCCESS',
      }),
    expectedStatus:
      401,
    expectedBodyIncludes: [
      '"code":"CALLBACK_UNAUTHORIZED"',
    ],
  },
  {
    path:
      '/api/provider/callback/MPESA',
    method:
      'POST',
    headers: {
      'Content-Type':
        'application/json',

      'X-PHCL-Timestamp':
        Math.floor(
          Date.now() / 1000,
        ).toString(),

      'X-PHCL-Signature':
        `sha256=${'0'.repeat(64)}`,
    },
    body:
      JSON.stringify({
        kind:
          'DEPOSIT',

        requestId:
          'smoke-provider-request',

        providerEventId:
          'smoke-provider-event',

        providerTransactionId:
          'smoke-provider-transaction',

        outcome:
          'SUCCESS',
      }),
    expectedStatus:
      401,
    expectedBodyIncludes: [
      '"code":"CALLBACK_UNAUTHORIZED"',
    ],
  },
  {
    path:
      '/api/deposit',
    method:
      'GET',
    expectedStatus:
      405,
    expectedBodyIncludes: [
      '"code":"METHOD_NOT_ALLOWED"',
      '"message":"Method not allowed."',
    ],
  },
  {
    path:
      '/api/deposit',
    method:
      'POST',
    expectedStatus:
      401,
    expectedBodyIncludes: [
      '"code":"UNAUTHENTICATED"',
      '"message":"Authentication required."',
    ],
  },
  {
    path:
      '/api/deposit',
    method:
      'POST',
    headers: {
      Authorization:
        'Bearer invalid-smoke-test-token',

      'Content-Type':
        'application/json',
    },
    body:
      JSON.stringify({
        asset:
          'TZS',

        rail:
          'MOBILE_MONEY',

        providerCode:
          'MPESA',

        amount:
          '1000',

        operationId:
          'smoke-invalid-deposit-auth',
      }),
    expectedStatus:
      401,
    expectedBodyIncludes: [
      '"code":"UNAUTHENTICATED"',
    ],
  },
  {
    path:
      '/api/admin/auth',
    method:
      'GET',
    expectedStatus:
      401,
    expectedBodyIncludes: [
      '"authenticated":false',
      'No admin session found',
    ],
  },
  {
    path:
      '/api/chat',
    method:
      'GET',
    expectedStatus:
      405,
  },
  {
    path:
      '/api/wallet',
    method:
      'GET',
    expectedStatus:
      401,
    expectedBodyIncludes: [
      '"code":"UNAUTHENTICATED"',
      '"message":"Authentication required."',
    ],
  },
  {
    path:
      '/api/wallet',
    method:
      'GET',
    headers: {
      Authorization:
        'Bearer invalid-smoke-test-token',
    },
    expectedStatus:
      401,
    expectedBodyIncludes: [
      '"code":"UNAUTHENTICATED"',
    ],
  },
  {
    path:
      '/api/wallet',
    method:
      'POST',
    expectedStatus:
      405,
    expectedBodyIncludes: [
      '"code":"METHOD_NOT_ALLOWED"',
      '"message":"Method not allowed."',
    ],
  },
  {
    path:
      '/api/transfer',
    method:
      'GET',
    expectedStatus:
      405,
  },
  {
    path:
      '/api/transfer',
    method:
      'POST',
    expectedStatus:
      401,
    expectedBodyIncludes: [
      '"code":"UNAUTHENTICATED"',
      '"message":"Authentication required."',
    ],
  },
  {
    path:
      '/api/transfer',
    method:
      'POST',
    headers: {
      Authorization:
        'Bearer invalid-smoke-test-token',

      'Content-Type':
        'application/json',
    },
    body:
      JSON.stringify({
        recipientEmail:
          'recipient@example.com',

        asset:
          'USD',

        amount:
          '1.00',

        operationId:
          'smoke-invalid-auth',
      }),
    expectedStatus:
      401,
    expectedBodyIncludes: [
      '"code":"UNAUTHENTICATED"',
    ],
  },
  {
    path:
      '/api/withdraw',
    method:
      'GET',
    expectedStatus:
      405,
    expectedBodyIncludes: [
      '"code":"METHOD_NOT_ALLOWED"',
      '"message":"Method not allowed."',
    ],
  },
  {
    path:
      '/api/withdraw',
    method:
      'POST',
    expectedStatus:
      401,
    expectedBodyIncludes: [
      '"code":"UNAUTHENTICATED"',
      '"message":"Authentication required."',
    ],
  },
  {
    path:
      '/api/withdraw',
    method:
      'POST',
    headers: {
      Authorization:
        'Bearer invalid-smoke-test-token',

      'Content-Type':
        'application/json',
    },
    body:
      JSON.stringify({
        asset:
          'TZS',

        rail:
          'MOBILE_MONEY',

        providerCode:
          'MPESA',

        destination:
          '+255700000000',

        amount:
          '1000',

        operationId:
          'smoke-invalid-withdrawal-auth',
      }),
    expectedStatus:
      401,
    expectedBodyIncludes: [
      '"code":"UNAUTHENTICATED"',
    ],
  },
];

function getErrorMessage(
  error,
) {
  return error instanceof Error
    ? error.message
    : String(error);
}

function fail(
  message,
) {
  console.error(
    `\nSmoke check failed: ${message}`,
  );

  process.exit(1);
}

function delay(
  milliseconds,
) {
  return new Promise(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

function getAvailablePort() {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const portServer =
        net.createServer();

      portServer.unref();

      portServer.once(
        'error',
        reject,
      );

      portServer.listen(
        {
          host:
            '127.0.0.1',

          port:
            requestedPort || 0,
        },
        () => {
          const address =
            portServer.address();

          const port =
            typeof address ===
              'object' &&
            address
              ? address.port
              : null;

          portServer.close(
            (closeError) => {
              if (closeError) {
                reject(
                  closeError,
                );

                return;
              }

              if (!port) {
                reject(
                  new Error(
                    'Could not determine an available port.',
                  ),
                );

                return;
              }

              resolve(
                port,
              );
            },
          );
        },
      );
    },
  );
}

function requestRoute(
  baseUrl,
  route,
  method = 'GET',
  body,
  extraHeaders = {},
  timeoutMs = 15_000,
) {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const url =
        new URL(
          route,
          baseUrl,
        );

      const payload =
        typeof body ===
          'string'
          ? body
          : undefined;

      let settled =
        false;

      const settleWithError =
        (error) => {
          if (settled) {
            return;
          }

          settled = true;

          reject(
            error,
          );
        };

      const clientRequest =
        http.request(
          {
            protocol:
              url.protocol,

            hostname:
              url.hostname,

            port:
              url.port,

            path:
              `${url.pathname}${url.search}`,

            method,

            family: 4,

            headers: {
              Accept:
                'application/json, text/plain, */*',

              ...(payload
                ? {
                    'Content-Type':
                      'application/json',

                    'Content-Length':
                      Buffer.byteLength(
                        payload,
                      ),
                  }
                : {}),

              ...extraHeaders,
            },
          },
          (response) => {
            let responseBody =
              '';

            response.setEncoding(
              'utf8',
            );

            response.on(
              'data',
              (chunk) => {
                responseBody +=
                  chunk;
              },
            );

            response.on(
              'error',
              settleWithError,
            );

            response.on(
              'end',
              () => {
                if (settled) {
                  return;
                }

                settled = true;

                resolve({
                  status:
                    response.statusCode ||
                    0,

                  location:
                    typeof response
                      .headers
                      .location ===
                      'string'
                      ? response
                          .headers
                          .location
                      : '',

                  body:
                    responseBody,

                  headers:
                    response.headers,
                });
              },
            );
          },
        );

      clientRequest.once(
        'error',
        settleWithError,
      );

      clientRequest.setTimeout(
        timeoutMs,
        () => {
          clientRequest.destroy(
            new Error(
              `Request timeout for ${method} ${route}.`,
            ),
          );
        },
      );

      if (payload) {
        clientRequest.write(
          payload,
        );
      }

      clientRequest.end();
    },
  );
}

async function waitForServerReady(
  baseUrl,
  server,
  timeoutMs = 120_000,
) {
  const startedAt =
    Date.now();

  let lastError =
    '';

  while (
    Date.now() -
      startedAt <
    timeoutMs
  ) {
    if (
      server.exitCode !==
        null ||
      server.signalCode !==
        null
    ) {
      throw new Error(
        `Next.js server exited before becoming ready (exitCode=${String(
          server.exitCode,
        )}, signal=${String(
          server.signalCode,
        )}).`,
      );
    }

    try {
      const response =
        await requestRoute(
          baseUrl,
          '/robots.txt',
          'GET',
          undefined,
          {},
          10_000,
        );

      if (
        response.status >=
          200 &&
        response.status <
          500
      ) {
        return;
      }

      lastError =
        `Readiness route returned HTTP ${response.status}.`;
    } catch (error) {
      lastError =
        getErrorMessage(
          error,
        );
    }

    await delay(
      500,
    );
  }

  throw new Error(
    `Server did not become ready at ${baseUrl} within ${timeoutMs}ms.${
      lastError
        ? ` Last readiness error: ${lastError}`
        : ''
    }`,
  );
}

function showServerSnapshot(
  stdout,
  stderr,
) {
  if (
    stdout.trim()
  ) {
    console.error(
      '\nServer stdout snapshot:',
    );

    console.error(
      stdout
        .split('\n')
        .slice(-30)
        .join('\n'),
    );
  }

  if (
    stderr.trim()
  ) {
    console.error(
      '\nServer stderr snapshot:',
    );

    console.error(
      stderr
        .split('\n')
        .slice(-30)
        .join('\n'),
    );
  }
}

async function stopServer(
  server,
) {
  if (
    server.exitCode !==
      null ||
    server.signalCode !==
      null
  ) {
    return;
  }

  const exited =
    new Promise(
      (resolve) => {
        server.once(
          'exit',
          resolve,
        );
      },
    );

  server.kill(
    'SIGTERM',
  );

  const stoppedGracefully =
    await Promise.race([
      exited.then(
        () => true,
      ),

      delay(
        3_000,
      ).then(
        () => false,
      ),
    ]);

  if (
    stoppedGracefully ||
    server.exitCode !==
      null ||
    server.signalCode !==
      null
  ) {
    return;
  }

  server.kill(
    'SIGKILL',
  );

  await Promise.race([
    exited,
    delay(
      2_000,
    ),
  ]);
}

async function runPageChecks(
  baseUrl,
) {
  const failures =
    [];

  for (
    const check of
    pageChecks
  ) {
    try {
      const response =
        await requestRoute(
          baseUrl,
          check.path,
        );

      const expectedStatuses =
        check.expectedStatuses ||
        [
          check.expectedStatus,
        ];

      if (
        !expectedStatuses.includes(
          response.status,
        )
      ) {
        failures.push(
          `${check.path} returned ${response.status}, expected one of ${expectedStatuses.join(
            ', ',
          )}.`,
        );

        continue;
      }

      if (
        check.expectedRedirectTarget
      ) {
        const locationMatches =
          response.status >=
            300 &&
          response.status <
            400 &&
          response.location.startsWith(
            check.expectedRedirectTarget,
          );

        const streamedRedirectMatches =
          response.status ===
            200 &&
          response.body.includes(
            check.expectedRedirectTarget,
          );

        if (
          !locationMatches &&
          !streamedRedirectMatches
        ) {
          failures.push(
            `${check.path} did not redirect an unauthenticated request to ${check.expectedRedirectTarget}.`,
          );

          continue;
        }
      }

      console.log(
        `PASS ${check.path} -> ${response.status}`,
      );
    } catch (error) {
      failures.push(
        `${check.path} request failed: ${getErrorMessage(
          error,
        )}`,
      );
    }
  }

  for (
    const check of
    redirectChecks
  ) {
    try {
      const response =
        await requestRoute(
          baseUrl,
          check.path,
          'GET',
          undefined,
          {
            Host:
              check.host,
          },
        );

      if (
        response.status !==
        check.expectedStatus
      ) {
        failures.push(
          `[host:${check.host}] ${check.path} returned ${response.status}, expected ${check.expectedStatus}.`,
        );

        continue;
      }

      if (
        response.location !==
        check.expectedLocation
      ) {
        failures.push(
          `[host:${check.host}] ${check.path} redirected to ${response.location || '(empty)'}, expected ${check.expectedLocation}.`,
        );

        continue;
      }

      console.log(
        `PASS [host:${check.host}] ${check.path} -> ${response.status} ${response.location}`,
      );
    } catch (error) {
      failures.push(
        `[host:${check.host}] ${check.path} request failed: ${getErrorMessage(
          error,
        )}`,
      );
    }
  }

  for (
    const check of
    hostedDomainChecks
  ) {
    try {
      const response =
        await requestRoute(
          baseUrl,
          check.path,
          'GET',
          undefined,
          {
            Host:
              check.host,
          },
        );

      if (
        response.status !==
        check.expectedStatus
      ) {
        failures.push(
          `[host:${check.host}] ${check.path} returned ${response.status}, expected ${check.expectedStatus}.`,
        );

        continue;
      }

      console.log(
        `PASS [host:${check.host}] ${check.path} -> ${response.status}`,
      );
    } catch (error) {
      failures.push(
        `[host:${check.host}] ${check.path} request failed: ${getErrorMessage(
          error,
        )}`,
      );
    }
  }

  return failures;
}

async function runApiChecks(
  baseUrl,
) {
  const failures =
    [];

  for (
    const check of
    apiChecks
  ) {
    try {
      const response =
        await requestRoute(
          baseUrl,
          check.path,
          check.method,
          check.body,
          check.headers || {},
        );

      if (
        response.status !==
        check.expectedStatus
      ) {
        failures.push(
          `${check.method} ${check.path} returned ${response.status}, expected ${check.expectedStatus}.`,
        );

        continue;
      }

      if (
        check.expectedBodyIncludes
      ) {
        const missingFragments =
          check
            .expectedBodyIncludes
            .filter(
              (fragment) =>
                !response.body.includes(
                  fragment,
                ),
            );

        if (
          missingFragments.length >
          0
        ) {
          failures.push(
            `${check.method} ${check.path} body missing expected fragment(s): ${missingFragments.join(
              ', ',
            )}.`,
          );

          continue;
        }
      }

      console.log(
        `PASS ${check.method} ${check.path} -> ${response.status}`,
      );
    } catch (error) {
      failures.push(
        `${check.method} ${check.path} request failed: ${getErrorMessage(
          error,
        )}`,
      );
    }
  }

  return failures;
}

async function run() {
  if (
    !fs.existsSync(
      requiredBuildFile,
    )
  ) {
    fail(
      `Missing build artifact: ${path.relative(
        root,
        requiredBuildFile,
      )}. Run npm run build first.`,
    );
  }

  if (
    !fs.existsSync(
      nextBinPath,
    )
  ) {
    fail(
      `Missing Next.js runtime binary: ${path.relative(
        root,
        nextBinPath,
      )}.`,
    );
  }

  const port =
    await getAvailablePort();

  const baseUrl =
    `http://127.0.0.1:${port}`;

  const server =
    spawn(
      process.execPath,
      [
        nextBinPath,
        'start',
        '-H',
        '127.0.0.1',
        '-p',
        String(
          port,
        ),
      ],
      {
        cwd:
          root,

        env: {
        ...process.env,
        ADMIN_EMAIL:
          process.env
            .ADMIN_EMAIL ||
          'admin@phclsuper.com',
        ADMIN_SESSION_SECRET:
          process.env
            .ADMIN_SESSION_SECRET ||
          'phcl_admin_session_secret_smoke_test_only',
        TRANSFER_RATE_LIMIT_SECRET:
          process.env
            .TRANSFER_RATE_LIMIT_SECRET ||
          'phcl_transfer_rate_limit_smoke_test_only_secret',
        PROVIDER_CALLBACK_SECRET_MPESA:
          process.env
            .PROVIDER_CALLBACK_SECRET_MPESA ||
          'phcl_provider_callback_smoke_test_only_secret',
      },
        stdio: [
          'ignore',
          'pipe',
          'pipe',
        ],
        windowsHide:
          true,
      },
    );

  let stdout =
    '';

  let stderr =
    '';

  server.stdout.on(
    'data',
    (chunk) => {
      stdout +=
        String(
          chunk,
        );
    },
  );

  server.stderr.on(
    'data',
    (chunk) => {
      stderr +=
        String(
          chunk,
        );
    },
  );

  try {
    await waitForServerReady(
      baseUrl,
      server,
    );

    const routeFailures =
      await runPageChecks(
        baseUrl,
      );

    if (
      routeFailures.length >
      0
    ) {
      console.error(
        '\nRoute smoke failures:',
      );

      for (
        const failure of
        routeFailures
      ) {
        console.error(
          `- ${failure}`,
        );
      }

      showServerSnapshot(
        stdout,
        stderr,
      );

      process.exitCode =
        1;

      return;
    }

    console.log(
      '\nRoute smoke check passed.',
    );

    const apiFailures =
      await runApiChecks(
        baseUrl,
      );

    if (
      apiFailures.length >
      0
    ) {
      console.error(
        '\nAPI smoke failures:',
      );

      for (
        const failure of
        apiFailures
      ) {
        console.error(
          `- ${failure}`,
        );
      }

      showServerSnapshot(
        stdout,
        stderr,
      );

      process.exitCode =
        1;

      return;
    }

    console.log(
      '\nAPI smoke check passed.',
    );
  } catch (error) {
    console.error(
      `\nSmoke check failed before assertions: ${getErrorMessage(
        error,
      )}`,
    );

    showServerSnapshot(
      stdout,
      stderr,
    );

    process.exitCode =
      1;
  } finally {
    await stopServer(
      server,
    );
  }
}

await run();

if (
  process.exitCode &&
  process.exitCode !==
    0
) {
  process.exit(
    process.exitCode,
  );
}
