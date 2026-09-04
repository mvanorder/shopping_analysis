# syntax=docker/dockerfile:1
#
# Wolfi-based Node — same Chainguard rationale as backend/, database/, proxy/
# (distroless-family, minimal attack surface, floating ":latest" we re-tag
# ourselves).
#
# This image exists ONLY for the dev stack: docker-compose.dev.yml runs it as
# the `frontend` service (`expo start`), and the `proxy` container reverse-
# proxies `/` to it for hot reload. Staging and prod never run this — there
# the web app is exported to static files and baked into the proxy image
# (proxy/Dockerfile's `web-build` stage), so there is deliberately no
# production target here.

FROM cgr.dev/chainguard/node:latest-dev AS dev

# npm ci writes into node_modules; the image's default `node` user can't. The
# dev server itself then also runs as root — acceptable for a local-only
# container, and it keeps the bind-mounted source writable from the host.
USER root
WORKDIR /app

# NB: no `ENV CI=1` here — Metro reads CI at *runtime* and disables watch mode
# (hot reload) when it's set, which would defeat the point of the dev proxy.
ENV EXPO_NO_TELEMETRY=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Metro / the Expo web dev server. docker-compose.dev.yml overrides this
# command; it is repeated here so `docker run` on the image alone still works.
#   --host lan  binds all interfaces so the proxy container can reach Metro
#               (the default localhost bind would be unreachable cross-container).
EXPOSE 8081
ENTRYPOINT []
CMD ["npx", "expo", "start", "--web", "--port", "8081", "--host", "lan"]
