# End-to-end tests

Playwright tests of the app in a real browser, against a production build. `playwright.config.ts` sets up the apps they run against and the projects, and CI runs the same suite.

The build is `vite build --mode e2e`, which also imports from `test-site.ts` on 127.0.0.1, an address every other build refuses (`src/lib/import/fetch.server.ts`). A test of importing a kind of page adds the page there. Afterwards `.output/` holds that build; run `bun run build` before using it otherwise.

The `iphone` project (WebKit) runs only on CI, since Playwright's WebKit doesn't launch on Fedora. To run it locally, use Playwright's Ubuntu image, from the repo root:

```sh
podman run --rm --network host --userns=keep-id -v "$PWD":/work:Z -w /work -e CI=1 -e HOME=/tmp \
  mcr.microsoft.com/playwright:v<@playwright/test version>-noble \
  bash -c 'npm i -g --prefix /tmp/g bun@<the Dockerfile's version> && PATH=/tmp/g/bin:$PATH bunx playwright test -c tests/e2e --project=iphone'
```

## playwright-cli

playwright-cli is the browser for work in this folder: it attaches to a paused test, and every action it takes prints the Playwright code for it.

- Run it as `bunx playwright-cli`, so the project's pinned version runs.
- Before the first command, read the skill named on the `Agent skill:` line at the top of `bunx playwright-cli --help`. Its `references/test-generation.md` covers turning a flow into a test.

## Writing or debugging a test

1. Run the test paused, in the background: `bun run test:e2e tests/e2e/<file>.spec.ts --project=phone --debug=cli`. A new test starts as one that only opens its first page.
2. When the run prints `Run "playwright-cli attach tw-…"`, attach with `bunx playwright-cli attach tw-…`.
3. Step through with `step-over`, or walk the flow yourself, and copy the code each action prints into the test, adding assertions.
4. `resume` to let the run finish, then run the file without `--debug=cli`. Done when it passes in every project and goes red when the behaviour it checks breaks.

## Conventions

- Find elements by role and accessible name, as the code playwright-cli prints does, so steps written by hand read like generated ones. Tests run in English, the base locale; the names are in `src/i18n/messages/en.json`.
- Phone first. The menu is a bottom bar on phones and a sidebar on wider screens, both named "Main menu", so one locator serves both projects.
- Each run starts with an empty database and photos folder. A test that needs recipes adds real ones from the development corpus, which `tests/corpus/AGENTS.md` describes; `recipes.ts` holds those in use.
- A test of what needs AI sets `test.use({ baseURL: aiApp })`, and adds the reading it needs to `fake-ai.ts`.
- `app.ts` holds steps many tests share, such as opening the add dialog.
- A new screen or state gets an axe check in `accessibility.spec.ts`.
