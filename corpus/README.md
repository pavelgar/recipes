# Corpus

Real recipe data for tests: ingredient lines and step sentences from
published Finnish and English recipe pages, collected on 2026-10-22.

## Ingredient lines

`ingredients/<site>.json` holds 25 recipes per site:

| Site                    | Country | Recipes | Lines |
| ----------------------- | ------- | ------- | ----- |
| arla.fi                 | FI      | 25      | 230   |
| kotikokki.net           | FI      | 25      | 241   |
| kotiliesi.fi            | FI      | 25      | 246   |
| meillakotona.fi         | FI      | 25      | 311   |
| soppa365.fi             | FI      | 25      | 319   |
| valio.fi                | FI      | 25      | 257   |
| yhteishyva.fi           | FI      | 25      | 262   |
| allrecipes.com          | US      | 25      | 228   |
| kingarthurbaking.com    | US      | 25      | 265   |
| bbc.co.uk               | GB      | 25      | 381   |
| bbcgoodfood.com         | GB      | 25      | 246   |
| recipetineats.com       | AU      | 25      | 379   |
| womensweeklyfood.com.au | AU      | 25      | 302   |

Each file records the site's `country` and `language`. Each recipe has its
`url`, `name`, `yield` and `ingredients`, all exactly as the page's
schema.org Recipe data published them. That includes HTML entities
(`&amp;`), stray and double spaces, and missing spaces (`2dl`), because the
app's importer receives the same strings. `format` says where the data came
from; `json-ld (repaired)` marks a page whose JSON-LD had a missing comma
between properties, which was fixed before parsing. The strings themselves
are untouched.

Kotikokki recipes are written by home cooks, the other sites by editors.

## Step sentences

`steps/<site>.json` holds sentences from the steps of the same recipes,
matched by `url`. Only sentences that mention a temperature or an amount
with a unit are kept (157 Finnish, 338 English), so recipes without any are
left out.

| Site                    | Recipes | Sentences |
| ----------------------- | ------- | --------- |
| arla.fi                 | 9       | 13        |
| kotikokki.net           | 17      | 28        |
| kotiliesi.fi            | 8       | 18        |
| meillakotona.fi         | 20      | 34        |
| soppa365.fi             | 11      | 19        |
| valio.fi                | 11      | 19        |
| yhteishyva.fi           | 18      | 26        |
| allrecipes.com          | 18      | 43        |
| kingarthurbaking.com    | 23      | 94        |
| bbc.co.uk               | 18      | 35        |
| bbcgoodfood.com         | 21      | 51        |
| recipetineats.com       | 23      | 75        |
| womensweeklyfood.com.au | 15      | 40        |

Each sentence is cut from the published step text unchanged, entities and
spacing included. The selection was a broad pattern match, so a few kept
sentences only look like amounts ("A tablespoon cookie scoop works well
here."), which makes them useful negative cases, and sentences that write
an amount in a form the pattern didn't cover may be missing.

## Rules

- Keep every line exactly as published. Tests that need clean input
  normalise it in the test, not in the corpus.
- Add data only by collecting it from a real page, with its URL.

## How it was collected

For each site, recipe URLs came from its sitemaps, and a random sample
(fixed seed 20261022) was fetched until 25 pages with Recipe data were
found. Requests followed robots.txt, used an identifying user agent, and
were spaced 1.5 seconds apart per site. Only ingredient lists, the fields
above and the selected step sentences were kept, not whole instructions or
descriptions.

Step sentences were collected later the same day by fetching the same pages
again. Three allrecipes.com pages refused the second visit, and three
soppa365.fi recipes publish no steps in their Recipe data.

Left out: seriouseats.com (refused requests), taste.com.au and
bestrecipes.com.au (disallowed by robots.txt), and k-ruoka.fi (blocks
requests not made by a browser).
