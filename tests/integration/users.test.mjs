import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { Types } from 'mongoose';
import { User } from '../../dist/users/user.model.js';
import { Card } from '../../dist/cards/card.model.js';
import { createCardSchema } from '../../dist/cards/card.schemas.js';
import { createUserTestContext } from './user-test-context.mjs';
import { userInput, cardInput } from '../fixtures.mjs';

let context, admin, owner, other;
const { password: _password, ...profile } = userInput;
const safe = value => {
  for (const key of ['password', 'loginAttempts', 'lockUntil', '__v']) assert.equal(key in value, false);
};
before(async () => {
  context = await createUserTestContext();
  admin = await context.createUser('admin', true);
  owner = await context.createUser('owner');
  other = await context.createUser('other');
});
after(async () => { if (context) await context.cleanup(); });

test('only admins can list users and every returned profile is safe', async () => {
  assert.equal((await context.request('GET', '/users')).status, 401);
  assert.equal((await context.request('GET', '/users', owner)).status, 403);
  const response = await context.request('GET', '/users', admin);
  assert.equal(response.status, 200);
  const users = await response.json();
  assert.equal(users.length, 3);
  users.forEach(safe);
});

test('profile edits require ownership even for admins', async () => {
  const path = `/users/${owner.user.id}`;
  const body = { ...profile, email: ' OWNER@EXAMPLE.COM ', name: { first: 'Updated', last: 'User' } };
  for (const [actor, status] of [[undefined, 401], [other, 403], [admin, 403], [owner, 200]]) {
    const response = await context.request('PUT', path, actor, body);
    assert.equal(response.status, status);
    if (status === 200) {
      const updated = await response.json();
      assert.equal(updated.name.first, 'Updated');
      assert.equal(updated.email, 'owner@example.com');
      safe(updated);
    }
  }
});

test('editing an email cannot overwrite another account or partially save a failed update', async () => {
  const response = await context.request('PUT', `/users/${owner.user.id}`, owner,
    { ...profile, email: 'OTHER@example.com', name: { first: 'Rejected', last: 'User' } });
  assert.equal(response.status, 409);
  const stored = await User.findById(owner.user.id);
  assert.equal(stored.email, 'owner@example.com');
  assert.equal(stored.name.first, 'Updated');
});

test('profile PUT rejects partial input and protected fields', async () => {
  for (const body of [{ name: { first: 'Partial' } }, { ...profile, password: 'NewPass1!' },
    { ...profile, isAdmin: true }, { ...profile, isBusiness: true }, { ...profile, loginAttempts: 0 }]) {
    assert.equal((await context.request('PUT', `/users/${owner.user.id}`, owner, body)).status, 400);
  }
});

test('business status changes require the owner and an explicit boolean value', async () => {
  const path = `/users/${owner.user.id}`;
  for (const [actor, status] of [[undefined, 401], [other, 403], [admin, 403], [owner, 200]]) {
    assert.equal((await context.request('PATCH', path, actor, { isBusiness: true })).status, status);
  }
  assert.equal((await context.request('PATCH', path, owner, { isBusiness: 'false' })).status, 400);
  assert.equal((await context.request('PATCH', path, owner, { isBusiness: false, isAdmin: true })).status, 400);
  const updated = await context.request('PATCH', path, owner, { isBusiness: false });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).isBusiness, false);
  const current = await context.request('GET', path, owner);
  assert.equal((await current.json()).isBusiness, false);
});

test('malformed IDs return 400 and authorized missing-user lookups or deletes return 404', async () => {
  for (const method of ['GET', 'PUT', 'PATCH', 'DELETE']) {
    const body = method === 'PUT' ? profile : method === 'PATCH' ? { isBusiness: true } : undefined;
    assert.equal((await context.request(method, '/users/bad-id', owner, body)).status, 400);
  }
  const missing = new Types.ObjectId().toString();
  assert.equal((await context.request('GET', `/users/${missing}`, admin)).status, 404);
  assert.equal((await context.request('DELETE', `/users/${missing}`, admin)).status, 404);
});

test('unauthorized deletes leave users and cards unchanged', async () => {
  for (const [actor, status] of [[undefined, 401], [other, 403]]) {
    assert.equal((await context.request('DELETE', `/users/${owner.user.id}`, actor)).status, status);
  }
  assert.ok(await User.exists({ _id: owner.user.id }));
});

test('failed cleanup rolls back user removal, owned cards and likes', async (t) => {
  const victim = await context.createUser('rollback');
  const card = await Card.create({ ...createCardSchema.parse(cardInput), user_id: victim.user.id, bizNumber: 1234567 });
  const liked = await Card.create({ ...createCardSchema.parse(cardInput), user_id: other.user.id,
    bizNumber: 1234568, likes: [victim.user.id, other.user.id] });
  const failure = t.mock.method(Card, 'updateMany', () => { throw new Error('Simulated cleanup failure'); });
  try {
    const response = await context.request('DELETE', `/users/${victim.user.id}`, victim);
    assert.equal(response.status, 500);
    assert.equal((await response.json()).error.code, 'INTERNAL_ERROR');
  } finally { failure.mock.restore(); }
  assert.ok(await User.exists({ _id: victim.user.id }));
  assert.ok(await Card.exists({ _id: card.id }));
  assert.deepEqual((await Card.findById(liked.id)).likes.map(String), [victim.user.id, other.user.id]);
});

test('self-deletion removes owned cards and only that user from other cards likes', async () => {
  const victim = await context.createUser('self-delete');
  const card = await Card.create({ ...createCardSchema.parse(cardInput), user_id: victim.user.id, bizNumber: 1234569 });
  const liked = await Card.create({ ...createCardSchema.parse(cardInput), user_id: other.user.id,
    bizNumber: 1234570, likes: [victim.user.id, other.user.id] });
  const response = await context.request('DELETE', `/users/${victim.user.id}`, victim);
  assert.equal(response.status, 200);
  const deleted = await response.json();
  assert.equal(deleted._id, victim.user.id);
  safe(deleted);
  assert.equal(await User.findById(victim.user.id), null);
  assert.equal(await Card.findById(card.id), null);
  assert.deepEqual((await Card.findById(liked.id)).likes.map(String), [other.user.id]);
  assert.equal((await context.request('GET', `/users/${victim.user.id}`, victim)).status, 401);
});

test('admins can delete another user but cannot use a stale admin token after demotion', async () => {
  const victim = await context.createUser('admin-delete');
  assert.equal((await context.request('DELETE', `/users/${victim.user.id}`, admin)).status, 200);
  await User.updateOne({ _id: admin.user.id }, { $set: { isAdmin: false } });
  assert.equal((await context.request('GET', '/users', admin)).status, 403);
  assert.equal((await context.request('DELETE', `/users/${other.user.id}`, admin)).status, 403);
  assert.ok(await User.exists({ _id: other.user.id }));
});
