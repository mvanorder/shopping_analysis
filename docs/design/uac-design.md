# UAC Design — User Management, Access Control & Deployment

Status: draft, for review
Scope: user accounts, authentication, authorization (RBAC), and the container/deployment
architecture needed to run this at anywhere from single-user to millions-of-users scale.

This builds on prior decisions: Postgres + SQLAlchemy 2.0 (async) as the ORM layer, FastAPI
backend, stateless API instances so the app can scale horizontally.

---

## 1. User management

### Identity model

A user's login identity is kept separate from *how* they authenticate, so one account can have
a password, a Google login, or both, without schema changes later:

- **`users`** — the account itself. `id` (UUID), `email` (unique, citext), `display_name`,
  `avatar_url`, `is_active`, `email_verified`, `is_superuser`, `created_at`, `updated_at`,
  `last_login_at`. No password column here.
- **`auth_identities`** — one row per login method linked to a user. `id`, `user_id` (FK),
  `provider` (`password` | `google`), `provider_user_id` (the Google `sub`, or the user's own
  `id` for password auth), `secret_hash` (bcrypt/argon2 hash, only for `provider='password'`),
  `created_at`. Unique on `(provider, provider_user_id)`.

This split is what lets Google OAuth (§4) bolt on without a redesign, and lets a user later add
a password to an OAuth-only account or vice versa.

### Password handling

- Hash with **argon2** (via `argon2-cffi` / `passlib[argon2]`) — memory-hard, the current
  recommended default for new systems (bcrypt is an acceptable fallback if a dependency issue
  rules argon2 out).
- Password reset and email verification use short-lived, single-use signed tokens (JWT or random
  token + hash stored in a `verification_tokens` table with an `expires_at`), delivered by email.

### Sessions and tokens

Given the "unknown number of users, possibly millions" target, **avoid server-side session
storage as the primary mechanism** — it becomes a shared-state bottleneck across horizontally
scaled API instances. Instead:

- **Access token**: short-lived JWT (10–15 min), signed (RS256 so verification doesn't require
  hitting the DB or a shared secret store from every instance), carries `sub` (user id) and a
  cached snapshot of role/permission claims (§3) to avoid a permissions query on every request.
- **Refresh token**: long-lived (e.g. 30 days), opaque random value, stored **hashed** in a
  `refresh_tokens` table (`user_id`, `token_hash`, `expires_at`, `revoked_at`, `user_agent`,
  `ip_address`). Rotated on every use (old one revoked, new one issued) so a stolen refresh
  token has a limited window and reuse is detectable.
- This means logout / "sign out all devices" / admin-forced revocation all just delete or mark
  rows in `refresh_tokens` — no server-side session store needed for the hot path.

### Account states

`pending_verification` → `active` → `disabled` (admin action) — enforced as a check in the auth
dependency, not scattered across endpoints.

---

## 2. Superuser / root

**No shared "root" login.** A superuser is a normal `users` row with `is_superuser = true`.
Reasons:

- Every privileged action is attributable to a real person in the audit log (§5) — a shared root
  credential makes that impossible.
- `is_superuser` is checked as a bypass *before* the RBAC permission lookup (§3) — superusers
  don't need explicit role/permission rows, which keeps the "break glass" path simple and hard
  to accidentally lock out.

Bootstrapping the first superuser:

- A one-off CLI command (`python -m app.cli create-superuser --email ... `) run at deploy time,
  reading the initial password (or nothing, if the first login will be via Google) from an
  environment variable or secret manager — **never** a seeded row with a fixed default password
  committed to a migration.
- Recommend MFA (TOTP) be **mandatory** for any account with `is_superuser = true`, enforced at
  login, given the blast radius of that credential.
- Superuser actions (role grants, user disable/enable, impersonation) are written to the
  `audit_log` table (§5) with actor, action, target, and timestamp.

---

## 3. RBAC

### Schema

- **`roles`** (`id`, `name` unique, `description`) — e.g. `user`, `admin`.
- **`permissions`** (`id`, `resource`, `action`, unique on the pair) — e.g. `orders:read`,
  `orders:write`, `users:manage`, `roles:manage`.
- **`role_permissions`** (`role_id`, `permission_id`) — many-to-many.
- **`user_roles`** (`user_id`, `role_id`) — many-to-many, so a user can hold more than one role.

Default roles to ship with:

