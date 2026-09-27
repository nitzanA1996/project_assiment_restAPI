import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { hashPassword, verifyPassword } from '../dist/shared/security/password.js';
import { issueToken, verifyToken } from '../dist/shared/security/token.js';
import { parseEnvironment } from '../dist/config/env-schema.js';

const config = { JWT_SECRET: 'test-only-secret-with-at-least-32-characters', JWT_EXPIRES_IN: 3600 };
const user = { _id: '0123456789abcdef01234567', isAdmin: false, isBusiness: true };

test('bcrypt hashes passwords and rejects wrong or truncated-equivalent inputs', async () => {
  const password = `Aa1!${'x'.repeat(68)}`;
  const hash = await hashPassword(password);
  assert.notEqual(hash, password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword('WrongPassword1!', hash), false);
  assert.equal(await verifyPassword(`${password}extra`, hash), false);
});

test('JWTs have a bounded expiry and the required public claims', () => {
  const token = issueToken({ ...user, password: 'must-not-be-in-token' }, config);
  const claims = verifyToken(token, config);
  assert.equal(claims._id, user._id);
  assert.equal(claims.isBusiness, true);
  const payload = jwt.decode(token);
  assert.equal(payload.exp - payload.iat, 3600);
  assert.equal('password' in payload, false);
});

test('invalid signatures, expired tokens, unexpected algorithms and malformed claims are rejected', () => {
  const sign = (payload, options = {}, key = config.JWT_SECRET) => jwt.sign(payload, key, {
    algorithm: 'HS256', issuer: 'business-cards-api', audience: 'business-cards-client', expiresIn: 3600, ...options,
  });
  for (const token of [
    'broken', sign(user, {}, 'wrong-secret'), sign(user, { expiresIn: -1 }),
    sign(user, { algorithm: 'HS384' }), sign({ ...user, _id: 'bad-id' }),
    sign({ ...user, isAdmin: 'true' }), sign(user, { audience: 'another-client' }),
  ]) {
    assert.throws(() => verifyToken(token, config), (error) => error.status === 401);
  }
});

test('JWT environment settings require a secret and explicit expiry units', () => {
  const base = { DB_TARGET: 'local', MONGODB_LOCAL_URI: 'mongodb://127.0.0.1/test', JWT_SECRET: config.JWT_SECRET };
  assert.equal(parseEnvironment({ ...base, JWT_EXPIRES_IN: '2h' }).JWT_EXPIRES_IN, 7200);
  for (const JWT_EXPIRES_IN of ['3600', '0h', '-1h', '8d', 'forever']) {
    assert.throws(() => parseEnvironment({ ...base, JWT_EXPIRES_IN }), /JWT_EXPIRES_IN/);
  }
  assert.throws(() => parseEnvironment({ ...base, JWT_SECRET: '' }), /JWT_SECRET/);
});
