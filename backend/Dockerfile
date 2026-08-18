# syntax=docker/dockerfile:1
#
# Chainguard's python image is Wolfi-based (distroless-family: no package
# manager, minimal attack surface, rebuilt frequently for CVE patches) — the
# same choice made for the db image, see database/Dockerfile. Only the
# ":latest" tag is available without a paid Chainguard subscription, and it
# floats, so we build our own image FROM it and tag *that* ourselves. That
# gives us a version we control (rebuild deliberately to pick up upstream
# patches) instead of a base image that can change out from under a running
# deployment on every pull.
#
# The runtime stage below has no shell and no package manager (distroless) —
# there's no `docker exec sh` for interactive debugging. Temporarily swap the
# final FROM to "cgr.dev/chainguard/python:latest-dev" locally if that's ever
# needed.

# ---- builder ---------------------------------------------------------------
# The "-dev" variant has a shell and pip, unlike the runtime image. Backend
# deps live in pyproject.toml/uv.lock (not requirements.txt), so uv builds a
# self-contained .venv here that gets copied into the distroless runtime
# stage below.
FROM cgr.dev/chainguard/python:latest-dev AS builder

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock ./
# --no-dev: skip the pytest/ruff/mypy/etc. dev group, which has no place in a
# deployed image. --frozen: fail rather than silently re-resolving if
# pyproject.toml and uv.lock ever drift out of sync.
RUN uv sync --frozen --no-dev

# ---- runtime ----------------------------------------------------------------
FROM cgr.dev/chainguard/python:latest

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini ./

ENV PATH="/app/.venv/bin:$PATH"

# Not copied: backend/.env (local-dev only, excluded via .dockerignore) and
# the host's own .venv/ (also excluded) — config comes from env vars/secrets
# at runtime; app/config.py's POSTGRES_PASSWORD_FILE mirrors the db
# container's own convention (see config.py) so the same Settings code works
# unchanged here.

# Alembic migrations are NOT run automatically on container start (per
# docs/design/uac-design.md §5 — avoid concurrent-migration races across
# replicas when multiple instances boot at once). Apply them explicitly, e.g.
# `docker compose exec backend alembic upgrade head` against a "-dev" image,
# or run `alembic` from the builder stage's .venv against the same target DB.

EXPOSE 8000

# Chainguard's python image bakes ENTRYPOINT ["/usr/bin/python"], which would
# otherwise turn CMD into an argument to `python` (i.e. `python uvicorn ...`,
# which fails trying to open a file called "uvicorn"). Reset it so CMD runs
# standalone.
ENTRYPOINT []
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
