import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import express from 'express';
import { createApp } from '../dist/app.js';
import { errorHandler } from '../dist/middleware/error-handler.js';

let server;
let baseUrl;
let ready = true;

before(async () => {
  const app = createApp({ allowedOrigins: ['http://localhost:5173'], isReady: () => ready,
    tokenConfig: { JWT_SECRET: 'test-only-signing-secret-of-32-characters', JWT_EXPIRES_IN: 3600 } });
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('health and readiness distinguish HTTP availability from database availability', async () => {
  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });
  assert.equal((await fetch(`${baseUrl}/ready`)).status, 200);
  ready = false;
  const unavailable = await fetch(`${baseUrl}/ready`);
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { status: 'unavailable' });
  ready = true;
});

test('unknown routes return a JSON 404', async () => {
  const response = await fetch(`${baseUrl}/missing`);
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error.code, 'NOT_FOUND');
});

test('malformed JSON and oversized bodies return 400 and 413', async () => {
  for (const [body, status, code] of [
    ['{"broken":', 400, 'INVALID_JSON'],
    [JSON.stringify({ value: 'a'.repeat(110000) }), 413, 'BODY_TOO_LARGE'],
  ]) {
    const response = await fetch(`${baseUrl}/missing`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
    });
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  }
});

test('non-JSON write requests return 415', async () => {
  const response = await fetch(`${baseUrl}/missing`, { method: 'POST', body: 'plain text' });
  assert.equal(response.status, 415);
  assert.equal((await response.json()).error.code, 'UNSUPPORTED_MEDIA_TYPE');
});

test('CORS allows configured origins and rejects other origins', async () => {
  const allowed = await fetch(`${baseUrl}/health`, { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  const denied = await fetch(`${baseUrl}/health`, { headers: { Origin: 'https://unlisted.example' } });
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).error.code, 'ORIGIN_NOT_ALLOWED');
});

test('CORS preflight allows authorization and JSON headers', async () => {
  const response = await fetch(`${baseUrl}/cards`, {
    method: 'OPTIONS', headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
  });
  assert.equal(response.status, 204);
  assert.match(response.headers.get('access-control-allow-headers'), /Authorization/);
});

test('unexpected async failures return a generic JSON 500', async () => {
  const fixture = express();
  fixture.get('/', async () => { throw new Error('private internal detail'); });
  fixture.use(errorHandler);
  const fixtureServer = fixture.listen(0, '127.0.0.1');
  await once(fixtureServer, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${fixtureServer.address().port}`);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' },
    });
  } finally {
    await new Promise((resolve) => fixtureServer.close(resolve));
  }
});
