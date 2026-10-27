# Corpus

Real recipe data from published pages, for tests: ingredient lines, step sentences and tags. `src/test/corpus.ts` reads it.

## Folders

- `ingredients/`: a seeded random sample of 25 recipes per site, with all their ingredient lines.
- `steps/`: sentences from the same recipes' steps, matched by `url`, that mention a temperature or an amount with a unit. The match was broad, so a few only look like amounts ("A tablespoon cookie scoop works well here."), which makes them negative cases.
- `rare-units/` and `rare-forms/`: lines and sentences picked for forms the random sample lacked, such as cl, pullo and maustemitta, "1-1/2 cups", "(14-1/2 ounces each)", "plus", amounts in words and "2 in.". Being picked, they don't count towards the random sample's statistics.
- `former-held-out/`: held-out samples that were checked and fixed against, now part of the development corpus.
- `held-out/`: the current held-out sample, see below.
- `tags/`: the `recipeCategory`, `recipeCuisine` and `keywords` of the development corpus's pages, as published: a string or a list.
- `pages/`: skeletons of pages of recipes in `ingredients/`, for the importer's tests (`src/lib/import/pages.test.ts`): each page's JSON-LD as the site published it, broken JSON included, with its `lang`, `og:site_name`, `og:title` and canonical link. Strings the repo already holds (ingredient lines, names, tags) stay, and so do facts: types, addresses, times, yields, dates and whose site it is. Every other string has its letters masked as `x`, keeping digits, spacing, punctuation, tags and entities, so the importer reads a skeleton as it reads the page, only the writing gone.

Each file gives its `site`, `country` (FI, US, GB or AU, which sets the measuring system), `language` and the date it was `collected`. Each recipe has its `url`, and whichever of `name`, `yield`, `format`, `ingredients`, `sentences` and the tag fields it has.

## Rules

- Keep every string exactly as the page's schema.org Recipe data published it, HTML entities (`&amp;`), stray spaces and missing spaces (`2dl`) included, since the importer receives the same strings. Tests that need clean input normalise it in the test. `"format": "json-ld (repaired)"` marks a page whose JSON-LD needed a missing comma put back before parsing; its strings are untouched. Some lines are cut short in the site's own data ("1 plo (0").
- Add data only by collecting it from a real page, with its URL.
- After adding or removing files here, run `bun run test --clearCache` once. Vitest's module cache keeps the corpus file list from an earlier run until `src/test/corpus.ts` itself changes.

## Pages

`bun scripts/pages.ts collect <seed> [per site]` fetches pages of `ingredients/` recipes as the importer does, into `.cache/pages/`, which stays out of the repo: only skeletons are committed. `bun scripts/pages.ts skeletons` writes `pages/` from that cache. The collecting rules below apply, apart from dropping URLs already in `corpus/`: pages are taken from `ingredients/` on purpose, so their lines are in the repo already.

After changing how skeletons are made, `bun scripts/pages.ts check` lists every skeleton the importer reads differently from its cached page, apart from the masked text; make it list none.

## Collecting

- Before fetching from a site, read its robots.txt and obey it, crawl delay included. Use an identifying user agent and wait at least 1.5 seconds between requests to a site. A `Content-signal: ai-train=no` line hasn't stopped collection so far, since test data isn't training.
- Take recipe URLs from the site's recipe sitemaps, drop URLs already anywhere in `corpus/`, sort the rest, shuffle them with a fixed seed, and fetch in that order.
- Use a seed no earlier collection used, and name it as "seed N" in the commit message. Seeds used so far: `git log -p -- corpus | grep -oE 'seed [0-9]{8}' | sort -u`.
- Cut step text into sentences at line breaks, and after `.`, `?` or `!` followed by a capital letter or a digit.

Per-site notes from earlier collections: `git log -p -- corpus/README.md`.

## Counts

Count with jq. These print numbers only, so they're safe on `held-out/` too:

```sh
# site, country, recipes, ingredient lines, sentences
jq -r '[.site, .country, (.recipes | length), ([.recipes[].ingredients // [] | length] | add), ([.recipes[].sentences // [] | length] | add)] | @tsv' corpus/ingredients/*.json
# site, recipes, and how many have a category, a cuisine and keywords
jq -r '[.site, (.recipes | length), ([.recipes[] | select(has("recipeCategory"))] | length), ([.recipes[] | select(has("recipeCuisine"))] | length), ([.recipes[] | select(has("keywords"))] | length)] | @tsv' corpus/tags/*.json
```

How the code reads each site's lines is in the `##` headings of the ledgers: `grep '^## ' src/lib/*/__ledger__/*.txt`.

## The held-out sample

`held-out/` holds 10 recipes per site that no rule was written against, so it measures the code on text it hasn't seen. Its `sentences` keep every step sentence with a digit, a fraction character or a degree sign, times and counts included. The normal test run doesn't read it.

1. Leave its lines and ledgers unread, and run it only when asked.
2. Run `HELD_OUT=1 UPDATE_LEDGER=1 bun run test held-out`. This writes its ledgers, `held-out-*.txt` in `src/lib/quantities/__ledger__/` and `src/lib/words/__ledger__/`.
3. Have a fresh agent, one that hasn't worked on the rules, check a random sample of entries, marking each ✓ or ✗ as `src/test/ledger.ts` describes. The share marked ✗ is the error rate. Give the sample's seed and size, the error rate and each wrong entry in the commit message.
4. Once the errors it found are fixed, the sample is no longer unseen. Move its files into `former-held-out/`, carry the statuses its check gave over to the development ledgers, delete its ledgers, and collect a new sample with a new seed: 10 recipes per site, from the same sites, printing only counts while collecting.
