# The app runs on Node 24 LTS. Bun, copied from the official image, only
# installs packages and builds.
FROM docker.io/oven/bun:1.4.3-slim AS bun

FROM docker.io/library/node:24-slim AS build
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
COPY . .
# The version and commit the settings screen shows, passed in by CI. Builds
# without them show "development".
ARG VITE_APP_VERSION
ARG VITE_APP_COMMIT
RUN bun run build

FROM docker.io/library/node:24-slim
LABEL org.opencontainers.image.title="Recipes" \
      org.opencontainers.image.description="Self-hostable recipe app for households" \
      org.opencontainers.image.source="https://github.com/pavelgar/recipes" \
      org.opencontainers.image.licenses="AGPL-3.0-only"
ENV NODE_ENV=production \
    DATABASE_URL=file:/data/recipes.db \
    PHOTOS_DIR=/data/photos
WORKDIR /app
COPY --from=build /app/.output .output
# The server applies these on start, from the working directory.
COPY drizzle drizzle
COPY --chmod=755 scripts/container-entrypoint.sh /usr/local/bin/
RUN mkdir /data
VOLUME /data
EXPOSE 3000
ENTRYPOINT ["container-entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
