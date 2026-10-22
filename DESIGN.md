# Design brief: Recipe app

## What it is

- A self-hosted recipe app for one household.
- Mobile-first, responsive, installable as a PWA.
- One shared recipe collection for everyone. No accounts, no logins.
- Distributed as a Docker/Podman image that runs anywhere containers run.
- Licensed under AGPL-3.0-only. Settings links to the source code.

## Decided

### Deployment and access

- The app has no logins, so it must only be reachable from a trusted
  network, never from the open internet.
- The container serves plain HTTP. HTTPS comes from a reverse proxy or
  Tailscale in front of it.
- Plain HTTP access (for example by IP address on the home network) also
  works, with fewer features. Browsers allow some features only over HTTPS:
  installing the app, offline use (service workers) and keeping the screen
  awake. Over HTTP these are unavailable, and the app degrades quietly
  instead of breaking. Settings shows one line, only over HTTP, saying that
  installing and offline use need HTTPS.
- Core features (adding, viewing, searching, importing, converting) must
  work over plain HTTP, so they can't depend on HTTPS-only browser APIs (for
  example crypto.randomUUID or the Cache API).
- The documentation describes two setups: Tailscale (a ts.net address, also
  reachable away from home), and a home network with a reverse proxy such as
  Caddy and your own domain.
- Test environment: a home server running Podman, Caddy with my own domain
  and a Let's Encrypt certificate, and Tailscale.
- The image is based on Node 24 LTS, and the app runs on Node. Bun, copied
  from the official Bun image, is used only at build time: installing
  packages and other build steps.
- The database is SQLite, accessed through libsql.

### Backups and export

- Backups and export are separate. A backup restores everything exactly; an
  export moves recipes to another app.
- Every night the app writes a snapshot of the database and photos to a
  backups folder in its data volume, keeping the last 14. The host's own
  backup system copies that folder. The app takes the snapshot itself,
  because copying the SQLite file while the app runs can produce a corrupt
  copy.
- Restoring is done from the command line on the server, not in the app.
- Export: anyone can download the whole collection as a zip of
  schema.org/Recipe JSON files plus photos, with a format version number from
  day one. The measuring system, cooked dates and queue are not included, and
  ingredient sections become header lines.

### Dependencies and prior art

- Depend only on proven, widely used packages, such as MiniSearch,
  @orama/stemmers and the Vercel AI SDK.
- Write our own ingredient parser, Finnish unit list, unit conversion and
  number formatting, and website recipe extractor.
- Learn from existing projects (Mealie, Tandoor, RecipeSage, Norish,
  Cooklang, parse-ingredient, ingredient-parser), but don't copy their code.
  Write our own implementations, inspired by theirs.
- Build a test suite from real Finnish and English ingredient lines,
  conversions and search queries.

### Adding recipes

- Typed by hand, imported from a website, or photographed from a cookbook.
- Website import reads schema.org/Recipe data in both JSON-LD and microdata
  form. Six of the seven major Finnish recipe sites checked publish it;
  Arla.fi uses microdata.
- Photo import sends the photo directly to a vision-capable AI model, with no
  separate OCR step.
- Imported and photographed recipes open in the editor for review before
  saving, with the same line-by-line recognition as typed recipes.
- Some kind of AI assistance is wanted. Beyond photo import, what it does is
  not defined yet.

### AI providers

- AI is optional: everything except photo import works without an AI
  provider configured.
- Cloud: Claude, OpenAI and OpenRouter to start with.
- Local: a model the user already runs (for example with llama.cpp), reached
  through a standard API.
- In practice that is two API styles: Anthropic's API, and the
  OpenAI-compatible API offered by OpenAI, OpenRouter and llama.cpp's server.
- Photo import needs a model that accepts images.
- Because there are no logins, anyone on the network can open the app's
  settings. AI keys and endpoints are therefore configured through the
  container's environment variables and are never shown or editable in the
  app.

### Recipes

- A recipe has a title, ingredients, steps, servings, prep time, cook time,
  a source (where it came from) and one optional cover photo.
- The app must work and look good for recipes without a photo.
- Servings are adjustable, and ingredient amounts follow.
- Ingredients are entered as free-text lines. As you type, each line
  indicates whether the app recognised its amount and unit. Lines it can't
  recognise are fine: they are saved and shown exactly as written, without
  conversion.
