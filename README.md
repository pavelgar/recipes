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

| Command             | What it does                                                         |
| ------------------- | -------------------------------------------------------------------- |
| `bun run dev`       | Start the dev server                                                 |
| `bun run build`     | Build for production into `.output/`                                 |
| `bun run start`     | Run the production build (needs `DATABASE_URL`)                      |
| `bun run test`      | Run the Vitest tests (`bun test` runs Bun's own test runner instead) |
| `bun run typecheck` | Type-check (run `dev` or `build` once first to generate Paraglide)   |
| `bun run lint`      | Lint with ESLint                                                     |
| `bun run format`    | Format with Prettier and apply ESLint fixes                          |

Built with TanStack Start (React), Drizzle ORM on SQLite through libsql,
Paraglide for translations (`messages/`), and Tailwind CSS.

## License

[AGPL-3.0-only](LICENSE)
