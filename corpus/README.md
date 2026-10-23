# Corpus

Real recipe data for tests: ingredient lines, step sentences and tags from
published Finnish and English recipe pages, collected on 2026-10-22 (tags
on 2026-10-23).

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

## Rare units

`rare-units/<site>.json` holds lines that use units the random sample
lacked: cl, pullo / plo and maustemitta. For each Finnish site, the same
seeded sample was continued for another 200 recipe pages (1,400 in all), and
only lines with one of those units after a number were kept, 13 lines from 11
recipes. Abbreviated "mm" (maustemitta) appeared in none of them. Lines are
verbatim, like the rest of the corpus; "1 plo (0" is cut short in the site's
own data. Being a targeted selection, these lines don't count towards the
statistics of the random sample.

## Rare forms

`rare-forms/<site>.json` holds ingredient lines and step sentences that
write amounts in forms the random sample had few or none of:

- mixed numbers with a hyphen ("1-1/2 cups") and amounts in words ("kolme
  ja puoli desilitraa")
- package sizes marked "each" or joined with a hyphen ("2 cans (14-1/2
  ounces each)", "one 14-ounce can", "(8 oz.)")
- a second amount joined by "plus", "+", "or" or "tai" ("1 cup plus 2
  tablespoons", "2 + 1 rkl"), and temperatures in ingredient lines
- "2 in." meaning inches and "two in" not meaning them, turns of 90°, and
  temperatures joined by "or" or "tai"

| Site                    | Country | Pages | Recipes | Lines | Sentences |
| ----------------------- | ------- | ----- | ------- | ----- | --------- |
| arla.fi                 | FI      | 150   | 6       | 2     | 4         |
| kotikokki.net           | FI      | 161   | 3       | 2     | 1         |
| kotiliesi.fi            | FI      | 190   | 9       | 6     | 5         |
| meillakotona.fi         | FI      | 150   | 8       | 7     | 1         |
| soppa365.fi             | FI      | 190   | 6       | 6     | 0         |
| valio.fi                | FI      | 190   | 2       | 2     | 0         |
| yhteishyva.fi           | FI      | 190   | 3       | 3     | 0         |
| bettycrocker.com        | US      | 148   | 59      | 84    | 4         |
| kingarthurbaking.com    | US      | 145   | 64      | 81    | 12        |
| tasteofhome.com         | US      | 150   | 112     | 200   | 48        |
| bbcgoodfood.com         | GB      | 60    | 14      | 11    | 3         |
| womensweeklyfood.com.au | AU      | 100   | 12      | 12    | 2         |

Pages counts the pages with Recipe data. Each recipe has its `url`, `name`
and whichever of `ingredients` and `sentences` matched, verbatim like the
rest of the corpus. tasteofhome.com and bettycrocker.com are new to the
corpus, chosen for their house style ("1-1/2 cups", "(14-1/2 ounces each)").
The other sites are from the random sample, with a fresh seeded sample
(seed 20261022) that skips pages already in the corpus. For large sites the
URLs came from a seeded subset of their sitemap files. For valio.fi,
soppa365.fi, yhteishyva.fi and kotiliesi.fi, 40 of the pages are ice cream
and frozen dessert recipes, picked by URL to look for temperatures below
zero.

Looked for but found on no page: temperatures below zero, thousands written
with a space ("1 000 g"), sizes written "9-by-13", and English amounts such
as "one and a half cups".

Step text was cut into sentences at line breaks and after a full stop,
question mark or exclamation mark followed by a capital letter or a digit.
Being a targeted selection, these lines don't count towards the statistics
of the random sample either.

## Held-out sample

`held-out/<site>.json` holds 10 recipes per site that no parser or word
rule was written against. It measures how the parser and the word keys do
on text they haven't seen, which the files above can't: every rule was
written while looking at them. The normal test run doesn't read it.

| Site                    | Country | Recipes | Lines | Sentences |
| ----------------------- | ------- | ------- | ----- | --------- |
| arla.fi                 | FI      | 10      | 99    | 16        |
| kotikokki.net           | FI      | 10      | 91    | 11        |
| soppa365.fi             | FI      | 10      | 100   | 16        |
| valio.fi                | FI      | 10      | 106   | 8         |
| yhteishyva.fi           | FI      | 10      | 105   | 23        |
| kingarthurbaking.com    | US      | 10      | 143   | 101       |
| tasteofhome.com         | US      | 10      | 100   | 36        |
| bettycrocker.com        | US      | 10      | 88    | 69        |
| bbcgoodfood.com         | GB      | 10      | 108   | 51        |
| womensweeklyfood.com.au | AU      | 10      | 125   | 28        |

Each recipe has its `url`, `name`, `yield` (as published, or null),
`format`, `ingredients` and `sentences`, verbatim like the rest of the
corpus. Unlike the step files, `sentences` keeps every step sentence with a
digit, a fraction character or a degree sign, not only those that looked
like amounts, so it includes times and counts. It is an empty list for
recipes with none.

### How to use it

1. Don't look at its readings while writing or changing rules.
2. At a milestone, run `HELD_OUT=1 UPDATE_LEDGER=1 bun run test held-out`.
   This writes the readings to the ledgers
   `src/lib/quantities/__ledger__/held-out-*.txt`, and the words each word
   finds to `src/lib/words/__ledger__/held-out-words.txt`.
3. Check a random sample of entries, marking each ✓ or ✗ as described in
   `src/test/ledger.ts`. The share marked ✗ is the error rate.
4. Once errors found this way are fixed, the sample is no longer unseen.
   Move it into the development corpus, and collect a new held-out sample
   with a new seed.

The first check, on 22 October 2026, used a random sample (seed 20261023)
of 200 of the 1,017 ingredient entries and 80 of the 347 step entries. Three
ingredient readings were wrong:

- "¾ kuppi vesi": "kuppi" (cup) was missing from the unit list. This is
  fixed, so the ledger now shows the entry as checked.
- "200 g Arla® Lempi Rahka Vanilja 200g, laktoositon": the package size in
  the product name scales, because it doesn't end the line.
- "1 pieni tlk ananasmurskaa": the adjective "pieni" hides the package unit.
  This doesn't change what scales.

One step reading was wrong: "Itse tykkään kun mittari näyttää 70." is a
temperature that only the word "mittari" (thermometer) gives away.

Fixing "kuppi" means the sample is no longer unseen by the parser, so it
is due to move into the development corpus (step 4).

The word check, on 23 October 2026, used a random sample (seed 20261023,
Python's `random.sample` over each language's entries) of 50 of the 582
Finnish and 50 of the 688 English words. One was wrong: "lightly" also
finds "lights", from "Christmas Lights Cupcakes", since the stemmer can't
tell the lights from the adjective. Most sampled words have no other form
in a sample this small: 21 had one, and all 21 found theirs. The parts of
compound words count as other words ("porkkanakakku" isn't a form of
"porkkana"), as in search.

### How it was collected

On 22 October 2026, with the same rules as the rest of the corpus:

- robots.txt and crawl delays were obeyed, with an identifying user agent
  and at least 1.5 seconds between requests to a site.
- Recipe URLs came from each site's recipe sitemaps. For sites with more
  than five, five sitemaps were picked with seed 20261023.
- URLs already anywhere in the corpus were removed. The rest were sorted,
  shuffled with seed 20261023, and fetched in that order until 10 pages had
  Recipe data with ingredients.
- Sentences were cut the same way as for the rare forms.

Notes on individual sites:

- Skipped: kotiliesi.fi and meillakotona.fi. Their robots.txt now
  disallows Claude's crawlers, which it didn't when the files above were
  collected.
- bbcgoodfood.com's robots.txt carries `Content-signal: ai-train=no`. This
  collection isn't training, so the site was kept.
- arla.fi took 40 page fetches, because the first extractor missed its
  JSON-LD.
- soppa365.fi took 11, because one page had a Recipe without ingredients.
- One womensweeklyfood.com.au recipe publishes its ingredients as an
  object keyed by number. They were kept in order.
- One kotikokki.net page is `json-ld (repaired)`, as described above.

## Tags

`tags/<site>.json` holds the `recipeCategory`, `recipeCuisine` and
`keywords` that recipe pages publish in their schema.org Recipe data, for
testing which tags may be duplicates. Each recipe has its `url`, `name` and
whichever of the three fields its page has, exactly as published: a string,
or a list for some sites. They come from the development corpus's own
pages (`ingredients/`, `rare-units/` and `rare-forms/`), so the held-out
sample stays unread. A recipe without any of the fields is left out.

| Site                    | Country | Pages | Recipes | Category | Cuisine | Keywords |
| ----------------------- | ------- | ----- | ------- | -------- | ------- | -------- |
| arla.fi                 | FI      | 32    | 32      | 27       | 10      | 32       |
| kotikokki.net           | FI      | 30    | 29      | 29       | 0       | 29       |
| soppa365.fi             | FI      | 33    | 33      | 33       | 33      | 29       |
| valio.fi                | FI      | 28    | 28      | 28       | 5       | 28       |
| yhteishyva.fi           | FI      | 28    | 27      | 20       | 7       | 27       |
| kingarthurbaking.com    | US      | 89    | 89      | 0        | 0       | 89       |
| bettycrocker.com        | US      | 59    | 59      | 59       | 0       | 59       |
| tasteofhome.com         | US      | 112   | 112     | 112      | 23      | 0        |
| bbcgoodfood.com         | GB      | 39    | 39      | 38       | 17      | 39       |
| womensweeklyfood.com.au | AU      | 37    | 1       | 0        | 1       | 1        |

The importer will have to split the fields into tags. Most sites separate
keywords with commas; kingarthurbaking.com uses ";;". Some keywords are
ingredients ("Porkkana", "persiljaa") or noise ("bo", "77"), and
bettycrocker.com splits its own phrases at commas ("sandwich, &, wrap").

Collected on 23 October 2026 with the same rules as the rest of the
corpus, from the same pages (487 fetches):

- Skipped: allrecipes.com, bbc.co.uk and recipetineats.com, whose
  robots.txt disallows Claude's crawlers, and kotiliesi.fi and
  meillakotona.fi, as above.
- arla.fi writes the type of its JSON-LD script as
  `application/ld&#x2B;json`, which the extractor has to accept.
- One kotikokki.net page has JSON-LD that doesn't parse (the page marked
  `json-ld (repaired)` above), so it has no entry.

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
requests not made by a browser). Since then, kotiliesi.fi and
meillakotona.fi have also come to disallow Claude's crawlers in their
robots.txt. Their lines here were collected before that, so don't collect
more from them.

The rare forms were collected later the same day in the same way, also
following each site's crawl delay (12 seconds for bbcgoodfood.com, 5 for
womensweeklyfood.com.au, hence their fewer pages). bbcgoodfood.com's
robots.txt sets its 12 seconds only for the Scope3 crawler, as checked on
23 October 2026, so the wait was longer than needed. It skipped
allrecipes.com, recipetineats.com and bbc.co.uk from the random sample, and
the new candidates food.com, simplyrecipes.com, bonappetit.com and
epicurious.com, because their robots.txt disallow AI agents such as Claude,
which did the collecting.
