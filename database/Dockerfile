# syntax=docker/dockerfile:1
#
# Chainguard's postgres image is Wolfi-based (distroless-family: no package
# manager, minimal attack surface, rebuilt frequently for CVE patches). Only
# the ":latest" tag is available without a paid Chainguard subscription — see
# https://images.chainguard.dev/directory/image/postgres/overview — and it
# floats, so we build our own image FROM it and tag *that* ourselves. That
# gives us a version we control (rebuild deliberately to pick up upstream
# patches) instead of a database image that can change out from under a
# running deployment on every pull.
#
# Alpine's official `postgres:<version>-alpine` is the documented fallback if
# this base ever becomes unworkable (e.g. a required extension isn't packaged
# for Wolfi yet).
FROM cgr.dev/chainguard/postgres:latest

# Baked in (not bind-mounted) so the image is identical and immutable across
# dev/staging/prod — docker-entrypoint.sh runs everything in here, in
# filename order, only against a freshly-initialized (empty) PGDATA.
#
# NOTE: unlike the official docker-library postgres image, Chainguard's
# entrypoint reads from /var/lib/postgres/initdb/, not
# /docker-entrypoint-initdb.d/ (confirmed by reading
# /usr/bin/docker-entrypoint.sh inside the image — it calls
# docker_process_init_files on /var/lib/postgres/initdb/*).
COPY --chown=postgres:postgres init/ /var/lib/postgres/initdb/
