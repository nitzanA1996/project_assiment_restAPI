import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import { validate } from '../dist/middleware/validate.js';
import { errorHandler } from '../dist/middleware/error-handler.js';
import { registerUserSchema } from '../dist/users/user.schemas.js';
import { idParamsSchema } from '../dist/shared/schemas/common.schema.js';
import { userInput } from './fixtures.mjs';

test('validation middleware supplies parsed values and returns field-level JSON errors', async () => {
  const app = express();
  app.use(express.json());
  app.post('/:id', validate(idParamsSchema, 'params'), validate(registerUserSchema), (_request, response) => {
    const validated = response.locals.validated;
    response.json({ id: validated.params.id, email: validated.body.email });
  });
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const send = (id, body) => fetch(`http://127.0.0.1:${server.address().port}/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const id = '0123456789abcdef01234567';
    const valid = await send(id, userInput);
    assert.equal(valid.status, 200);
    assert.deepEqual(await valid.json(), { id, email: 'test@example.com' });
    const invalid = await send(id, { ...userInput, email: 'wrong' });
    assert.equal(invalid.status, 400);
    const result = await invalid.json();
    assert.equal(result.error.code, 'VALIDATION_ERROR');
    assert.ok(result.error.details.some((issue) => issue.path === 'email'));
    assert.equal((await send('invalid', userInput)).status, 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
