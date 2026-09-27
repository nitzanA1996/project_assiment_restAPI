import assert from 'node:assert/strict';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { User } from '../dist/users/user.model.js';
import { Card } from '../dist/cards/card.model.js';
import { registerUserSchema } from '../dist/users/user.schemas.js';
import { createCardSchema } from '../dist/cards/card.schemas.js';
import { userInput, cardInput } from './fixtures.mjs';

test('User validates hashed passwords and hides sensitive fields in serialized responses', async () => {
  const parsed = registerUserSchema.parse(userInput);
  const user = new User({ ...parsed, password: await bcrypt.hash(parsed.password, 4), loginAttempts: 2 });
  await user.validate();
  for (const serialized of [user.toJSON(), user.toObject()]) {
    for (const key of ['password', 'loginAttempts', 'lockUntil']) assert.equal(key in serialized, false);
  }
  assert.equal(user.isAdmin, false);
  const unsafe = new User(parsed);
  await assert.rejects(unsafe.validate(), /password/);
});

test('Card validates ownership, business numbers and unique likes without database access', async () => {
  const owner = new Types.ObjectId();
  const parsed = createCardSchema.parse(cardInput);
  const card = new Card({ ...parsed, user_id: owner, bizNumber: 1234567 });
  await card.validate();
  assert.deepEqual(card.likes, []);
  const invalid = new Card({ ...parsed, bizNumber: 12.5 });
  await assert.rejects(invalid.validate(), /user_id/);
  const duplicateLikes = new Card({ ...parsed, user_id: owner, bizNumber: 1234567, likes: [owner, owner] });
  await assert.rejects(duplicateLikes.validate(), /Duplicate likes/);
});

test('models declare unique indexes for emails and business numbers and an ownership index', () => {
  assert.ok(User.schema.indexes().some(([fields, options]) => fields.email === 1 && options.unique));
  assert.ok(Card.schema.indexes().some(([fields, options]) => fields.bizNumber === 1 && options.unique));
  assert.ok(Card.schema.indexes().some(([fields]) => fields.user_id === 1));
});
