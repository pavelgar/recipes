# Recipes

An open-source, self-hostable recipe management app for households:
mobile-first, installable as a PWA, with a Finnish and English interface.
It runs as a container image. See [DESIGN.md](DESIGN.md) for the full
brief.

In early development.

## Running the container

The image is `ghcr.io/pavelgar/recipes`, for amd64:

| Tag            | What it is                             |
| -------------- | -------------------------------------- |
| `latest`       | The newest release                     |
| `1.2.3`, `1.2` | A release, or the newest of its series |
| `edge`         | The newest commit on main              |
| `sha-<commit>` | One commit on main                     |

There are no releases yet, so the examples use `edge`. Run it with Podman
or Docker:

```sh
podman run -d --name recipes \
  -p 3000:3000 \
  -e PUID=1000 -e PGID=1000 -e TZ=Europe/Helsinki \
  -v recipes-data:/data \
  --restart unless-stopped \
  ghcr.io/pavelgar/recipes:edge
```

Or with Compose:

```yaml
services:
  recipes:
    image: ghcr.io/pavelgar/recipes:edge
    container_name: recipes
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Europe/Helsinki
    volumes:
      - ./data:/data
    ports:
      - 3000:3000
    restart: unless-stopped
```

The app has no logins, so make it reachable only from a trusted network.
It serves plain HTTP; installing the app and offline use need HTTPS from a
reverse proxy or Tailscale in front of it.

| Parameter       | What it does                                   |
| --------------- | ---------------------------------------------- |
| `-p 3000:3000`  | The app's HTTP port                            |
| `-v /data`      | Everything the app keeps: the database         |
| `-e PUID=1000`  | User id the app runs as and that owns `/data`  |
| `-e PGID=1000`  | Group id the app runs as and that owns `/data` |
| `-e TZ=Etc/UTC` | Time zone, for example `Europe/Helsinki`       |
| `-e UMASK=022`  | Permissions removed from new files             |

The container starts as root, hands `/data` to `PUID`:`PGID` and drops to
that user, as linuxserver.io images do. Started with `--user`, it runs as
that user instead and leaves ownership alone.

Rootless Podman maps the container's users onto other ids on the host, so
your own user can't open what the app writes to a host folder. To keep
those files yours, run with `--userns=keep-id` instead of `PUID` and
`PGID`. On SELinux hosts such as Fedora, add `:Z` to a host folder mount:
`-v ./data:/data:Z`.

To build the image yourself, run `podman build -t recipes .` in this
folder.

## Development

Requires Node 24 and Bun. Bun installs packages and runs scripts; the app
itself runs on Node.

```sh
bun install
cp .env.example .env.local
bun run dev
```

The dev server runs at http://localhost:3000.

The server applies new migrations from `drizzle/` before it answers its
first request, so it must run from this folder. The database is created
on first use.

The service worker that keeps the app working offline is only in the
production build, and browsers run it only over HTTPS or on localhost. To
try it, run `bun run build`, then `bun run start`, and open
http://localhost:3000.

| Command               | What it does                                                         |
| --------------------- | -------------------------------------------------------------------- |
| `bun run dev`         | Start the dev server                                                 |
| `bun run build`       | Build for production into `.output/`                                 |
| `bun run start`       | Run the production build (needs `DATABASE_URL`)                      |
| `bun run db:generate` | Write a migration into `drizzle/` after changing `src/db/schema.ts`  |
| `bun run icons`       | Write the app icons into `public/` from `public/favicon.svg`         |
| `bun run test`        | Run the Vitest tests (`bun test` runs Bun's own test runner instead) |
| `bun run test:e2e`    | Run the Playwright end-to-end tests against a production build       |
| `bun run typecheck`   | Type-check (run `dev` or `build` once first to generate Paraglide)   |
| `bun run lint`        | Lint with ESLint                                                     |
| `bun run format`      | Format with Prettier and apply ESLint fixes                          |

The end-to-end tests need Playwright's Chromium, downloaded once per
machine with `bunx playwright install chromium`.

Built with TanStack Start (React), Drizzle ORM on SQLite through libsql,
Paraglide for translations (`messages/`), Tailwind CSS, and Workbox through
vite-plugin-pwa for offline use.

## Releasing

CI (`.github/workflows/ci.yml`) runs the type check, lint, format check
and tests on pull requests and on pushes to main, then builds the image.
Pushes to main publish it as `edge`. To release, tag a commit on main and
push the tag:

```sh
git tag v0.1.0
git push origin v0.1.0
```

CI then publishes `0.1.0`, `0.1` and `latest`; from 1.0 on also the major
version alone (`1`).

## License

[AGPL-3.0-only](LICENSE)
