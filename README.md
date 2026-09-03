# Pomodoro API

The REST API for the Pomodoro focus workspace. Built with NestJS and PostgreSQL, it owns identity, secure cookie sessions, social sign-in, TOTP two-factor authentication, focus-session persistence, task data, and daily/weekly statistics.

> This repository is the backend. Run the companion Next.js frontend on `http://localhost:3000` for the complete product experience.

## Tech stack

- NestJS 11 and TypeScript
- TypeORM with PostgreSQL 18
- Passport strategies for JWT, Google OAuth, and GitHub OAuth
- bcrypt password hashing
- Speakeasy TOTP and QR code enrollment
- class-validator request validation
- Jest and Supertest test tooling
- Docker Compose for the local database

## Features

- Email/password registration and login
- Google and GitHub OAuth
- JWT access sessions stored in an `httpOnly` cookie
- Short-lived 2FA login challenge and authenticator-app verification
- Password setup for social-first accounts
- Protected profile and security-management endpoints
- User-scoped focus profiles, immutable session snapshots, and daily/seven-day statistics
- User-scoped tasks with creation and completion toggles
- PostgreSQL persistence through TypeORM entities and repositories

## Getting started

### Requirements

- Node.js 20+
- npm
- Docker Desktop or a compatible PostgreSQL instance

### Installation

```bash
git clone <api-repository-url> pomodoro-nest
cd pomodoro-nest
cp .env.example .env
npm install
docker compose up -d postgres
npm run migration:run
npm run start:dev
```

The API starts at `http://localhost:3001`. The root route can be used as a basic availability check.

## Configuration

| Variable | Local example | Required | Description |
| --- | --- | --- | --- |
| `PORT` | `3001` | No | API listen port |
| `CORS_ORIGIN` | `http://localhost:3000` | No | Allowed credentialed browser origin |
| `FRONTEND_URL` | `http://localhost:3000` | No | OAuth completion redirect base |
| `DB_HOST` | `localhost` | Yes | PostgreSQL host |
| `DB_PORT` | `5433` | Yes | PostgreSQL host port |
| `DB_USERNAME` | `pomodoro` | Yes | Database user |
| `DB_PASSWORD` | `pomodoro_dev_password` | Yes | Database password |
| `DB_NAME` | `pomodoro` | Yes | Database name |
| `JWT_SECRET` | long random value | Yes | JWT signing key |
| `JWT_EXPIRATION` | `1d` | Yes | Final access-token lifetime |
| `GOOGLE_CLIENT_ID` | provider value | For Google login | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | provider value | For Google login | Google OAuth secret |
| `GOOGLE_CALLBACK_URL` | `http://localhost:3001/auth/google/callback` | For Google login | Registered Google callback |
| `GITHUB_CLIENT_ID` | provider value | For GitHub login | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | provider value | For GitHub login | GitHub OAuth secret |
| `GITHUB_CALLBACK_URL` | `http://localhost:3001/auth/github/callback` | For GitHub login | Registered GitHub callback |

The Google strategy temporarily recognizes legacy misspelled `GOGOLE_*` keys, but new environments should use the correctly spelled variables above.

## Database

`docker-compose.yml` starts PostgreSQL on host port `5433` and persists data in the `pgdata` volume.

```bash
docker compose up -d postgres
docker compose logs -f postgres
docker compose down
```

TypeORM schema synchronization is disabled in every environment. The CLI DataSource is located at `src/database/data-source.ts`, and versioned migrations live under `src/database/migrations/`.

```bash
npm run migration:show
npm run migration:run
npm run migration:revert
```

Run `migration:run` before starting a new environment and as a controlled release step before deploying a new API version. The initial migration is compatible with both an empty database and the earlier development schema created by `synchronize`.

## API reference

All authenticated endpoints use the `access_token` cookie. Browser clients must send requests with credentials enabled.

### Authentication

| Method | Route | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Create a password account and set the access cookie |
| `POST` | `/auth/login` | Public | Authenticate; returns a 2FA challenge when required |
| `POST` | `/auth/2fa/verify` | 2FA challenge | Verify TOTP and set the final access cookie |
| `POST` | `/auth/logout` | Public | Clear the access cookie |
| `GET` | `/auth/profile` | JWT cookie | Return email and 2FA status |
| `POST` | `/auth/password` | JWT cookie | Set or replace the account password |
| `POST` | `/auth/2fa/generate` | JWT cookie | Create an enrollment secret and QR code |
| `POST` | `/auth/2fa/enable` | JWT cookie | Verify a code and enable 2FA |
| `GET` | `/auth/google` | Public | Start Google OAuth |
| `GET` | `/auth/google/callback` | Google OAuth | Complete Google OAuth |
| `GET` | `/auth/github` | Public | Start GitHub OAuth |
| `GET` | `/auth/github/callback` | GitHub OAuth | Complete GitHub OAuth |

