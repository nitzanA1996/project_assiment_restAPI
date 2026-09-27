import assert from 'node:assert/strict';
import test from 'node:test';
import { registerUserSchema, updateUserSchema, loginSchema, businessStatusSchema } from '../dist/users/user.schemas.js';
import { createCardSchema, updateCardSchema, updateBizNumberSchema } from '../dist/cards/card.schemas.js';
import { idParamsSchema } from '../dist/shared/schemas/common.schema.js';
import { userInput, cardInput, address } from './fixtures.mjs';

test('registration normalizes assignment input and applies nested defaults', () => {
  const result = registerUserSchema.parse(userInput);
  assert.equal(result.email, 'test@example.com');
  assert.equal(result.phone, '0500000000');
  assert.equal(result.address.houseNumber, 5);
  assert.equal(result.address.zip, 0);
  assert.equal(result.address.state, 'not defined');
  assert.equal(result.name.middle, '');
  assert.equal(result.isBusiness, false);
  assert.match(result.image.url, /^https:\/\//);
  assert.ok(result.image.alt);
});

test('server fields and nested unknown fields cannot enter registration', () => {
  for (const key of ['_id', 'isAdmin', 'loginAttempts', 'lockUntil', 'createdAt']) {
    assert.equal(registerUserSchema.safeParse({ ...userInput, [key]: true }).success, false);
  }
  assert.equal(registerUserSchema.safeParse({ ...userInput, name: { ...userInput.name, isAdmin: true } }).success, false);
  assert.equal(businessStatusSchema.safeParse({ isBusiness: 'false' }).success, false);
});

test('numeric strings are accepted without coercing blank, null or boolean values', () => {
  for (const houseNumber of ['', null, true, 0, -1, 1.5, '1e3']) {
    assert.equal(registerUserSchema.safeParse({ ...userInput, address: { ...address, houseNumber } }).success, false);
  }
  assert.equal(registerUserSchema.parse({ ...userInput, address: { ...address, zip: '12345' } }).address.zip, 12345);
});

test('password validation counts bytes and login preserves the original password', () => {
  for (const password of ['short', 'alllowercase1!', 'NoDigitsHere!', `Aa1!${'א'.repeat(35)}`]) {
    assert.equal(registerUserSchema.safeParse({ ...userInput, password }).success, false);
  }
  assert.equal(loginSchema.parse({ email: 'USER@example.com', password: ' old password ' }).password, ' old password ');
});

test('PUT requires the full editable profile and disallows password or role changes', () => {
  const { password, ...profile } = userInput;
  assert.equal(updateUserSchema.safeParse(profile).success, true);
  assert.equal(updateUserSchema.safeParse(userInput).success, false);
  assert.equal(updateUserSchema.safeParse({ name: profile.name }).success, false);
  assert.equal(updateUserSchema.safeParse({ ...profile, isBusiness: true }).success, false);
});

test('card schemas reject protected fields, invalid URLs and partial PUT payloads', () => {
  const result = createCardSchema.parse({ ...cardInput, image: { url: '', alt: '' } });
  assert.equal(result.web, '');
  assert.match(result.image.url, /^https:\/\//);
  for (const key of ['bizNumber', 'user_id', 'likes', 'createdAt']) {
    assert.equal(createCardSchema.safeParse({ ...cardInput, [key]: 'forbidden' }).success, false);
  }
  assert.equal(createCardSchema.safeParse({ ...cardInput, web: 'javascript:alert(1)' }).success, false);
  assert.equal(updateCardSchema.safeParse({ title: 'New title' }).success, false);
  assert.equal(updateBizNumberSchema.safeParse({ bizNumber: 1234567 }).success, true);
  assert.equal(updateBizNumberSchema.safeParse({ bizNumber: 123 }).success, false);
  assert.equal(idParamsSchema.safeParse({ id: 'invalid' }).success, false);
});
