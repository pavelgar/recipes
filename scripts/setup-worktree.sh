#!/bin/sh
# Prepares a fresh checkout or worktree. T3 Code runs this when it creates a
# worktree; run it by hand with `sh scripts/setup-worktree.sh` elsewhere.
set -e

bun install --frozen-lockfile

# Typecheck needs the generated Paraglide output. The strategy matches
# paraglideVitePlugin in vite.config.ts, which regenerates it on dev and build.
bunx --no-install paraglide-js compile --project ./src/i18n/project.inlang \
  --strategy cookie baseLocale --silent

# Reuse the main checkout's .env.local so worktrees get the same settings,
# falling back to the example. Never overwrite an existing one.
if [ ! -f .env.local ]; then
  main=$(git worktree list --porcelain | sed -n '1s/^worktree //p')
  cp "$main/.env.local" .env.local 2>/dev/null || cp .env.example .env.local
fi