- Ingredients and steps can be grouped into optional sections ("For the
  sauce"). Recipes without sections must look and work just as well.
- Recipes are in English and Finnish to begin with.

### Units

- Recipes can be written in any units, mixed within one recipe. The app
  converts every quantity to the preferred unit system when displaying it;
  the recipe stays stored as written. Converted amounts should read the way
  a cook would write them, not like raw arithmetic.
- The preferred unit system is set per device. The imperial display uses US
  measures.
- Each recipe has a measuring system setting (US, British, Australian,
  metric) that tells the app how to read its units. It is guessed on import
  from the site's domain, defaults to US for recipes typed in English and
  metric for recipes typed in Finnish, and can be changed. The review step
  shows it prominently (for example "Measures: US") with a tap to change it,
  since photographed and typed recipes have no domain to guess from.
- British measures: cup 250 ml, tablespoon 15 ml, pint 568 ml. Australian
  tablespoon: 20 ml.
- Spoons map one-to-one (rkl = tbsp, tl = tsp) for US, British and metric
  recipes. Australian tablespoons convert by volume (1 tbsp ≈ 4 tl).
- Volumes stay volumes and weights stay weights (cups ↔ dl, grams ↔ ounces).
  No converting between volume and weight.
- Metric keeps decilitres: cups convert to dl. Converted volumes stay in dl
  even below half a decilitre; they are not switched to spoons.
- Both ways of writing decilitres are supported: decimals (1,5 dl) and
  fractions (1½ dl). Amounts the app converts into dl are shown as decimals
  (0,8 dl).
- Temperatures follow the device's unit system.
- Temperatures and amounts with units inside the steps convert too, with the
  same recognition feedback as ingredient lines.
- Amounts inside steps don't scale with servings. When servings differ from
  the original, step amounts are subtly marked as referring to the original.
- In step text, "mm" means millimetres. It means maustemitta only in
  ingredient lines.
- Text that already gives both systems, like "425 °F (220 °C)", is left as
  written.
- Package units (1 prk) are never converted, but scale with servings. A size
  given in the line, as in "1 prk (400 g)", converts.
- The recipe as originally written is one tap away.
- Interpretation must handle Finnish conventions: decimal commas (1,5 dl),
  units such as dl, rkl, tl and mm (maustemitta, 1 ml), and package
  abbreviations such as prk and pss.

### Finding recipes

- Search, tags, scrolling the full library, and scrolling rows of
  suggestions and categories.
- Search covers titles and ingredients, in the language each recipe is
  written in. There is no matching across languages. Finnish ingredient
  names inflect (jauhot, jauhoja), so search has to match inflected forms.
- Stemming uses @orama/stemmers (the Snowball algorithm) for Finnish and
  English, unless a better option turns up.
- Search works offline too.
- Library sort options: A–Z (default), Z–A, newest first, oldest first.
- Suggestion rows to start with (more may come later). All are chosen
  automatically from recipe data, not from tags:
  - Recently added.
  - Not cooked in a while: recipes cooked at least once, longest gap first.
    Recipes never cooked are left out.
  - Quick lunch: recipes with a total time (prep plus cook) of 30 minutes or
    less. Recipes without times are left out. The row keeps the name
    "quick lunch". The logic can be refined later.
- Category rows show recipes by tag. They are picked automatically, the
  same for the whole household; nobody has to configure them.
  - Only tags with enough recipes to fill a row (around four or more)
    qualify, and tags on most of the library are skipped.
  - Each day, a limited number of rows is picked from the qualifying tags,
    rotating so different tags come up. Every device shows the same
    selection that day.
  - With a small library, no category rows appear until a tag qualifies.
  - Thresholds are tuned during the build.
- Expect hundreds of recipes, but the app must look good and work with fewer
  than ten.

### Tags

- One flat list: no groups or hierarchy.
- Free-form and in any language; the household decides how to use them.
- Tags are normalised to lowercase.
- Duplicate checks ignore case, spacing and plurals ("pasta", "Pasta",
  "pastas"; "jälkiruoka", "jälkiruoat"). Finnish plurals are irregular, so
  simple suffix rules won't do.
- Possible duplicates are flagged for someone to review, never merged
  automatically.
- Typing a tag offers existing tags first. No matching across languages.
- A tag management screen lists every tag with its recipe count. Anyone can
  rename, merge and delete tags there, and flagged possible duplicates
  appear there too. Merging moves every recipe onto one tag.
- Deleting and merging tags can be undone, so neither asks for confirmation.
- Tags never disappear by themselves. An unused tag stays until someone
  deletes it.
- Filtering by several tags shows recipes that have all of them.
- On import, the site's categories and keywords that match existing tags are
  pre-selected in the review step. Others are offered as new tags, not
  selected.
- In the editor, the app offers tags used on recipes that share the most
  ingredients with this one, as tap-to-add options.
- Nothing is applied without someone seeing it.

### Deleting and undo

- One rule for everything that can be deleted (recipes, tags, queue items):
  nothing asks for confirmation, and everything can be undone.
- An undo option appears right after the action.
- Deleted items stay in a "recently deleted" list for 30 days, where anyone
  can restore them. Merging tags counts as deleting the merged-away tag, so
  it can be restored the same way.

### Meal planner

- A queue of recipes: order only, no days. Easy to rearrange.
- Marking a recipe cooked removes it from the queue and records the date on
  the recipe.

### Recipe view and cooking

- No separate cooking mode.
- The screen stays awake while a recipe is open.
- Tap to cross off ingredients and steps.
- Tap a time mentioned in a step to start a timer.
- To explore: the first step not yet crossed off is highlighted as the
  current one, so the view guides cooking without a separate mode.

### Interface language

- Finnish first, English as well. Full translation support from day one.
- Set per device, with Finnish as the default.

### Offline

- Read-only offline use, including search.
- Cover photos are resized and compressed when uploaded.
- All recipe text and the optimised cover photos are cached for offline
  reading.

## Not now

- Groceries and pantry tracking.
- AI features beyond photo import.
- Matching tags or search across languages.
- Search matching parts of compound words ("jauho" finding "vehnäjauhoja").
  A later improvement.
- Importing from sites that block requests not made by a browser, such as
  K-Ruoka.
- Importing recipes from other apps or files. There are no existing recipes
  to bring in.

## Build order

- M0, core logic without UI: the ingredient parser for Finnish and English,
  unit conversion and formatting, Finnish word handling for search and tags,
  and the test suite of real recipe lines, conversions and searches.
- M1, the basic loop: choose the design direction; type a recipe with
  recognition as you type; recipe view with unit conversion and adjustable
  servings; library with sorting and search; Finnish and English interface;
  Docker image, installable as an app.
  - Search runs in the browser from the start, so it doesn't have to be
    rebuilt for offline later.
  - The data model includes from day one what's costly to add later:
    original lines, measuring system, sections, cooked dates, and deletions
    that can be undone.
  - A small prototype proves that TanStack Start and a service worker can
    serve the app offline, before much is built on top of it.
- M2, getting recipes in: website import with the review step, cover photos,
  tags and the tag screen, nightly backups.
- M3, everyday use: home rows, the meal queue, cooking aids (screen kept
  awake, crossing off, timers), undo and recently deleted.
- M4, offline: caching recipes and photos, and offline search.
- M5: photo import with AI, and export.
- Early, alongside the milestones: try a few real cookbook photos against
  one cloud model and one local model.

## Design direction

Before building any UI, propose 3 visual directions drawn from the subject
itself (for example: a well-set printed cookbook, a box of index cards,
kitchen equipment). For each, give one sentence of intent, a palette as CSS
variables with hex values, a type pairing, and a description of the recipe
view on a phone. Wait for me to choose, then hold that direction on every
screen.

## Avoid (common defaults for apps like this)

- A grid of rounded food-photo cards with heart icons and star ratings
- A dashboard home with stat cards
- A desktop sidebar squeezed onto a phone
- Emoji as icons, chef-hat logos, cheerful filler copy
- Purple gradients, a generic green/orange food palette, Inter or system
  fonts as the only typeface
  For each, say what you are doing instead.

## Working rules

- Don't add features, screens or settings I haven't asked for. If something
  seems necessary, ask first.
- When a requirement is ambiguous, ask instead of picking an interpretation.
- Never invent data. Sample recipes must be real and marked as samples.

## Before calling a screen done

Check it at phone width first. Test with a recipe that mixes units, a
Finnish recipe, a recipe without a photo, and a library of 3 recipes as well
as 300. Then tell me what still looks like a template.
