# Business Cards and Users API

Final course project built with Node.js, Express 5, TypeScript and MongoDB.
Input validation uses **Zod instead of Joi**. Documentation and code comments are written in English.

## Current progress

The server foundation includes validated configuration, an Atlas/local MongoDB connection,
JSON parsing, CORS, Morgan request logging and centralized JSON errors.
The HTTP listener starts only after MongoDB connects successfully.
User and Card models, unique-index definitions, Zod input schemas and validation middleware are implemented.
All seven required user endpoints are implemented, with bcrypt, signed JWTs and role/ownership checks.
Card endpoints, seed data and assignment bonuses are upcoming work.
The server initializes User and Card storage, including unique email/business-number indexes, before accepting requests.

## Requirements and installation

- Node.js 24 or newer and npm.
- A MongoDB Atlas database user and an Atlas IP access entry for your machine, or a local MongoDB server.
- Install dependencies with `npm ci`.
- Copy `.env.example` to `.env` only if `.env` does not already exist. Never overwrite existing credentials.

## Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `NODE_ENV` | `development`, `test` or `production` | `development` |
| `PORT` | Integer from 1 to 65535 | `3000` |
| `DB_TARGET` | `atlas` or `local` | `atlas` |
| `MONGODB_ATLAS_URI` | Required when Atlas is selected | None |
| `MONGODB_LOCAL_URI` | Required when local MongoDB is selected | None |
| `MONGODB_DB_NAME` | Explicit database name; overrides the URI database path | `business_cards` |
| `CORS_ORIGINS` | Comma-separated HTTP origins, without trailing slashes or paths | `http://localhost:5173` |
| `JWT_SECRET` | Required random signing secret, at least 32 characters | None |
| `JWT_EXPIRES_IN` | Positive duration with `s`, `m`, `h` or `d`; at most seven days | `1h` |

Keep the signing secret only in your local `.env` or deployment environment. Generate it with a
cryptographically secure random generator. Changing it invalidates existing tokens.

### Atlas

Select **Connect → Drivers** in Atlas and paste the plain connection string into
`MONGODB_ATLAS_URI` in your local `.env`. Set `DB_TARGET=atlas`.
Replace credential placeholders with your database user's credentials. Percent-encode reserved
characters in the username/password components. Do not paste a Markdown or `mailto:` link.
Use a database user with access to the selected database and allow your current IP in Atlas Network Access.
The app explicitly selects `business_cards` unless `MONGODB_DB_NAME` is changed.

### Local MongoDB

Start your local MongoDB service, set `DB_TARGET=local`, and set
`MONGODB_LOCAL_URI=mongodb://127.0.0.1:27017/business_cards`.
Only the URI selected by `DB_TARGET` is required. Local MongoDB must run as a replica set
to support transactional user deletion; a standalone server cannot execute this operation.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the server with TypeScript file watching |
| `npm run typecheck` | Check TypeScript types |
| `npm run build` | Compile into `dist/` |
| `npm start` | Run the compiled server after building |
| `npm test` | Build and run isolated HTTP/configuration tests using Node's test runner |
| `npm run check:db` | Build, connect to the selected database, ping it and verify HTTP readiness without writing application data |
| `npm run test:integration` | Run live authentication and user-management tests against isolated temporary databases |

`npm test` does not connect to Atlas, read credentials, or modify database records.
`test:integration` reads the local connection settings, overrides the database name with an isolated
`auth_test_...` or `users_test_...` name, writes test users/cards and removes only that generated database in cleanup.
Its database user needs permission to create collections/indexes and remove the temporary database.
It never uses the configured application database for test records.
`check:db` is a separate live connection check and uses the credentials in your local `.env`.
It also runs normal startup initialization, which can create the users/cards collections and their indexes.
The test runner is built into Node; no test framework dependency is required for this stage.

## Available endpoints

| Method | Path | Response |
| --- | --- | --- |
| GET | `/health` | `200`, `{ "status": "ok" }` when HTTP is running |
| GET | `/ready` | `200`, `{ "status": "ready" }` when Mongoose reports connected; otherwise `503`, `{ "status": "unavailable" }` |
| POST | `/users` | Public registration; `201`, safe user profile |
| POST | `/users/login` | Public login; `200`, `{ "token": "..." }` |
| GET | `/users/:id` | User themselves or an admin; `200`, safe user profile |
| GET | `/users` | Admin only; `200`, array of safe user profiles |
| PUT | `/users/:id` | User themselves only; `200`, updated safe profile |
| PATCH | `/users/:id` | User themselves only; `200`, profile with updated business status |
| DELETE | `/users/:id` | User themselves or an admin; `200`, deleted safe profile |

Readiness reflects the connection state, not a separate database ping on every request.
Unknown endpoints return `404`. POST/PUT/PATCH requests must use `Content-Type: application/json`.
JSON bodies are limited to 100 KB. Invalid JSON returns `400`, oversized bodies return `413`,
and unsupported content types return `415`.

