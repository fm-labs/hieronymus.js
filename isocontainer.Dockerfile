# syntax=docker/dockerfile:1
#
# The isocontainers world as a standalone app: the world library and the isocontainers world built
# into static files, served by nginx. nginx also proxies /mc-api to the mission-control API and adds
# the API key, like the Vite dev server does, so the key never reaches the browser.
#
#   docker build -f isocontainer.Dockerfile -t fmlabs/isocontainer .
#   docker run --rm -p 8080:80 \
#     -e MC_API_URL=http://host.docker.internal:3080 -e MC_API_KEY=... \
#     --add-host=host.docker.internal:host-gateway \
#     fmlabs/isocontainer
#
# Then open http://localhost:8080/?api (live data) or http://localhost:8080/?stack=shop (a sample).
# The files that go into the build context are listed in isocontainer.Dockerfile.dockerignore.

ARG NODE_VERSION=24
ARG PNPM_VERSION=12.14.0
ARG NGINX_VERSION=1.29

# ---- build ----
FROM node:${NODE_VERSION}-alpine AS build
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app

# dependencies first, so they stay cached while the sources change
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY examples/package.json examples/
RUN pnpm install --frozen-lockfile

# the world library → dist/
COPY tsconfig.json tsconfig.build.json tsconfig.node.json vite.config.ts ./
COPY lib lib
RUN pnpm build

# the isocontainers world → examples/dist/
# A small entry that starts only this world, so the other worlds (and their local data, e.g. the
# cloudia-common package) are not needed. The URL parameters (?api, ?stack, ?graph, …) work as before.
COPY examples examples
COPY <<'EOF' examples/src/isocontainers.main.ts
import { isocontainersGameLauncher } from './worlds/isocontainers/isocontainersGameLauncher.ts'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('No app element')
const game = await isocontainersGameLauncher(app)
await game.run()
EOF
RUN sed -i 's|/src/main.ts|/src/isocontainers.main.ts|; s|<title>game</title>|<title>isocontainers</title>|' \
      examples/index.html \
 && cd examples && pnpm exec vite build

# ---- serve ----
FROM nginx:${NGINX_VERSION}-alpine

# the mission-control API; the nginx image fills MC_API_URL and MC_API_KEY into the config template
# at start. The key has no ENV default (it is a secret), so it is set to empty here when not given.
ENV MC_API_URL=http://host.docker.internal:3080
COPY --chmod=755 <<'EOF' /docker-entrypoint.d/10-mc-api-key.envsh
export MC_API_KEY="${MC_API_KEY:-}"
EOF

COPY <<'EOF' /etc/nginx/templates/default.conf.template
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;

    # /mc-api/... → <MC_API_URL>/api/..., with the API key added here, never in the browser
    location /mc-api/ {
        proxy_pass ${MC_API_URL}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $proxy_host;
        proxy_set_header Connection "";
        proxy_set_header x-api-key "${MC_API_KEY}";
        # the container event streams (ndjson) stay open
        proxy_buffering off;
        proxy_read_timeout 1h;
    }

    location /assets/ {
        try_files $uri =404;
        expires 1d;
    }

    location / {
        try_files $uri /index.html;
        add_header Cache-Control "no-cache";
    }
}
EOF

COPY --from=build /app/examples/dist /usr/share/nginx/html
