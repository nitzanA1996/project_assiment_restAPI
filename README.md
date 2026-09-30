# Business Cards and Users API

A REST API for users and business cards, built with Node.js, Express, TypeScript and MongoDB.
It uses Mongoose, bcryptjs, Morgan and CORS. Request validation uses **Zod** and JWTs use **jose**.

## Setup

1. Install Node.js 24 or newer and run `npm ci`.
2. Copy `.env.example` to `.env` and add your own database URI and JWT secret. Keep `.env` private.
3. For Atlas, set `DB_TARGET=atlas` and `MONGODB_ATLAS_URI` to a plain MongoDB connection string.
   Add your IP to Atlas Network Access. For local MongoDB, set `DB_TARGET=local` and
   `MONGODB_LOCAL_URI`; use a replica set because user deletion runs in a transaction.
4. Run `npm run dev` for development, or `npm run build` followed by `npm start`.

`MONGODB_DB_NAME` selects the database (default: `business_cards`). `PORT` defaults to `3000`.
`JWT_SECRET` needs at least 32 characters; `JWT_EXPIRES_IN` defaults to `1h`.
`CORS_ORIGINS` is a comma-separated list of allowed browser origins.
Run `npm run typecheck` to check types without starting the server.
The server starts listening only after MongoDB connects and the indexes are initialized.

## Authentication and requests

Send JSON with `Content-Type: application/json`. Register with `POST /users`:

```json
{
  "name": { "first": "Test", "last": "User" },
  "phone": "050-0000000",
  "email": "test@example.com",
  "password": "ExamplePass1!",
  "isBusiness": true,
  "address": { "country": "Israel", "city": "Tel Aviv", "street": "Herzl", "houseNumber": 5 }
}
```

Log in with `POST /users/login` and `{ "email": "test@example.com", "password": "ExamplePass1!" }`.
The response is `{ "token": "..." }`. Send it as `Authorization: Bearer <token>` on protected routes.
The example password is illustrative; registration never creates accounts automatically.
Public registration cannot set `isAdmin`. Passwords are stored as bcrypt hashes and are never returned.

## Endpoints

| Method | Path | Access and action |
| --- | --- | --- |
| POST | `/users` | Public: register a user |
| POST | `/users/login` | Public: log in |
| GET | `/users` | Admin: list users |
| GET | `/users/:id` | User or admin: get a user |
| PUT | `/users/:id` | User: replace their editable profile |
| PATCH | `/users/:id` | User: set `isBusiness` |
| DELETE | `/users/:id` | User or admin: delete a user |
| GET | `/cards` | Public: list cards |
| GET | `/cards/my-cards` | Registered user: list their cards |
| GET | `/cards/:id` | Public: get a card |
| POST | `/cards` | Business user: create a card |
| PUT | `/cards/:id` | Creator: replace editable card fields |
| PATCH | `/cards/:id` | Registered user: add or remove their like |
| DELETE | `/cards/:id` | Creator or admin: delete a card |
| PATCH | `/cards/:id/biz-number` | Admin: set `{ "bizNumber": 1234567 }` |

`PUT /users/:id` accepts `name`, `phone`, `email`, `address` and optional `image`.
`PATCH /users/:id` accepts `{ "isBusiness": true }` or `false`.
`POST /cards` and `PUT /cards/:id` accept `title`, `subtitle`, `description`, `phone`,
`email`, `address`, and optional `web` and `image`. The server assigns each new card's owner,
creation date, empty likes and a unique seven-digit `bizNumber`.
Clients cannot set server-owned fields such as `isAdmin`, `user_id`, `likes` or `bizNumber` during creation.
Zod validates request bodies and IDs; nested objects reject unknown fields.

Invalid input returns `400`, missing authentication `401`, insufficient permission `403`,
missing records `404`, and duplicate email or business number `409`. Errors are JSON:

```json
{ "error": { "code": "NOT_FOUND", "message": "The requested resource was not found." } }
```

## Assignment bonuses

- An admin can change a card's business number through `PATCH /cards/:id/biz-number`.
- HTTP responses with status `400` or higher are appended to UTC daily files in `logs/`.
- Three consecutive wrong passwords lock new logins for 24 hours. The third attempt and
  attempts during the lock return `429` with a `Retry-After` header. A successful login
  before the third failure resets the count.

## Initial data

Set `SEED_PASSWORD` and a different `SEED_ADMIN_PASSWORD` in your private `.env`, then run
`npm run seed`. This creates `demo.regular@example.com`, `demo.business@example.com` and
`demo.admin@example.com`. The first two use `SEED_PASSWORD`; the admin uses
`SEED_ADMIN_PASSWORD`. Three sample cards belong to the business user.
The seed can be rerun: existing sample records are left unchanged, and unrelated records are not removed.
