# Business Cards and Users API

Final course project built with Node.js, Express 5, TypeScript and MongoDB.
Input validation uses **Zod instead of Joi**. Documentation and code comments are written in English.

## Current progress

The server foundation includes validated configuration, an Atlas/local MongoDB connection,
JSON parsing, CORS, Morgan request logging and centralized JSON errors.
The HTTP listener starts only after MongoDB connects successfully.
User/card endpoints, authentication, seed data and assignment bonuses are upcoming work.

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

The authentication variables in `.env.example` are reserved for the next stages.

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
Only the URI selected by `DB_TARGET` is required. A local replica set will be needed for
transactional user deletion in a later stage.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the server with TypeScript file watching |
| `npm run typecheck` | Check TypeScript types |
| `npm run build` | Compile into `dist/` |
| `npm start` | Run the compiled server after building |
| `npm test` | Build and run isolated HTTP/configuration tests using Node's test runner |

Tests do not connect to Atlas, read credentials, or modify database records.
The test runner is built into Node; no test framework dependency is required for this stage.

## Available endpoints

| Method | Path | Response |
| --- | --- | --- |
| GET | `/health` | `200`, `{ "status": "ok" }` when HTTP is running |
| GET | `/ready` | `200`, `{ "status": "ready" }` when Mongoose reports connected; otherwise `503`, `{ "status": "unavailable" }` |

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
CORS does not replace authentication or authorization, which will be implemented next.
Morgan logs the timestamp, method, path, response status and duration; query strings are omitted.
File-based error logging is a later bonus.

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
