## Working rules

- Build only what was asked. When a feature, screen or setting seems necessary, ask first.
- When a requirement is ambiguous, ask instead of picking an interpretation.
- Use only real data. Sample recipes are real and marked as samples; placeholder text, such as the editor's example lines, is written to show what's possible and isn't data.

## Design brief

Read [DESIGN.md](docs/DESIGN.md) before planning or changing features, screens, visual design, the data model, or deployment. It holds what is decided and the build order.

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