### Focus sessions and statistics

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/pomodoro/sessions` | Idempotently store a task-linked completion with its profile snapshot |
| `GET` | `/pomodoro/sessions/today` | List the current user's sessions since local start-of-day |
| `GET` | `/pomodoro/stats/today` | Return completed focus-session count and total focus seconds |
| `GET` | `/pomodoro/stats/week` | Return seven daily focus totals |
| `GET` | `/pomodoro/stats/overview` | Return time, streak, best-hour, average-session, and profile breakdown data |

### Focus profiles

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/pomodoro/profiles` | List user profiles and provision missing Classic, Quick Focus, and Deep Work presets |
| `POST` | `/pomodoro/profiles` | Create a bounded custom profile and optionally make it the default |
| `PATCH` | `/pomodoro/profiles/:id` | Edit a user-owned custom profile |
| `PATCH` | `/pomodoro/profiles/:id/default` | Select the user's persistent default profile |
| `DELETE` | `/pomodoro/profiles/:id` | Delete a non-preset, non-default custom profile |

### Tasks

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/pomodoro/tasks` | List the current user's tasks |
| `POST` | `/pomodoro/tasks` | Create a task with a title up to 160 characters |
| `PATCH` | `/pomodoro/tasks/:id/toggle` | Toggle completion for a user-owned task |

## Architecture

```text
src/
├─ auth/
│  ├─ auth.controller.ts   HTTP contract and secure cookie handling
│  ├─ auth.service.ts      Registration, login, social login, JWT issuance
│  ├─ jwt.strategy.ts      Cookie token extraction and identity validation
│  ├─ google.strategy.ts   Google profile mapping
│  ├─ github.strategy.ts   GitHub profile mapping
│  ├─ 2fa.service.ts       TOTP secret, QR, and code verification
│  └─ two-fa.guard.ts      Short-lived login challenge validation
├─ pomodoro/
│  ├─ pomodoro.service.ts  Session persistence and time aggregation
│  ├─ pomodoro-profile.service.ts  Presets, custom profiles, and defaults
│  ├─ task.service.ts      User-scoped task operations
│  └─ entities/            Profile, session, and task database models
├─ users/                  User entity and account persistence
├─ app.module.ts           Configuration, database, and feature wiring
└─ main.ts                 Validation, cookies, CORS, and bootstrap
```

## Security behavior

- Final access tokens are extracted only from the `access_token` cookie.
- Cookies are `httpOnly`, `sameSite=lax`, path-scoped to `/`, and marked secure in production.
- Password login with enabled 2FA does not set a final cookie before TOTP verification.
- Passwords are hashed and social-only accounts may keep a nullable password until one is explicitly set.
- Profile, session, and task operations are scoped by the authenticated `userId`.
- Client-generated session identifiers make completion retries idempotent.
- Profile identifiers are ownership-checked and completed sessions retain an immutable duration snapshot.
- Registration does not silently take over an existing email address.

Before production, add rate limiting, a CSRF threat-model review, secret rotation, structured logging, HTTPS, migration rehearsal in CI, and an explicit trusted-proxy/cookie deployment policy.

## Scripts and verification

| Command | Purpose |
| --- | --- |
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Compile the API |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:cov` | Generate coverage |
| `npm run lint` | Run ESLint with automatic fixes |
| `npm run format` | Format source and tests |
| `npm run migration:show` | List applied and pending migrations |
| `npm run migration:run` | Build and apply pending migrations |
| `npm run migration:revert` | Build and revert the latest migration |

For a read-only lint check, use:

```bash
npx eslint "{src,apps,libs,test}/**/*.ts"
```

## Roadmap

- Migration rehearsal and rollback verification in CI
- Full authentication matrix integration tests
- Password reset and explicit provider linking/unlinking
- Rate limiting, security headers, CSRF review, and audit logging
- OpenAPI/Swagger contract generation
- CI, containerized API deployment, and observability

## Related documentation

- [Full-stack setup](../README.md)
- [Frontend README](../pomodoro-next-app/README.md)
- [Portfolio case study](../docs/PORTFOLIO_CASE_STUDY.md)
- [Resume-ready project copy](../docs/RESUME_PROJECT.md)