Errors use this shape:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested resource was not found."
  }
}
```

Unexpected errors return a generic `500` without exposing internal details.
CORS rejects unlisted browser origins with `403`; requests without an Origin header are allowed.
CORS does not replace authentication or authorization.
Morgan logs the timestamp, method, path, response status and duration; query strings are omitted.
File-based error logging is a later bonus.

## Registration and login

Send registration as JSON to `POST /users`:

```json
{
  "name": { "first": "Test", "last": "User" },
  "phone": "050-0000000",
  "email": "test@example.com",
  "password": "ExamplePass1!",
  "isBusiness": false,
  "address": { "country": "Israel", "city": "Tel Aviv", "street": "Herzl", "houseNumber": 5 }
}
```

The returned profile contains its `_id`, normalized fields and creation time. Password hashes
and login-lock metadata are never returned. Duplicate emails return `409`, including concurrent requests.
Trying to set `isAdmin` or other server-owned fields returns `400`.

Send `{ "email": "test@example.com", "password": "ExamplePass1!" }` to `POST /users/login`.
The password above is only an example, not a seeded or built-in account.
Incorrect credentials return the same `401` message for an unknown email or a wrong password.
The 24-hour login-lock bonus is not implemented yet.

Use the returned token with `Authorization: Bearer <token>` for `GET /users/<user-id>`.
Missing, invalid, expired tokens or tokens belonging to deleted users return `401`.
Reading another user's profile requires a current admin role; otherwise the response is `403`.
A malformed ID returns `400`; an authorized lookup of a missing user returns `404`.

Tokens use HS256 with a required expiration, issuer and audience. Their payload contains `_id`,
`isBusiness` and `isAdmin`. Tokens are signed, not encrypted. Current roles are loaded from MongoDB
on every authenticated request, so old tokens cannot retain privileges removed in the database.

## Data models and input validation

### User management

All user-management endpoints require `Authorization: Bearer <token>`. Admin privileges allow listing,
reading and deleting other users, but do not allow editing another user's profile or business status.
Roles are loaded from the database for every request.

`PUT /users/:id` accepts a full editable profile: `name`, `phone`, `email`, `address` and optional `image`.
It rejects `password`, `isAdmin`, `isBusiness` and other server-owned fields. Missing optional fields receive
their schema defaults. Changing email to an existing normalized address returns `409` without changing any profile fields.

`PATCH /users/:id` accepts only `{ "isBusiness": true }` or `{ "isBusiness": false }`.
It sets the requested value explicitly; it does not toggle the current value. Existing cards remain when
a user becomes non-business. Card creation rules will be enforced when card routes are added.

`DELETE /users/:id` removes the user, their owned cards and their user ID from likes on other cards.
The three operations run sequentially within one MongoDB transaction. A failure rolls back all changes;
there is no fallback to partial deletion. The response contains the deleted profile without sensitive fields.
Previously issued tokens stop working once the user no longer exists.

Unauthenticated requests return `401`, unauthorized actions return `403`, malformed IDs return `400`,
and authorized operations on missing users return `404`. An admin's attempt to edit another user remains `403`.

### Storage and schemas

`User` stores name, contact details, image, address, a bcrypt password hash, business/admin flags,
creation time and internal login-lock fields. Sensitive fields are excluded from normal queries
and removed by document serialization. Future services must explicitly select password hashes only for authentication;
lean/raw query results require an explicit safe response mapping because document transforms do not apply to them.

`Card` stores business content, contact details, image, address, a unique seven-digit `bizNumber`,
user IDs in `likes`, its immutable `user_id` owner and creation time. Email and business-number
uniqueness are database constraints, not Zod validation rules.

Input schemas are strict, including nested objects. Client requests cannot set server-owned fields
such as `isAdmin`, `user_id`, `likes` or `createdAt`. Each operation has its own schema;
profile updates cannot change passwords or business status, and business-number changes have a separate schema.

- Emails are trimmed and lowercased; Israeli national phone numbers accept spaces/hyphens and are stored as digits.
- Required profile/card fields must be present for PUT updates.
- House numbers accept positive integers or digit strings. ZIP values accept nonnegative integers or digit strings.
- Missing state, ZIP and image values receive documented defaults. Image defaults use placeholder image URLs.
- Website/image URLs must use HTTP or HTTPS.
- Registration passwords require at least eight characters, uppercase/lowercase ASCII letters, a digit and a special character,
  with a maximum UTF-8 length of 72 bytes. Login does not trim or rewrite passwords.
- Validation failures return `400` with `error.details` entries containing `path` and `message`.

Validation middleware stores parsed values in `response.locals.validated.body` or `.params`.
Route handlers use those values instead of the original unvalidated payload.

## Startup and shutdown

Missing or malformed configuration stops startup and reports the field names without their values.
If MongoDB cannot connect, the HTTP port stays closed. Check the URI, database credentials,
network access and Atlas IP access list. Connection errors never print the connection string.
Press Ctrl+C to stop accepting requests and disconnect MongoDB. Shutdown is bounded to 10 seconds.

## Project plan and references

The [full work plan](WORK_PLAN.he.md) is maintained in Hebrew.
Secrets, build output, logs and dependencies are excluded from Git.

- [Mongoose connections](https://mongoosejs.com/docs/connections.html)
- [Express error handling](https://expressjs.com/en/guide/error-handling/)
- [Express CORS middleware](https://expressjs.com/en/resources/middleware/cors/)
- [jsonwebtoken signing and verification](https://github.com/auth0/node-jsonwebtoken)
- [bcrypt password hashing](https://github.com/dcodeIO/bcrypt.js)
- [Mongoose transactions](https://mongoosejs.com/docs/transactions.html)
