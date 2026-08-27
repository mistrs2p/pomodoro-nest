# Pomodoro API

The NestJS backend for the Pomodoro application. It provides PostgreSQL persistence, JWT authentication, Google/GitHub OAuth, password authentication, and TOTP-based 2FA.

## Run Locally

Requirements: Node.js 20+, Docker Desktop, and npm.

```bash
npm install
docker compose up -d postgres
npm run start:dev
```

The API runs at `http://localhost:3001` by default. Create `.env` with database, JWT, frontend, and OAuth values. Local database defaults are `DB_HOST=localhost`, `DB_PORT=5433`, `DB_USERNAME=pomodoro`, `DB_PASSWORD=pomodoro_dev_password`, and `DB_NAME=pomodoro`.

Commands: `npm run build`, `npm run test`, `npm run test:e2e`, and `npm run lint`.

## Architecture

- `src/main.ts`: bootstrap, validation, CORS, and cookie parsing.
- `src/auth`: credentials, OAuth strategies, JWT, 2FA, and auth routes.
- `src/users`: user entity, repository access, and account updates.
- `docker-compose.yml`: local PostgreSQL service.

## Authentication Contract

Final sessions use an `httpOnly` cookie named `access_token`.

- `POST /auth/register`: creates a password account and sets the cookie.
- `POST /auth/login`: validates credentials; if 2FA is enabled, returns a five-minute `challengeToken` without setting the final cookie.
- `POST /auth/2fa/verify`: accepts `code` and `challengeToken`, then sets the final cookie.
- `GET /auth/google` and `/auth/github`: start OAuth login; callbacks set the cookie.
- `POST /auth/password`: authenticated users set or replace a password for shared login methods.
- `GET /auth/profile`: protected session check.
- `POST /auth/logout`: clears the cookie.

Social accounts may have a nullable password until the authenticated user sets one. Registration never silently takes over an existing email.

`AuthGuard('jwt')` protects fully authenticated routes such as profile, password setup, and 2FA management. `TwoFAGuard` protects `/auth/2fa/verify`; it validates the short-lived login challenge and attaches the challenged user before TOTP verification runs.

## Current Progress

- [x] PostgreSQL Docker setup and TypeORM connection.
- [x] Password registration/login and Google/GitHub OAuth.
- [x] JWT `httpOnly` cookie sessions.
- [x] Two-stage 2FA login and password setup for social accounts.
- [x] Profile, logout, and 2FA management endpoints.
- [x] Backend build verified.
- [x] Protected Pomodoro session creation and today's-session endpoint.
- [x] Today's completed focus-session statistics endpoint.
- [ ] Add provider ID columns and robust linking rules.
- [ ] Add integration tests for the complete auth matrix.
- [ ] Add database migrations.

## Handoff Notes

Start PostgreSQL before the API. Never return the final JWT to frontend JavaScript or store it in localStorage. Keep secrets outside source control. After auth changes, verify password login, social login, 2FA, logout, cookie flags, and profile access.
