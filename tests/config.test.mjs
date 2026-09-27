import assert from 'node:assert/strict';
import test from 'node:test';
import { parseEnvironment } from '../dist/config/env-schema.js';

const base = { DB_TARGET: 'local', MONGODB_LOCAL_URI: 'mongodb://127.0.0.1:27017/test', JWT_SECRET: 'test-only-signing-secret-of-32-characters' };

test('local configuration does not require Atlas credentials', () => {
  const result = parseEnvironment(base);
  assert.equal(result.PORT, 3000);
  assert.deepEqual(result.CORS_ORIGINS, ['http://localhost:5173']);
});

test('Atlas is selected explicitly and requires its own URI', () => {
  assert.throws(() => parseEnvironment({ ...base, DB_TARGET: 'atlas' }), /MONGODB_ATLAS_URI/);
  const result = parseEnvironment({
    ...base, DB_TARGET: 'atlas', MONGODB_ATLAS_URI: 'mongodb+srv://example.invalid/',
    MONGODB_DB_NAME: 'isolated_test',
  });
  assert.equal(result.MONGODB_DB_NAME, 'isolated_test');
});

test('malformed configuration is rejected without exposing values', () => {
  for (const PORT of ['', 'abc', '0', '65536', '3.5']) {
    assert.throws(() => parseEnvironment({ ...base, PORT }), /configuration: PORT/);
  }
  const secret = 'mongodb+srv://user:[private@host](mailto:private@host)/';
  assert.throws(() => parseEnvironment({ ...base, DB_TARGET: 'atlas', MONGODB_ATLAS_URI: secret }),
    (error) => error.message.includes('MONGODB_ATLAS_URI') && !error.message.includes('private'));
  assert.throws(() => parseEnvironment({ ...base, NODE_ENV: 'unknown' }), /NODE_ENV/);
});

test('CORS accepts origin lists but rejects wildcards, paths and credentials', () => {
  const result = parseEnvironment({ ...base, CORS_ORIGINS: 'https://example.com, http://localhost:5173' });
  assert.deepEqual(result.CORS_ORIGINS, ['https://example.com', 'http://localhost:5173']);
  for (const CORS_ORIGINS of ['*', 'https://example.com/path', 'https://user:pass@example.com']) {
    assert.throws(() => parseEnvironment({ ...base, CORS_ORIGINS }), /CORS_ORIGINS/);
  }
});
