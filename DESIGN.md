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
  number formatting, Finnish word keys for search and tags, and website
  recipe extractor.
- Use es-toolkit for common utilities and pluralize to generate English
  unit plurals from singular spellings.
- Learn from existing projects (Mealie, Tandoor, RecipeSage, Norish,
  Cooklang, parse-ingredient, ingredient-parser), but don't copy their code.
  Write our own implementations, inspired by theirs.
- Build a test suite from real Finnish and English ingredient lines,
  conversions and search queries.

### Adding recipes

- Typed by hand, imported from a website, or photographed from a cookbook.
- Website import reads schema.org/Recipe data in both JSON-LD and microdata
  form. All seven Finnish sites in the test corpus (Arla, Kotikokki,
  Kotiliesi, Meillä kotona, Soppa365, Valio, Yhteishyvä) publish JSON-LD.
  Microdata support stays for sites that use it.
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
- Ingredient lines aren't split into ingredient name and notes ("finely
  chopped"). That waits until tag suggestions need ingredient names.
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
- Lengths convert too (cm ↔ inches), in ingredient lines and steps.
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
- "mm" means maustemitta only as the first amount of a Finnish ingredient
  line. In step text and later in an ingredient line ("cut into 5 mm
  slices") it means millimetres.
- Text that already gives both systems, like "425 °F (220 °C)", is left as
  written. So is an amount given again in the display's units: "2 2/3 cups
  (320g)" and "1 cup plus 2 tablespoons (134g)" on a metric device. When
  both are in units the display doesn't use ("330ml/11fl oz" on a US
  device), only the first converts.
- Converted amounts are rounded the way recipes write them:
  - Metric volumes are decilitres with one decimal (⅓ cup → 0,8 dl), and
    litres from 10 dl (5 cups → 1,2 l).
  - US volumes are teaspoons below a tablespoon, tablespoons below ¼ cup,
    then cups: the nearest of ¼, ⅓, ½, ⅔ and ¾ when that is within 6%,
    otherwise the fraction below plus tablespoons (1 dl → ⅓ cup + 1½
    tbsp). English recipes switch to quarts from 8 cups.
  - Grams round to 1 g below 20 g, 5 g below 250 g and 10 g below 1 kg,
    then kilograms with one decimal (8 oz → 225 g). US weights are ounces
    below 2 lb (500 g → 18 oz), then quarter pounds.
  - Lengths use the usual recipe equivalents: ¼ in ↔ 5 mm, ½ in ↔ 1 cm,
    1 in ↔ 2,5 cm, 9 × 13 in ↔ 23 × 33 cm.
  - Oven temperatures, from 120 °C (250 °F) up, follow the usual tables in
    steps of 25 °F and 10 °C (180 °C ↔ 350 °F). Lower ones round to 5 °F
    and 1 °C (165 °F → 74 °C).
  - Australian and metric cups are 250 ml.
  - An amount that no unit fits within 35% stays as written: "½ g
    sahramia" on a US device.
- Converted text follows the recipe's language: decimal comma and Finnish
  unit words ("⅓ kuppia", "7 unssia") in a Finnish recipe, decimal point
  and English ones in an English recipe. A Finnish unit takes the case the
  recipe wrote the amount in: "6 desissä vettä" → "2½ kupissa vettä", "2
  cm:n levyinen" → "¾ tuuman levyinen".
