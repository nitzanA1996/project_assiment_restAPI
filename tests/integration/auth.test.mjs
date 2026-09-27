import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, test } from 'node:test';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../../dist/config/env.js';
import { startServer } from '../../dist/server.js';
import { User } from '../../dist/users/user.model.js';
import { issueToken } from '../../dist/shared/security/token.js';
import { userInput } from '../fixtures.mjs';

const databaseName = `auth_test_${randomBytes(8).toString('hex')}`;
const testConfig = { ...env, NODE_ENV: 'test', PORT: 0, MONGODB_DB_NAME: databaseName,
  JWT_SECRET: randomBytes(48).toString('hex'), JWT_EXPIRES_IN: 3600 };
let server;
let baseUrl;
let registered;
let token;

before(async () => {
  server = await startServer(testConfig);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  try {
    // Only the randomly named database created by this run may be removed.
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === databaseName && /^auth_test_[a-f0-9]{16}$/.test(databaseName)) {
      await mongoose.connection.dropDatabase();
    }
  } finally {
    await mongoose.disconnect();
  }
});

async function post(path, body) {
  return fetch(`${baseUrl}${path}`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
async function getUser(id, accessToken = token) {
  return fetch(`${baseUrl}/users/${id}`, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
}

test('registration persists a hash, safe defaults and a real unique email index', async () => {
  const response = await post('/users', userInput);
  assert.equal(response.status, 201);
  registered = await response.json();
  assert.equal(registered.email, 'test@example.com');
  assert.equal(registered.isAdmin, false);
  assert.ok(registered.createdAt);
  for (const field of ['password', 'loginAttempts', 'lockUntil']) assert.equal(field in registered, false);
  const stored = await User.findById(registered._id).select('+password');
  assert.notEqual(stored.password, userInput.password);
  assert.equal(await bcrypt.compare(userInput.password, stored.password), true);
  const indexes = await User.collection.indexes();
  assert.ok(indexes.some(index => index.key.email === 1 && index.unique));
  const duplicate = await post('/users', { ...userInput, email: 'TEST@EXAMPLE.COM' });
  assert.equal(duplicate.status, 409);
});

test('registration cannot grant admin privileges and rejects weak passwords', async () => {
  assert.equal((await post('/users', { ...userInput, isAdmin: true })).status, 400);
  assert.equal((await post('/users', { ...userInput, password: 'weak' })).status, 400);
});

test('login returns a usable token and wrong credentials share the same safe response', async () => {
  const response = await post('/users/login', { email: 'TEST@example.com', password: userInput.password });
  assert.equal(response.status, 200);
  token = (await response.json()).token;
  assert.equal(typeof token, 'string');
  const ownProfile = await getUser(registered._id);
  assert.equal(ownProfile.status, 200);
  assert.equal('password' in await ownProfile.json(), false);
  const wrong = await post('/users/login', { email: userInput.email, password: 'WrongPass1!' });
  const missing = await post('/users/login', { email: 'missing@example.com', password: 'WrongPass1!' });
  assert.equal(wrong.status, 401);
  assert.equal(missing.status, 401);
  assert.deepEqual(await wrong.json(), await missing.json());
});

test('protected profiles reject absent, malformed and expired tokens and cross-user access', async () => {
  assert.equal((await getUser(registered._id, '')).status, 401);
  assert.equal((await getUser(registered._id, 'broken')).status, 401);
  const expired = issueToken({ _id: registered._id, isBusiness: false, isAdmin: false }, { ...testConfig, JWT_EXPIRES_IN: -1 });
  assert.equal((await getUser(registered._id, expired)).status, 401);
  assert.equal((await getUser(new mongoose.Types.ObjectId().toString())).status, 403);
  assert.equal((await getUser('bad-id')).status, 400);
});

test('authorization uses current database roles even when token flags are stale', async () => {
  const otherResponse = await post('/users', { ...userInput, email: 'other@example.com' });
  assert.equal(otherResponse.status, 201);
  const other = await otherResponse.json();
  await User.updateOne({ _id: registered._id }, { $set: { isAdmin: true } });
  assert.equal((await getUser(other._id)).status, 200);
  const adminToken = issueToken({ _id: registered._id, isAdmin: true, isBusiness: false }, testConfig);
  await User.updateOne({ _id: registered._id }, { $set: { isAdmin: false } });
  assert.equal((await getUser(other._id, adminToken)).status, 403);
});

test('concurrent duplicate registrations produce one success and one conflict', async () => {
  const responses = await Promise.all([1, 2].map(() => post('/users', { ...userInput, email: 'race@example.com' })));
  assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
});

test('deleting a user invalidates previously issued tokens', async () => {
  await User.deleteOne({ _id: registered._id });
  assert.equal((await getUser(registered._id)).status, 401);
});