| Role | Intent |
|---|---|
| `user` | CRUD on their own orders/items only |
| `admin` | manage users and roles within the system |
| *(implicit)* `superuser` | `is_superuser=true` bypasses RBAC entirely — not a row in `roles` |

### Enforcement

- A FastAPI dependency, e.g. `Depends(require_permission("orders:write"))`, checks the JWT's
  cached permission claims first (fast path, no DB hit); falls back to a DB lookup only when
  claims are stale or absent (e.g. right after a role change, before the next token refresh).
- **RBAC answers "can this role do this kind of thing"; it does not answer "on this specific
  row."** Every business table (`orders`, `order_items`) carries an `owner_user_id`, and every
  query that isn't an admin/superuser action filters on it server-side — the client never
  supplies whose data to return. This ownership check is a second, separate gate from RBAC and
  both must pass.
- Start with hand-rolled permission checks against the tables above — it's a handful of tables
  and one dependency function. Reach for a policy engine (Casbin, Oso) only if authorization
  rules grow more relational than "own it or don't" (e.g. sharing an order with another user,
  team/org-scoped roles) — not needed for the current scope.

---

## 4. OAuth with Google

- Use **Authlib** rather than hand-rolling the OAuth2/OIDC flow — it handles PKCE, state/CSRF
  validation, and ID-token verification correctly.
- Standard Authorization Code + PKCE flow:
  1. `GET /auth/google/login` → redirect to Google's consent screen.
  2. `GET /auth/google/callback` → exchange code for tokens, verify the ID token signature and
     `email_verified` claim, extract `sub` (Google's stable user id — **never key off email**,
     which can change) and profile fields.
  3. Look up `auth_identities` by `(provider='google', provider_user_id=sub)`.
     - Match → log in as that user.
     - No match, but `email` matches an existing `users` row with a verified email → link a new
       `auth_identities` row to that user (only because Google's `email_verified` claim can be
       trusted; never auto-link on an unverified email).
     - No match at all → create a new `users` row + `auth_identities` row.
  4. Issue the app's own access/refresh token pair (§1) — downstream code never needs to know
     whether the user logged in with a password or Google.
- Secrets (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) come from environment variables backed by
  GCP Secret Manager or AWS Secrets Manager in deployed environments — never committed, never in
  a plain `.env` outside local dev (already `.gitignore`d per `backend/.gitignore`).

---

## 5. Database design

Postgres, accessed via SQLAlchemy 2.0 async ORM, migrations via Alembic (autogenerate + manual
review, applied as an explicit pre-deploy step or init job — **not** on every app-instance
startup, to avoid concurrent-migration races when multiple replicas boot at once).

### Core tables

```
users              id, email (unique), display_name, avatar_url, is_active,
                   email_verified, is_superuser, created_at, updated_at, last_login_at

auth_identities    id, user_id FK, provider, provider_user_id, secret_hash,
                   created_at   — unique(provider, provider_user_id)

refresh_tokens     id, user_id FK, token_hash, expires_at, revoked_at,
                   user_agent, ip_address, created_at

roles              id, name (unique), description
permissions        id, resource, action              — unique(resource, action)
role_permissions   role_id FK, permission_id FK
user_roles         user_id FK, role_id FK

orders             id, user_id FK (indexed), order_number, order_date,
                   subtotal, savings, tax, tip, order_total, fulfillment,
                   tracking_numbers, created_at

order_items        id, order_id FK (indexed), product_name, generic_name,
                   quantity, price, delivery_status, product_link

audit_log          id, actor_user_id, action, target_type, target_id,
                   metadata (jsonb), created_at
```

### Notes

- Every user-owned table gets `user_id`/`order_id` FKs with `ON DELETE CASCADE`, and the owning
  user id is always derived from the authenticated session server-side, never trusted from the
  client — this is the multi-tenancy boundary.
- Indexes: `users.email`, `orders.user_id`, `orders(user_id, order_date)` for time-range queries,
  `order_items.order_id`.
- `audit_log.metadata` as JSONB keeps it flexible for different action types without a schema
  migration per new admin action.

---

## 6. Container design

- **`backend` image**: multi-stage Dockerfile — a build stage installing dependencies, a slim
  `python:3.12-slim` runtime stage with only runtime deps copied over, a non-root user, and a
  `HEALTHCHECK` against `/health`. Runs via `uvicorn` (or `gunicorn -k uvicorn.workers.UvicornWorker`
  for multi-process) behind the platform's own load balancer.
