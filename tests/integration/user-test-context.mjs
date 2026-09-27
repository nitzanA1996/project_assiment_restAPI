import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../../dist/config/env.js';
import { startServer } from '../../dist/server.js';
import { User } from '../../dist/users/user.model.js';
import { registerUserSchema } from '../../dist/users/user.schemas.js';
import { hashPassword } from '../../dist/shared/security/password.js';
import { issueToken } from '../../dist/shared/security/token.js';
import { userInput } from '../fixtures.mjs';

export async function createUserTestContext() {
  const databaseName = `users_test_${randomBytes(8).toString('hex')}`;
  const config = { ...env, NODE_ENV: 'test', PORT: 0, MONGODB_DB_NAME: databaseName,
    JWT_SECRET: randomBytes(48).toString('hex'), JWT_EXPIRES_IN: 3600 };
  const server = await startServer(config);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const password = await hashPassword(userInput.password);

  async function createUser(label, isAdmin = false) {
    const input = registerUserSchema.parse({ ...userInput, email: `${label}@example.com` });
    const user = await User.create({ ...input, password, isAdmin });
    return { user, token: issueToken({ _id: user.id, isBusiness: user.isBusiness, isAdmin }, config) };
  }

  async function request(method, path, actor, body) {
    return fetch(`${baseUrl}${path}`, {
      method, headers: { ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }

  async function cleanup() {
    await new Promise(resolve => server.close(resolve));
    try {
      assert.equal(mongoose.connection.name, databaseName);
      assert.match(databaseName, /^users_test_[a-f0-9]{16}$/);
      await mongoose.connection.dropDatabase();
    } finally {
      await mongoose.disconnect();
    }
  }
  return { createUser, request, cleanup };
}
