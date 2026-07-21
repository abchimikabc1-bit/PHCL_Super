#!/usr/bin/env node

import process from 'process';
import path from 'path';
import fs from 'fs';
import http from 'http';
import net from 'net';
import { spawn } from 'child_process';

const root = process.cwd();
const requestedPort = process.env.SMOKE_PORT ? Number(process.env.SMOKE_PORT) : null;
const requiredBuildFile = path.join(root, '.next', 'BUILD_ID');
const nextBinPath = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');

const pageChecks = [
  { path: '/', expectedStatus: 200 },
  { path: '/marketplace', expectedStatus: 200 },
  { path: '/cart', expectedStatus: 200 },
  { path: '/checkout', expectedStatus: 200 },
  { path: '/product/1', expectedStatus: 200 },
  { path: '/admin/login', expectedStatus: 200 },
  { path: '/admin/products', expectedStatus: 307 },
];

const redirectChecks = [
  { path: '/', expectedStatus: 308, expectedLocation: 'https://www.phclsuper.com', host: 'phclsuper.com' },
  { path: '/marketplace', expectedStatus: 308, expectedLocation: 'https://www.phclsuper.com/marketplace', host: 'phclsuper.com' },
  { path: '/cart', expectedStatus: 308, expectedLocation: 'https://www.phclsuper.com/cart', host: 'phclsuper.com' },
  { path: '/checkout', expectedStatus: 308, expectedLocation: 'https://www.phclsuper.com/checkout', host: 'phclsuper.com' },
  { path: '/product/1', expectedStatus: 308, expectedLocation: 'https://www.phclsuper.com/product/1', host: 'phclsuper.com' },
  { path: '/admin/login', expectedStatus: 308, expectedLocation: 'https://www.phclsuper.com/admin/login', host: 'phclsuper.com' },
  { path: '/admin/products', expectedStatus: 308, expectedLocation: 'https://www.phclsuper.com/admin/products', host: 'phclsuper.com' },
];

const apiChecks = [
  {
    path: '/api/admin/auth',
    method: 'GET',
    expectedStatus: 401,
    expectedBodyIncludes: ['"authenticated":false', 'No admin session found'],
  },
  {
    path: '/api/chat',
    method: 'GET',
    expectedStatus: 405,
  },
];

function fail(message) {
  console.error(`\nSmoke check failed: ${message}`);
  process.exit(1);
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(requestedPort || 0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        if (!port) {
          reject(new Error('Could not determine an available port'));
          return;
        }
        resolve(port);
      });
    });
  });
}

