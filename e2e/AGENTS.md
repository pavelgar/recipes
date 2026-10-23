# End-to-end tests

Playwright tests of the app in a real browser. `bun run test:e2e` builds the app, starts the build with an empty `e2e.db`, and runs every test in the `phone` and `desktop` projects.

## playwright-cli

playwright-cli is the browser for work in this folder: it attaches to a paused test, and every action it takes prints the Playwright code for it.

- Run it as `bunx playwright-cli`, so the project's pinned version runs.
- Before the first command, read the skill named on the `Agent skill:` line at the top of `bunx playwright-cli --help`. Its `references/test-generation.md` covers turning a flow into a test.

## Writing or debugging a test

1. Run the test paused, in the background: `bun run test:e2e e2e/<file>.spec.ts --project=phone --debug=cli`. A new test starts as one that only opens its first page.
2. When the run prints `Run "playwright-cli attach tw-…"`, attach with `bunx playwright-cli attach tw-…`.
3. Step through with `step-over`, or walk the flow yourself, and copy the code each action prints into the test, adding assertions.
4. `resume` to let the run finish, then run the file without `--debug=cli`. Done when it passes in both projects and goes red when the behaviour it checks breaks.

## Conventions

- Find elements by role and accessible name. Tests run in English, the base locale; the names are in `messages/en.json`.
- Phone first. The menu is a bottom bar on phones and a sidebar on wider screens, both named "Main menu", so one locator serves both projects.
- Each run starts with an empty database. A test that needs recipes adds real ones from the development corpus, which `corpus/AGENTS.md` describes.
