# Shopping analysis

Analyzes personal shopping order history across retailers: ingest exported order data,
normalize/categorize it, identify purchase trends, and project what's needed going forward.
Walmart is the only retailer with sample data and an exporter today, but the pipeline is
meant to be retailer-agnostic.

## Usage

### Step 1: Data Ingress
Collect historical shopping data from retailers. This can be done by uploading data, or via a retailer's API.

The backend currently supports this via `POST /orders/upload`, which accepts an
order-history CSV export, parses it, and echoes the columns and rows back in the response
(see `backend/app/main.py`). Persisting parsed rows to Postgres, and normalizing across
differently-shaped exports from different retailers, is not wired up yet.

### Step 2: Normalize Data
Categorize items, normalize data for similar items and item quantities across retailers. *(Not yet implemented.)*

### Step 3: Data analysis
Analyze normalized data to find item purchase trends. *(Not yet implemented.)*

### Step 4: Data projection
Project items needed per week or month. *(Not yet implemented.)*

## High level architecture

- **`backend/`** — FastAPI service backed by Postgres via SQLAlchemy's async engine, with
  Alembic managing schema migrations. Endpoints so far: `GET /health`, `GET /health/db`,
  and `POST /orders/upload`. SQLAlchemy models and a migration for the user/auth/RBAC/audit
  schema (`users`, `auth_identities`, `refresh_tokens`, `roles`, `permissions`,
  `role_permissions`, `user_roles`, `audit_log`) exist, but nothing uses them yet — no
  password hashing, JWT issuance, RBAC enforcement, or OAuth. See
  [`backend/CLAUDE.md`](backend/CLAUDE.md) for details and conventions.
- **`frontend/`** — Expo (React Native + TypeScript) app intended for visualizing the
  analysis, targeting iOS, Android, and web from one codebase via Expo Router. Currently a
  bare `create-expo-app` scaffold with no app-specific code yet. See
  [`frontend/README.md`](frontend/README.md).
- **`database/`** — Postgres image (`database/Dockerfile`) and init scripts run on first
  container start.
- **`docs/`** — design notes; see [`docs/design/uac-design.md`](docs/design/uac-design.md)
  for the user-management, access-control, and deployment design.
- Sample data exports (currently Walmart-only) and the exploratory notebook live locally
  under `sandbox/`, which is gitignored and not part of the repo.

## Deployment

`docker-compose.yml` defines the base `db` + `backend` services and is never run alone —
combine it with one environment overlay:

```bash
# Dev
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Staging / prod
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Each overlay reads its own env file (`.env.dev`, `.env.staging`, `.env.prod`; see the
`.example` templates at the repo root). Staging and prod also read the Postgres password
from a Docker secret file under `secrets/` (see the `.example` templates there).

For local development outside Docker:

- Backend: from `backend/`, with the venv active, `uvicorn app.main:app --reload`
  (see [`backend/CLAUDE.md`](backend/CLAUDE.md) for migrations and other commands).
- Frontend: from `frontend/`, `npm start`.
