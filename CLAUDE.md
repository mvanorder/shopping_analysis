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
  `npm run lint` runs `expo lint`.
- Full stack in Docker: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d`.