- Scaled amounts keep the way they were written: decimals stay decimals,
  fractions stay fractions ("1-1/2" → "3"), number words stay words ("yksi
  paketti" → "kaksi pakettia"). Unit words agree with the new number ("1
  cup" → "2 cups", "1 purkki" → "2 purkkia"). Scaled grams and millilitres
  round to 5 from 20 up (175 g × 1,5 → 265 g).
- Package units (1 prk) are never converted, but scale with servings. A size
  given in the line, as in "1 prk (400 g)", converts. It counts as the total
  for the line and scales with it ("2 prk (800 g)"), unless the line marks
  it as per package: "2 pkt (à 170 g)", "2 x 150g", "1 (14 ounce) can".
  Lengths are always per item ("2 (9 inch) pie crusts").
- Every amount in an ingredient line is recognised, not only the first.
  Alternatives and additions ("4 rkl tuoretta tai 2 tl kuivattua", "1 cup
  plus 2 tbsp") scale and convert like the first. Lengths, temperatures and
  the size of one piece ("185 g each", "from a 15-oz can", the package size
  in a product name such as "… Smetana 150 g") convert but don't scale.
- The amount doesn't have to start the line: in "Juustoraastetta tai 2 rkl
  korppujauhoja" and "zest of 1 lemon" the first amount that scales is the
  line's amount.
- A count further along the line scales when it says how much of the
  ingredient to use: in parentheses ("(about 4 medium)", "((2 to 3
  limes))"), with a package or count unit ("(2 rs, à 200 g)"), or after
  "of" ("the white of 1 egg"). Counts of pieces to cut into ("cut into 8
  wedges"), what one package holds ("1 pkt (4 x 100 g)"), rates ("8-15
  rapua ruokailijaa kohti"), times, servings ("valmis 8-10hlö") and note
  references stay as written.
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
- English words are stemmed with @orama/stemmers (the Snowball
  algorithm). Finnish words use our own word keys: Snowball's Finnish
  stemmer found every corpus form of only 142 of 221 words ("peruna" and
  "perunaa" stayed apart), the keys find them for 219.
- Keep the current Finnish word keys for now. Revisit Voikko with a
  Snowball fallback when designing the service worker, offline navigation
  and recipe caching, starting with the M1 offline prototype. Compare its
  additional asset and startup work alongside the shared offline design.
  Findings: [Voikko investigation](docs/voikko-investigation.md).
- Search matches as you type: the last word of a search also matches the
  start of longer words, so "porkk" finds "porkkanaa" and "kana" finds
  "kanapata" (and "kananmuna"). Once a word is complete, the exact form
  typed ranks above other forms of the word, though a match in the title
  can rank higher.
- A recipe must contain every word of a search, except the joining words
  ja, tai, sekä, and, or and with, which are skipped. "kana tai kala"
  finds recipes with both.
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
  simple suffix rules won't do. The check is deliberately broad: it also
  flags other forms of a word ("välipala", "välipalaa") and English words
  made from one another ("bake", "baking").
- A tag is read by the rules of the languages of its recipes, or of both
  languages while it is on no recipe, and two tags are only compared in a
  language they share. So "pork" on English recipes and "porkkana" on
  Finnish ones are never flagged.
- Possible duplicates are flagged for someone to review, never merged
  automatically. A flag can be dismissed, and the pair isn't flagged
  again.
- Typing a tag offers existing tags first, including other forms of what
  is typed, by the duplicate check: typing "jälkiruoat" offers an existing
  "jälkiruoka". No matching across languages.
- A tag management screen lists every tag with its recipe count. Anyone can
  rename, merge and delete tags there, and flagged possible duplicates
  appear there too. Merging moves every recipe onto one tag.
- Deleting and merging tags can be undone, so neither asks for confirmation.
- Tags never disappear by themselves. An unused tag stays until someone
  deletes it.
- Filtering by several tags shows recipes that have all of them.
- On import, the site's categories and keywords that match existing tags are
  pre-selected in the review step. Matching uses the duplicate check, so the
  site's "Jälkiruuat" pre-selects an existing "jälkiruoka"; an exact match
  wins over a near one. Others are offered as new tags, not selected.
- Site keywords that aren't useful as tags are left out of the offers:
  author names ("Sophie Godwin"), nutrients ("Calcium"), numbers and
  fragments ("77", "bo"). How to recognise them is decided with the
  importer, against the tags in the test corpus.
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
- Search matching later parts of compound words ("jauho" finding
  "vehnäjauhoja"). A later improvement. The first part already matches as
  you type ("kana" finds "kanapata").
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
