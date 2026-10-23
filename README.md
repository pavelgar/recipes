# Recipes

An open-source, self-hostable recipe management app for households:
mobile-first, installable as a PWA, with a Finnish and English interface.
It will be distributed as a container image. See [DESIGN.md](DESIGN.md)
for the full brief.

In early development.

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
| `bun run typecheck`   | Type-check (run `dev` or `build` once first to generate Paraglide)   |
| `bun run lint`        | Lint with ESLint                                                     |
| `bun run format`      | Format with Prettier and apply ESLint fixes                          |

Built with TanStack Start (React), Drizzle ORM on SQLite through libsql,
Paraglide for translations (`messages/`), Tailwind CSS, and Workbox through
vite-plugin-pwa for offline use.

## License

[AGPL-3.0-only](LICENSE)