- **`worker` image**: same codebase/base image as `backend`, different entrypoint — processes
  background jobs (CSV import parsing, email sending) off a queue, so a large upload never blocks
  a request-handling process. Keeping the same base image avoids dependency drift between the two.
- **`frontend`**: the Angular production build (`npm run build`) served as static files —
  **not** through a Python container. Locally/on a single server, Nginx serves the built assets;
  in the cloud, they go to object storage + CDN (§7) since static assets don't need compute.
- Config exclusively via environment variables (12-factor); no secrets baked into images; images
  tagged by git SHA for traceability, pushed to a registry (GCP Artifact Registry / AWS ECR).

---

## 7. Container orchestration — docker-compose and cloud

**Important framing:** docker-compose and "GCP or AWS" aren't two orchestrators for the same
target — compose is for **local dev and the single-server deployment path**; the cloud path uses
the cloud provider's own container runtime (Cloud Run / ECS), which doesn't consume a compose
file directly. Both paths build from the *same* Dockerfiles, which is the actual portability win.

### docker-compose (local dev + single server)

Services: `backend`, `worker`, `postgres`, `redis` (job queue + refresh-token/rate-limit cache),
`frontend` (Nginx serving the built static bundle), and a reverse proxy (Traefik or Caddy) doing
automatic TLS via Let's Encrypt on the single-server path.

### Cloud path — GCP (recommended) vs AWS

| Concern | GCP | AWS |
|---|---|---|
| Backend/worker compute | Cloud Run (scale-to-zero, pay-per-request) | ECS Fargate (or EKS for k8s parity) |
| Database | Cloud SQL for Postgres | RDS for Postgres |
| Cache/queue | Memorystore (Redis) | ElastiCache (Redis) |
| Load balancing | Cloud Load Balancing | ALB |
| Registry | Artifact Registry | ECR |
| CI | Cloud Build / GitHub Actions | CodeBuild / GitHub Actions |
| Frontend static hosting | Cloud Storage + Cloud CDN | S3 + CloudFront |

**Recommendation: start on GCP with Cloud Run.** It scales to zero (fits "unknown number of
users" — no cost while idle, no capacity planning up front) and scales up to handle bursty or
high traffic without managing a Kubernetes cluster or fixed instance fleet. AWS ECS Fargate is
the equivalent fallback if there's existing AWS infra, credits, or team familiarity — the
Dockerfiles and app code don't change either way, only the deployment manifests (Cloud Run
service YAML / Terraform vs. ECS task definitions).

---

## 8. Single server and cloud deployment

### Single server (MVP / cost-sensitive start)

A single VPS running `docker-compose up`, Caddy/Traefik for automatic HTTPS, Postgres and Redis
as containers with persistent volumes, `pg_dump` on a cron for backups. Cheap, simple, entirely
adequate until real traffic shows up — matches "unknown number of users" by not over-building
before there's evidence of scale.

### Cloud deployment

Stateless backend/worker containers on Cloud Run (or ECS Fargate) behind a managed load
balancer/autoscaler, managed Postgres (read replicas added only once query load justifies it),
managed Redis, CI/CD (GitHub Actions) building images on merge, pushing to the registry, and
deploying via `gcloud run deploy` / `aws ecs update-service` with rolling or blue/green releases.

### The migration path between them

Both environments run the *same* container images — that's the point of containerizing in the
first place. What changes between "single server" and "cloud" is only the orchestrator/config
(a compose file vs. a cloud service definition) and where Postgres/Redis live (containers with a
volume vs. managed services). This is also the deployment-side answer to the earlier
"database-agnostic" goal: SQLAlchemy makes the *database engine* swappable; containerizing makes
the *deployment environment* swappable — together they mean starting cheap on one VPS doesn't
lock the project out of moving to Cloud Run/ECS later without a rewrite.

---

## Open questions for review

1. GCP vs AWS as the committed cloud target (recommendation: GCP/Cloud Run, above) — or keep
   both live as a genuine requirement rather than a fallback?
2. MFA for superuser accounts: mandatory at launch, or phased in after basic auth ships?
3. Job queue choice for the `worker` image — Celery (mature, heavier) vs RQ (simpler, Redis-only)?
4. Do we need org/team-scoped sharing of order data in the medium term? It doesn't change §1–3
   much now, but affects whether RBAC roles should be scoped per-resource sooner rather than later.
