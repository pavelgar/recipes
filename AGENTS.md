## Design brief

Read [DESIGN.md](DESIGN.md) before planning or changing features, screens, visual design, the data model, or deployment. It holds what is decided, the build order, and the working rules for this project.

## Stale docs

When a doc in this repo no longer matches the code or the outside world, update it in the same change and point out the update in your reply. If you can't tell whether the doc or the code is wrong, ask.

## Folder guides

Folders can have their own AGENTS.md with what applies only there. Read the guides on a file's path before changing it.

## Held-out sample

`corpus/held-out/` measures the code on text no rule was written against. Keep its files and its ledgers (`held-out-*.txt`) out of every read and search, for example with `grep --exclude-dir=held-out`, and run `HELD_OUT=1 bun run test held-out` only when asked.

<!-- intent-skills:start -->

## Skill Loading

Use the repository’s installed Intent. If it is unavailable, report the missing dependency instead of downloading a replacement.
Before editing files for a substantial task:

- Run `bunx --no-install --package @tanstack/intent intent list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `bunx --no-install --package @tanstack/intent intent load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->

## Browser

Use agent-browser for browser work on the app, such as checking a change or reproducing a bug. End-to-end tests are the exception: they use playwright-cli, as [e2e/AGENTS.md](e2e/AGENTS.md) describes.

## Commands

- Run Intent as `bun run intent list` and `bun run intent load <package>#<skill>`, in place of the `bunx … intent` commands above and the `Load:` lines that `intent list` prints. Those resolve to a stale `intent` binary shipped by `@tanstack/devtools` and crash ([TanStack/devtools#525](https://github.com/TanStack/devtools/issues/525)); drop this line once that issue is fixed.
- Run tests with `bun run test`. Plain `bun test` starts Bun's built-in runner, not Vitest.
- `bun run typecheck` needs the generated `src/paraglide/`. On a fresh checkout, run `bun run build` or `bun run dev` first.