function requestRoute(baseUrl, route, method = 'GET', body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(route, baseUrl);
    const payload = typeof body === 'string' ? body : undefined;
    const req = http.request(
      {
        protocol: url.protocol,
        hostname: '127.0.0.1',
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method,
        family: 4,
        headers: {
          ...(payload
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
              }
            : {}),
          ...extraHeaders,
        },
      },
      (res) => {
        let responseBody = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        res.resume();
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            location: typeof res.headers.location === 'string' ? res.headers.location : '',
            body: responseBody,
          });
        });
      }
    );

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error(`Request timeout for ${route}`));
    });
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function waitForServerReady(baseUrl, timeoutMs = 60000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await requestRoute(baseUrl, '/');
      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch {
      // Retry until server is ready.
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw new Error(`Server did not become ready at ${baseUrl} within ${timeoutMs}ms`);
}

async function run() {
  if (!fs.existsSync(requiredBuildFile)) {
    fail(`Missing build artifact: ${path.relative(root, requiredBuildFile)}. Run npm run build first.`);
  }

  if (!fs.existsSync(nextBinPath)) {
    fail(`Missing Next.js runtime binary: ${path.relative(root, nextBinPath)}`);
  }

  const port = await getAvailablePort();
  const baseUrl = `http://localhost:${port}`;
  const server = spawn(process.execPath, [nextBinPath, 'start', '-p', String(port)], {
    cwd: root,
    env: {
      ...process.env,
      ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@phclsuper.com',
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'PHCL_Admin_2026_Secure!',
      ADMIN_SESSION_SECRET:
        process.env.ADMIN_SESSION_SECRET || 'phcl_admin_session_secret_smoke_test_only',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  let sawReadySignal = false;

  server.stdout.on('data', (chunk) => {
    const text = String(chunk);
    stdout += text;
    if (text.includes('Ready in')) {
      sawReadySignal = true;
    }
  });

  server.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });

  const stopServer = async () => {
    if (server.killed) {
      return;
    }

    server.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!server.killed) {
      server.kill('SIGKILL');
    }
  };

  try {
    const readySignalDeadline = Date.now() + 15000;
    while (!sawReadySignal && Date.now() < readySignalDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    await waitForServerReady(baseUrl);

    const failures = [];
    for (const check of pageChecks) {
      try {
        const response = await requestRoute(baseUrl, check.path);
        if (response.status !== check.expectedStatus) {
          failures.push(`${check.path} returned ${response.status}, expected ${check.expectedStatus}`);
        } else {
          console.log(`PASS ${check.path} -> ${response.status}`);
        }
      } catch (error) {
        failures.push(`${check.path} request failed: ${error.message}`);
      }
    }

    for (const check of redirectChecks) {
      try {
        const response = await requestRoute(baseUrl, check.path, 'GET', undefined, {
          Host: check.host,
        });
        if (response.status !== check.expectedStatus) {
          failures.push(`[host:${check.host}] ${check.path} returned ${response.status}, expected ${check.expectedStatus}`);
        } else if (response.location !== check.expectedLocation) {
          failures.push(`[host:${check.host}] ${check.path} redirected to ${response.location || '(empty)'}, expected ${check.expectedLocation}`);
        } else {
          console.log(`PASS [host:${check.host}] ${check.path} -> ${response.status} ${response.location}`);
        }
      } catch (error) {
        failures.push(`[host:${check.host}] ${check.path} request failed: ${error.message}`);
      }
    }

    if (failures.length > 0) {
      console.error('\nRoute smoke failures:');
      for (const failure of failures) {
        console.error(`- ${failure}`);
      }
      if (stderr.trim()) {
        console.error('\nServer stderr snapshot:');
        console.error(stderr.split('\n').slice(-20).join('\n'));
      }
      process.exitCode = 1;
      return;
    }

    console.log('\nRoute smoke check passed.');

    const apiFailures = [];
    for (const check of apiChecks) {
      try {
        const response = await requestRoute(baseUrl, check.path, check.method);
        if (response.status !== check.expectedStatus) {
          apiFailures.push(`${check.method} ${check.path} returned ${response.status}, expected ${check.expectedStatus}`);
          continue;
        }

        if (check.expectedBodyIncludes) {
          const missingFragments = check.expectedBodyIncludes.filter((fragment) => !response.body.includes(fragment));
          if (missingFragments.length > 0) {
            apiFailures.push(`${check.method} ${check.path} body missing expected fragment(s): ${missingFragments.join(', ')}`);
            continue;
          }
        }

        console.log(`PASS ${check.method} ${check.path} -> ${response.status}`);
      } catch (error) {
        apiFailures.push(`${check.method} ${check.path} request failed: ${error.message}`);
      }
    }

    if (apiFailures.length > 0) {
      console.error('\nAPI smoke failures:');
      for (const failure of apiFailures) {
        console.error(`- ${failure}`);
      }
      if (stderr.trim()) {
        console.error('\nServer stderr snapshot:');
        console.error(stderr.split('\n').slice(-20).join('\n'));
      }
      process.exitCode = 1;
      return;
    }

    console.log('\nAPI smoke check passed.');
  } catch (error) {
    console.error(`\nSmoke check failed before route assertions: ${error.message}`);
    if (stdout.trim()) {
      console.error('\nServer stdout snapshot:');
      console.error(stdout.split('\n').slice(-20).join('\n'));
    }
    if (stderr.trim()) {
      console.error('\nServer stderr snapshot:');
      console.error(stderr.split('\n').slice(-20).join('\n'));
    }
    process.exitCode = 1;
  } finally {
    await stopServer();
  }
}

await run();
if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}
