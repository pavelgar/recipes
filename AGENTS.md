## Working rules

- Build only what was asked. When a feature, screen or setting seems necessary, ask first.
- When a requirement is ambiguous, ask instead of picking an interpretation.
- Use only real data. Sample recipes are real and marked as samples; placeholder text, such as the editor's example lines, is written to show what's possible and isn't data.

## Design brief

Read [DESIGN.md](docs/DESIGN.md) before planning or changing features, screens, visual design, the data model, or deployment. It holds what is decided and the build order.

## Code organization

`src/` has one folder per layer. A layer imports only from itself and the layers its row names; `bun run lint` fails on any other import, and on a file outside every layer.

| Folder               | Holds                                                                                                   | Imports from                                |
| -------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `src/core/`          | Pure logic: only the packages listed for it, and no browser or Node globals or translations             | core                                        |
| `src/server/`        | The database, the environment, server functions (`*.functions.ts`) and server-only code (`*.server.ts`) | core                                        |
| `src/i18n/`          | Translations, and names in the interface language; Paraglide generates `src/paraglide/` from them       | core                                        |
| `src/hooks/`         | React hooks, and the browser code they use                                                              | core                                        |
| `src/components/ui/` | shadcn components, written by the shadcn CLI                                                            | hooks, i18n                                 |
| `src/components/`    | The app's UI, with a folder per area once it has several files                                          | core, i18n, hooks, ui, and server functions |
| `src/routes/`        | Routes and their views                                                                                  | everything above                            |
| `src/testing/`       | Helpers for tests, which in `src/` only tests import                                                    | core, server, i18n                          |

Start's entry files (`router.tsx`, `start.ts`, `client.tsx`, `server.ts`, and the generated `routeTree.gen.ts`), `styles.css` and the service worker sit beside the layers and may import any layer but `src/testing/`. Of these files, routes may import only `styles.css`. Tests may import anything. Any other file directly in `src/` belongs to no layer, so the lint fails on it.

- Pure code goes in core, even when one screen uses it. Code that needs the browser, React or translations goes beside the component or route that uses it; beside a route, its name starts with `-`, which keeps it out of the route tree.
- Core imports only the packages in `eslint.config.js`'s `coreModules`, each pure. A new pure package goes on that list before core imports it.
- A `.server.ts` file never reaches the browser: Start's build refuses it there, and the lint refuses it in components (shadcn's too), hooks and translations. Pure code that would grow the app's download is named `.server.ts` too, as `src/core/languages.server.ts` is, and so is core code that imports such a file, as the page reader in `src/core/import/` does.
- `eslint.config.js` holds the rules, in its `layers`, `imports` and `coreModules` lists. A change there changes this section too.

Outside `src/`, `tests/` holds the end-to-end tests and the corpus, `docs/` the design brief and research, `scripts/` the scripts the package's commands run, and `public/` the files served as they are.

## Held-out sample

`tests/corpus/held-out/` measures the code on text no rule was written against. Keep its files and its ledgers (`held-out-*.txt`) out of every read and search, and run `HELD_OUT=1 bun run test held-out` only when asked. `.ignore` keeps them out of ripgrep's searches; with grep, exclude them yourself (`grep --exclude-dir=held-out --exclude='held-out-*'`).

## Folder guides

Folders can have their own AGENTS.md with what applies only there. Read the guides on a file's path before changing it.

## Stale docs

When a doc in this repo no longer matches the code or the outside world, update it in the same change and point out the update in your reply. If you can't tell whether the doc or the code is wrong, ask.

## TanStack skills

The TanStack packages here may be newer than what you know. Before changing routes, server functions or queries, run `bunx --no-install --package @tanstack/intent intent list` from the repo root, and load the skill that matches the change with `bunx --no-install --package @tanstack/intent intent load <package>#<skill>`.

## Browser

Use agent-browser to check the app in a browser, such as after a change or to reproduce a bug: it is built for exploring. End-to-end tests use playwright-cli, which prints the test code for each action, as [tests/e2e/AGENTS.md](tests/e2e/AGENTS.md) describes.

## Commands

- `bun run typecheck` needs the generated `src/paraglide/`. `scripts/setup-worktree.sh` generates it, and T3 runs that for every worktree; on a checkout that skipped it, run `sh scripts/setup-worktree.sh`.
