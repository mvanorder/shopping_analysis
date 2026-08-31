# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This repo analyzes personal shopping order history across retailers: ingest exported
order data, normalize/categorize it, identify purchase trends, and project what's needed
going forward. Walmart is the only retailer with sample data and an exporter today, but the
pipeline is meant to be retailer-agnostic. Only step 1 (data ingress) is partially built;
normalization, analysis, and projection are not implemented — see [`README.md`](README.md).

## Layout

- **`backend/`** — FastAPI service backed by Postgres via SQLAlchemy's async engine, with
  Alembic managing schema migrations. Endpoints so far: `GET /health`, `GET /health/db`,
  and `POST /orders/upload` (parses an uploaded order-history CSV and echoes its columns
  and rows; nothing is persisted yet). SQLAlchemy models and a migration for the
  user/auth/RBAC/audit schema exist but are unused — no password hashing, JWT, RBAC
  enforcement, or OAuth. See [`backend/CLAUDE.md`](backend/CLAUDE.md) for conventions
  (including the strict docstring rules) and commands.
- **`frontend/`** — Expo (React Native + TypeScript) app using Expo Router for file-based
  navigation (`src/app/`), so one codebase runs as native iOS/Android and as a web build.
  Still essentially a `create-expo-app` scaffold: `src/app/_layout.tsx` is a bare `Stack`
  and `src/app/index.tsx` is the placeholder screen — no tabs, no `explore.tsx`, no HTTP
  client wired to the backend. See [`frontend/CLAUDE.md`](frontend/CLAUDE.md) /
  [`frontend/AGENTS.md`](frontend/AGENTS.md): Expo's API has changed since training
  cutoffs — check the versioned docs (`https://docs.expo.dev/versions/v57.0.0/`) before
  relying on remembered Expo APIs.
- **`database/`** — Postgres image (`database/Dockerfile`) and `database/init/` scripts
  that run on first container start.
- **`docs/`** — design notes; see [`docs/design/uac-design.md`](docs/design/uac-design.md)
  for the user-management, access-control, and deployment design.
- **`docker-compose.yml`** — base `db` + `backend` services; never run alone, always
  combined with one environment overlay (`docker-compose.dev.yml`,
  `docker-compose.staging.yml`, `docker-compose.prod.yml`). Each overlay reads its own env
  file (`.env.dev` / `.env.staging` / `.env.prod`; commit only the `.example` templates),
  and staging/prod read the Postgres password from a Docker secret under `secrets/`.

## Data and the sandbox

There is no sample data or notebook in the repo. Walmart order-history CSV exports and the
exploratory Jupyter notebook live locally under `sandbox/`, which is gitignored (along with
`*.ipynb`) and not part of the repo. Treat any such export as data, not a schema contract —
read the CSV header row rather than assuming columns.

## Local development

- Backend: from `backend/`, with the venv active, `uvicorn app.main:app --reload`
  (see [`backend/CLAUDE.md`](backend/CLAUDE.md) for migrations and conventions; `backend/pyproject.toml`
  configures the ruff / mypy / pylint / pytest gates, with coverage held at `--cov-fail-under=90`).
- Frontend: from `frontend/`, `npm start` (or `npm run ios` / `android` / `web`);
  `npm run lint` (eslint), `npm run typecheck` (`tsc --noEmit`) and `npm test`
  (jest-expo + React Native Testing Library) are the three gates CI runs.
  `npm test` runs `jest --coverage` and enforces the 90% `coverageThreshold`
  in `frontend/package.json`, mirroring the backend's `--cov-fail-under=90`;
  `npm run test:watch` deliberately omits coverage.
- Full stack in Docker: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d`.

## CI

Every PR, and every push to `master`, runs
[`.github/workflows/ci.yml`](.github/workflows/ci.yml) — the same gates the Claude Code
hooks run locally, plus the ones `backend/pyproject.toml` configures but no hook enforces
(mypy, coverage).

Reproduce the whole gate locally:

```bash
# from backend/
uv sync --frozen && uv run ruff check app tests && uv run pylint app && uv run mypy app && uv run pytest

# from frontend/
npm ci && npx expo customize tsconfig.json && npx tsc --noEmit && npm run lint && npm test
```

`npx expo customize tsconfig.json` stands in for the dev server: `tsconfig.json` includes
`.expo/types/**/*.ts` and `expo-env.d.ts`, which are gitignored and normally generated at
dev-server start. `pylint` is scoped to `app/` on purpose — `pylint tests` currently scores
9.10/10, and widening it is a follow-up.

**`CI passed` is the only required status check on `master`**, and it is an aggregator over
the path-filtered `backend` and `frontend` jobs. Path filtering happens in a job-level
`if:`, never in the workflow's `on: paths:` — a workflow skipped by a trigger filter never
reports a status at all, so a required check would sit "expected" forever and the PR could
never merge. Add new jobs to `ci-passed`'s `needs:` rather than marking them required
individually.

[`.github/workflows/claude-review.yml`](.github/workflows/claude-review.yml) posts an
advisory Claude review on each PR. It is deliberately **not** part of `CI passed`, so a
spent API balance or a rate limit never blocks a merge. Its review standards live in
`.claude/agents/backend-code-reviewer.md` and `.claude/agents/frontend-code-reviewer.md`
(picked by which area the PR changes), not in the YAML, so `/review` locally and CI use the
same files. On any PR that modifies that workflow, the action skips itself and the job still
reports success — changes to it are unreviewed until they reach `master`.

Dependencies: [`.github/dependabot.yml`](.github/dependabot.yml) opens weekly grouped PRs
per ecosystem, and
[`.github/workflows/dependabot-auto-merge.yml`](.github/workflows/dependabot-auto-merge.yml)
auto-merges patch and minor updates once `CI passed` is green. Majors stay manual. Expo SDK
packages are ignored there because they are version-locked to the SDK rather than to semver
— a *patch* bump of one of them can fail to install. Move them as a set with
`npx expo install --fix`.

Actions are pinned to commit SHAs with the version in a trailing comment. Action updates are
auto-merged and actions run with this repo's credentials, so the merged diff must name an
immutable object rather than a movable tag. Dependabot updates the SHA and the comment
together — do not convert them back to tags.

**A passing check is not evidence that a gate ran.** Three checks here have reported success
while verifying nothing: `expo lint` bootstrapping a config and exiting 0 without linting,
`ci-passed` aggregating an all-skipped run, and the review workflow self-skipping. The
eslint step asserts a non-zero file count for exactly this reason. The frontend
coverage threshold has the same shape of exposure: it is only enforced because
`npm test` carries `--coverage`, so rewriting the CI step to `npx jest --ci`
would silently stop collecting coverage and the 90% gate would quietly stop
applying. When you add or change a
gate, prove it can fail — plant a violation, watch it go red — and read the step log to
confirm it says what you expect.
