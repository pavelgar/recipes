# Design brief: Recipe app

## What it is

- An open-source, self-hostable recipe management app for households.
- Mobile-first, responsive, installable as a PWA.
- One shared recipe collection for everyone. No accounts, no logins.
- Distributed as a Docker/Podman image that runs anywhere containers run.
- Licensed under AGPL-3.0-only. Settings links to the source code of the
  running version, and shows that version (1.2.3, or edge for a build from
  main) with the commit it was built from.

## Decided

### Deployment and access

- The app has no logins, so it must only be reachable from a trusted
  network, never from the open internet.
- Not everyone on that network is trusted to the full: anyone there can
  call the server directly, not only through the app's pages. The server
  checks what it's sent, and refuses a call larger than any the app makes
  (one cover photo, up to 20 MB, or up to five photos to read with AI,
  each up to 10 MB) before reading it.
- The smallest server the app is built for has 2 GB of memory, as a
  Raspberry Pi 4 can. What the server reads, such as photos, fits within
  that. The image is for amd64 only (see Not now).
- The container serves plain HTTP. HTTPS comes from a reverse proxy or
  Tailscale in front of it.
- Plain HTTP access (for example by IP address on the home network) also
  works, with fewer features. Browsers allow some features only over HTTPS:
  installing the app, offline use (service workers) and keeping the screen
  awake. Over HTTP these are unavailable, and the app degrades quietly
  instead of breaking. Settings has an item for installing the app:
  - Where the browser lets the page open its install dialog (Chrome, Edge,
    Samsung Internet), an Install button opens it.
  - Elsewhere it gives numbered steps for installing from the browser's own
    menu: Share, then Add to Home Screen on iPhone and iPad; Share, then Add
    to Dock in Safari on a Mac. Next to the name of each button to tap is a
    Lucide icon like it, since the device may be in another language than
    the app, so the name in the step may not match. Firefox on a computer
    can't install web apps, and the item says so.
  - Over HTTP its description says that installing and offline use need
    HTTPS, and the Install button is disabled.
  - In the installed app it shows a disabled Installed button.
- Core features (adding, viewing, searching, importing, converting) must
  work over plain HTTP, so they can't depend on HTTPS-only browser APIs (for
  example crypto.randomUUID or the Cache API).
- The documentation describes two setups: Tailscale (a ts.net address, also
  reachable away from home), and a home network with a reverse proxy such as
  Caddy and your own domain.
- Test environment: a home server running Podman, Caddy with a custom
  domain and a Let's Encrypt certificate, and Tailscale.
- The image is based on Node 24 LTS, and the app runs on Node. Bun, copied
  from the official Bun image, is used only at build time: installing
  packages and other build steps.
- The container follows linuxserver.io conventions: everything the app
  keeps is in a /data volume, and the app runs as the user and group given
  by PUID and PGID (1000 by default), or as the user the container is
  started with. TZ sets the time zone and UMASK the permissions of new
  files.
- GitHub Actions publishes the image to GitHub's container registry, for
  amd64 only, once the type check, lint, format check and tests pass. A
  version tag (v1.2.3) publishes that version and latest; every push to
  main publishes edge. Pull requests build the image without publishing
  it.
- The database is SQLite, accessed through libsql, in WAL mode so that
  reads and saves don't block each other. WAL doesn't work on a network
  share, so /data must be on the host's own disk.
- Cover photos are files in a photos folder beside the database
  (PHOTOS_DIR, /data/photos in the container), each named by a random id
  that is never reused, so the server lets browsers keep them for good.

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
  wink-porter2-stemmer and the Vercel AI SDK.
- Write our own ingredient parser, Finnish unit list, unit conversion and
  number formatting, Finnish word keys for search and tags, and website
  recipe extractor.
- Use es-toolkit for common utilities and pluralize to generate English
  unit plurals from singular spellings.
- Read, turn upright, resize and re-encode cover photos with sharp.
- Use date-fns for working with dates, and countries-and-timezones to tell
  which country a time zone belongs to.
- Render translations that mark words for the app to draw (such as a
  button's name with its icon, or a link) with Paraglide's React adapter,
  @inlang/paraglide-js-react.
- The website recipe extractor reads pages with htmlparser2, finds their
  charset with encoding-sniffer, decodes HTML entities with entities,
  repairs broken JSON-LD with jsonrepair and identifies the language a
  recipe is written in with franc. The server fetches pages with
  node-fetch, through request-filtering-agent, which refuses to connect to
  anything but a public address, redirects included. linkify-it finds the
  link in what is pasted into the add dialog, with the list of top-level
  domains from tlds for addresses written without https://.
- Learn from existing projects (Mealie, Tandoor, RecipeSage, Norish,
  Cooklang, parse-ingredient, ingredient-parser), but don't copy their code.
  Write our own implementations, inspired by theirs.
- Build a test suite from real Finnish and English ingredient lines,
  conversions and search queries.

### Adding recipes

- Typed by hand, imported from a website, or photographed from a cookbook.
- Most recipes come from links, so adding starts with one. Add opens a
  dialog, on phones too, with the link field focused. The import starts on
  the arrow button beside it (or Enter), whether the link was pasted or
  typed. The address may leave out its https://, and shared text with a
  link in it works too. Below the field: enter it manually, scan it from
  photos, and paste it as text, the last two disabled until an AI provider
  is configured (see Reading with AI).
- The dialog stays open while the page is read and names the site
  ("Reading valio.fi…"). If the page can't be read or has no recipe, it
  says why there, reading the site's answer by the standard meaning of its
  status. A site that refuses the request (403) blocked the import, and
  the message doesn't suggest trying again, even though some sites (Serious
  Eats) refuse now and then and let the next request in. A check only a
  browser passes is a block too, whatever its status: S-Kaupat sends its
  check as a 429, which would otherwise read as a site to try again later.
- On Android, the installed app appears in the share menu: sharing a page
  opens the dialog with its link filled in, waiting for the arrow.
- On wider screens, pasting a link anywhere in the app outside a text
  field, or dropping one onto it, opens the dialog the same way: link
  filled in, waiting for the arrow.
- The server fetches pages for import only from public addresses, never
  from a private network.
- Website import reads schema.org/Recipe data in both JSON-LD and microdata
  form. All seven Finnish sites in the test corpus (Arla, Kotikokki,
  Kotiliesi, Meillä kotona, Soppa365, Valio, Yhteishyvä) publish JSON-LD.
  Microdata support stays for sites that use it.
- Website import supports a page whose HTML, as the server sends it, holds
  schema.org/Recipe data with steps, or with more than one ingredient: Olive
  marks its collection pages as a Recipe whose one ingredient is a list of
  keywords. It reads every standard form of that data and works around
  mistakes many sites make, such as a stub Recipe before the full one, JSON
  that doesn't parse, and times written as text ("10 min", "1 hour 15
  minutes") instead of ISO 8601, but nothing is written for one site.
- Import doesn't guess where a site's steps, sentences and headings start
  and end, since no rule for it is reliable. Steps cut mid-sentence, run
  together ("…pastan sekaan.Kiehauta…", "2.In a bowl") or with a heading
  run onto their end come as the page publishes them, and someone fixes
  them in the editor if they care to, by hand or with Tidy steps (see
  Reading with AI).
- Not supported, and no parser is written for one site to make up for it:
  pages without Recipe data (sydanmerkki.fi, martat.fi), recipes a page
  draws with scripts after it loads (Gousto), recipes behind a login
  (Nigella's members-only recipes), and sites that block requests not made
  by a browser (see Not now). The app identifies itself, and doesn't pretend
  to be a browser or run one to get past a block. With an AI provider
  configured, a page without Recipe data can still be read with AI (see
  Reading with AI); the rest stay unsupported.
- WP Recipe Maker, the recipe plugin most WordPress food sites use, leaves
  its ingredient groups ("For the sauce") out of its JSON-LD. For a page
  with its recipe cards, the server also asks the plugin's public REST API
  for the recipe, and takes its groups as ingredient sections when the
  answer is for the same recipe and ingredients. The lines stay as the
  JSON-LD gives them. If the API doesn't answer, the ingredients stay one
  list. Other recipe plugins, such as Tasty Recipes, keep their groups only
  in the page's HTML, which isn't read.
- An imported recipe's cover photo is the image its Recipe data gives: the
  one with the largest stated width, otherwise the first listed. Sites
  often list one photo in several sizes or crops. BBC Good Food and
  Yhteishyvä list a smaller one first; WP Recipe Maker lists the full photo
  first, then square, 4:3 and 16:9 crops. Valio and Meillä kotona list
  their crops square first, Valio with no sizes and Meillä kotona with one
  width for all, so their square comes. The page's og:image isn't read: on
  BBC Food, a recipe without a photo has the site's logo there. The server
  fetches the photo while the page is read, from public addresses only,
  asking for WebP rather than AVIF, which takes far more memory to read. A
  photo it can't fetch, read or store leaves the recipe without one,
  unannounced.
- An imported recipe's language is the one its page states (the Recipe's
  own, then the page's), whichever language that is, unless its text is
  long enough to tell (500 characters) and franc scores the stated language
  below 0.95 of its first choice; then franc's first choice. Pages can
  state the wrong language: kinuskikissa.fi gives its Finnish recipes
  lang="en", which franc scores 0.86–0.92. franc can't tell Scots from
  English (it scores Scots within 1% of English on almost every English
  recipe, and first on some), so Scots is left out of what it finds. Its
  first choice is still often wrong on short texts, so it overrules a page
  only by a clear margin. A page that states no language takes franc's
  first choice from enough text; otherwise the language is unknown until
  someone chooses it in the editor.
- Imported and photographed recipes open in the editor for review before
  saving, with the same line-by-line recognition as typed recipes.
- Until it's saved, the editor's draft is kept in the browser: one typed
  by hand, and one being checked after an import, from a link, photos or
  pasted text. Discarding a draft asks nothing and can be undone. A saved
  recipe takes the editor's place in the browser's history, so Back doesn't
  open the editor again to save it twice.
- The editor is laid out like the recipe it writes, each detail beside what
  it's about: the cover photo above the name, with buttons over it to change
  or remove it, or without one its frame, empty like the other fields, to
  tap to add one; the name set as its
  heading, in a field like the others so it reads as editable; under it, for
  an import a line of small text that names its source as a link, for a
  typed recipe a source field, and then the recipe language and its measures
  side by side, since together they decide how the amounts read (see Recipes
  and Units), and under them the prep, cook and total times side by side,
  each of these labelled above its box; beside the Ingredients heading,
  servings, in the half of the width the heading leaves; and the ingredients
  and steps as lists, with bullets and step numbers that start again after
  each heading. Other fields without a visible label show an icon and a
  placeholder instead.
  Choices are in alphabetical order. A dropdown is the system's own picker
  on touch screens and the app's styled one with a mouse or trackpad. An
  empty list shows example lines, in the recipe's language: part of a
  recipe written to show what the app recognises, section headings
  included. Discard and Save, each with an icon and Save taking the rest
  of the width, float at the bottom, where the thumb is: on phones in the
  menu's place, which steps aside while the editor shows; on wider screens
  at the bottom of the window, below a short recipe too. They stay in view
  while something is typed. Save with a mistake in a field glides to the
  first such field and focuses it; a save that fails for another reason
  says so in a toast, which stays until it's closed, Save is pressed again
  or the editor is left.

### Reading with AI

- AI reads recipes that have no data to import: photos, pages without
  Recipe data, and text pasted in. It also tidies steps in the editor.
  Nothing it reads is saved before someone checks it in the editor.
- Scan from photo takes one or more photos of one recipe: a cookbook page,
  a recipe over two pages, a handwritten card, a screenshot. Choosing them
  starts the reading, up to 5 at a time, read as pages of one recipe in
  the order chosen. The browser shrinks each to 2048 pixels on its long
  side before sending it. The photos go directly to a vision-capable AI
  model, with no separate OCR step, and aren't kept.
- When a page has no Recipe data, the add dialog says so and, with an AI
  provider configured, offers to read the page with AI. It asks first, so
  no page goes to the AI provider unasked. The server fetches the page
  again, the same way, and sends the text a reader sees, without scripts,
  menus and footers.
- Paste text opens a large text box for a recipe written out as text,
  such as one sent in a message. Back during a read asks whether to stop;
  confirming cancels the request and discards its result, keeping the
  pasted text for returning to it. Closing the dialog stays immediate,
  without this question.
- Pasted text and Tidy steps take at most 60,000 characters. Longer text
  is kept and gets a message giving the limit before anything is sent.
- The model copies the recipe as written: the same words, numbers, units
  and language, never translated, converted, corrected or completed. It
  puts each ingredient and step on a line of its own, without bullets or
  step numbers, and takes headings as sections. Servings are taken as
  written, and times only where the source states them, never estimated
  from the steps.
- From a page or pasted text, each line the model returns is looked for in
  the text it read, ignoring spacing and letter case. A line found there
  is kept as the source writes it. One that isn't is kept as the model
  wrote it and marked in the editor, which says the marked lines are
  written differently in the source. Photos have nothing to check against.
- A page read with AI gets its language and measures as any import does.
  For photos and pasted text, the language is the one the model names,
  unless franc overrules it by the import's rule, and the measures are
  the ones the model finds the recipe states (an Australian book's 20 ml
  tablespoon), otherwise the language's.
- Tidy steps sits beside the Steps heading in the editor, whenever an AI
  provider is configured and there are steps. It puts each step on its own
  line: it splits steps that run together, joins a step cut in two, moves
  a heading that runs onto a step onto its own line ending with a colon,
  and drops step numbers. It also removes whole lines of copied page
  clutter: step-completion controls, print/share buttons, navigation,
  adverts and unrelated labels. The model identifies those lines, with no
  rules for individual sites. It keeps a line that mixes recipe text with
  clutter, or whose purpose is uncertain. The model is instructed to keep
  every cooking instruction, quantity, time, temperature, heading and
  serving or storage note.
  The model explicitly lists the discarded lines; all remaining recipe
  text is checked in order, with the same wording and spaces separating
  words and numbers. Any other omission or change is rejected. The model
  can misidentify a recipe line as clutter, so the result is checked in
  the editor. After a successful run, including one that finds the steps
  already tidy, the ghost Tidy button turns into Undo in the same place,
  with its undo icon and text label. Undo restores the original text and
  turns the button back into Tidy; any manual edit in the steps also turns
  it back into Tidy. Changes to other fields leave it as Undo.
  Success is announced to screen readers without a visible message.
  Errors appear immediately to the left of Tidy in the same heading row,
  wrapping as needed, and clear when the steps are edited or tidying is
  tried again.

### AI providers

- AI is optional: everything except reading with AI and Tidy steps works
  without an AI provider configured.
- Cloud: Claude, OpenAI and OpenRouter to start with.
- Local: a model the user already runs (for example with llama.cpp), reached
  through a standard API.
- In practice that is two API styles: Anthropic's API, and the
  OpenAI-compatible API offered by OpenAI, OpenRouter and llama.cpp's server.
- One model does everything. The container is given it with AI_PROVIDER
  (anthropic, openai, openrouter or openai-compatible), AI_MODEL,
  AI_API_KEY, and AI_BASE_URL, which a local server needs. A setting
  that's missing or wrong stops the server at start, saying which.
- The model answers with structured output, to a JSON schema, which both
  API styles offer.
- Scan from photo needs a model that accepts images, and says so when the
  model refuses one.
- Because there are no logins, anyone on the network can open the app's
  settings. AI keys and endpoints are therefore configured through the
  container's environment variables and are never shown or editable in the
  app.

### Recipes

- A recipe has a title, ingredients, steps, servings, prep time, cook time,
  a source (where it came from) and one optional cover photo. It also keeps
  the total time its source publishes, when the source gives one.
- A source is a name ("Valio", "Kotiruokaa, s. 112"), a web address, or
  both. An imported recipe's source is the site and page it came from,
  which the editor shows but doesn't let anyone change; a recipe typed by
  hand has a source field for a name, such as a book and page.
- The app must work and look good for recipes without a photo.
- A cover photo is kept upright, fitting within 1600 × 1600 px (never
  enlarged), as WebP, without its metadata, which can hold where it was
  taken. JPEG, PNG, WebP, AVIF and GIF are read, up to 20 MB, which the
  editor checks before sending a photo. How many megapixels depends on how
  much of the photo is read at once, so that one takes about 150 MB at
  most: 100 for a JPEG as phones save it (baseline), a PNG or a WebP; 25
  for a progressive JPEG, an interlaced PNG or a GIF, which are read whole;
  8 for an AVIF, which takes about 19 bytes a pixel. HEIC isn't read:
  sharp's builds can't read it, and iPhones send JPEG to web pages.
- The photo is added, changed and removed in the editor, before saving.
  Removing it asks nothing and can be undone until another photo takes its
  place. A draft can outlive its photo's file, which the editor shows as
  an empty frame; the recipe is then saved without it. Changing a saved
  recipe's photo comes with editing saved recipes.
- Servings are adjustable, and ingredient amounts follow.
- Servings are kept as written, since recipes often give a yield instead
  ("24 pullaa", "1 vuoka", "4–6 annosta"). The app reads the number and
  scales it, keeping the word: "24 pullaa" → "48 pullaa". Ranges scale at
  both ends.
- Ingredients are entered as free-text lines, in one text box; steps the
  same, one step per line. As you type, the amounts and units the app
  recognised are highlighted in place; a number it couldn't place isn't.
  Lines it can't recognise are fine: they are saved and shown exactly as
  written, without conversion.
- Ingredient lines aren't split into ingredient name and notes ("finely
  chopped"). That waits until tag suggestions need ingredient names.
- Ingredients and steps can be grouped into optional sections ("For the
  sauce"). Recipes without sections must look and work just as well. In
  the editor, a line with no amount that ends with a colon is a section
  heading ("Etikkaliemi:"), as recipe sites publish them.
- A recipe keeps the language it's written in, whichever that is: what it
  is is a fact about the recipe, apart from which languages the app has
  rules for. The app reads amounts (recognition, conversion, scaling) and
  knows word forms in English and Finnish to begin with. A recipe in
  another language is kept and shown as written, and the editor says so
  under its language. It still has measures, which are as much a fact
  about the recipe as its language. An unknown one asks for its language
  to be chosen.
- The recipe language offers the languages the app reads (English,
  Finnish) first, above a divider, then every other language with a
  two-letter code that the device can name; each group by its names in
  the interface's language, alphabetically. The recipe's own is always
  offered, in its place in the list; Unknown, while it's chosen, comes
  first. Devices carry different language data: headless Chromium names
  132 of the 183. A name two codes share is offered once.
- When the language chosen doesn't fit the recipe's text, by the import's
  rule (franc scores it below 0.95 of its first choice), the editor says
  so under the language, with a tap to switch: "Written in Swedish? Switch
  to it". It asks once the text has about 70 characters; with less,
  franc's guesses are noise. Only one language is offered: franc's next
  choices are mostly neighbours (Norwegian for Swedish) or noise. franc
  runs on the server, so the app's download doesn't grow; the editor asks
  when it opens, when a text field is left and when the language changes,
  not as each letter is typed, and offers nothing without the server.

### Units

- Recipes can be written in any units, mixed within one recipe. The app
  converts every quantity to the preferred unit system when displaying it;
  the recipe stays stored as written. Converted amounts should read the way
  a cook would write them, not like raw arithmetic.
- The preferred unit system is set per device. The imperial display uses US
  measures. Until someone picks one, a device uses US units when its time
  zone is in the US, and metric everywhere else.
- Each recipe has a measuring system setting (US, British, Australian,
  metric) that tells the app how to read its units. A wrong one can't be
  seen ("1 cup" reads the same either way), so it is guessed from what
  pages publish, never asked. On import it is guessed from the site's
  domain, then from the region the page states with the recipe's
  language: en-GB is British, en-AU Australian, and a region whose
  measures are metric, metric (en-NZ). The domain comes first, since a
  British blog on WordPress can still state WordPress's default, en-US.
  Otherwise, and for typed recipes, it is guessed from the recipe's
  language: the measures of the region the language is most
  likely written in, by CLDR's likely subtags, which the platform carries
  (English is the US's, Scots Britain's, Finnish and Swedish metric), and
  metric for an unknown language. Changing the language moves measures
  that followed it; measures someone picked stay, since they may know
  better. The editor shows them beside the language ("Metric"), with a tap
  to change them, since photographed and typed recipes have no domain to
  guess from.
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
  device), only the first converts. An Australian tablespoon is not a US
  unit: "100 g (7 tbsp)" in an Australian recipe reads "3½ oz (7 tbsp)" on
  a US device.
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
    and 1 °C (165 °F → 74 °C). Converting either way, the table starts
    where the temperature reaches 120 °C, so a hotter oven never reads
    cooler: 249 °F (120.6 °C) reads 120 °C, as 250 °F does.
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

- Search, derived terms, tags, scrolling the full library, and scrolling
  rows of suggestions and categories.
- Search covers titles and ingredients, in the language each recipe is
  written in. There is no matching across languages. Finnish ingredient
  names inflect (jauhot, jauhoja), so search has to match inflected forms.
  A recipe in a language the app has no rules for matches its words as
  written.
- English words are stemmed with Snowball's English algorithm (Porter2),
  from wink-porter2-stemmer. Porter's original algorithm, in
  @orama/stemmers, also brought "on" and "one" together, and "us" and
  "use". Finnish words use our own word keys: Snowball's Finnish stemmer,
  from @orama/stemmers, found every corpus form of only 142 of the 221
  words then in the answer key ("peruna" and "perunaa" stayed apart). The
  keys find them for 260 of the 263 words it now has.
- Finnish words keep our own word keys. Voikko is ruled out: with a
  Snowball fallback it matches as many word groups as our keys, would add
  1.7 MB (gzipped) to the 0.4 MB the app downloads for offline use, and
  takes about 0.4 s of start-up work with the CPU slowed six-fold to
  imitate a slow phone. Findings:
  [Voikko investigation](voikko-investigation.md).
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
  - Quick lunch: recipes with a total time of 30 minutes or less: the total
    time the source publishes when there is one, otherwise prep plus cook.
    Recipes without times are left out. The row keeps the name "quick
    lunch". The logic can be refined later.
- Category rows show recipes by derived term or tag. They are picked
  automatically, the same for the whole household; nobody has to configure
  them.
  - Only terms and tags with enough recipes to fill a row (around four or
    more) qualify, and those on most of the library are skipped.
  - Each day, a limited number of rows is picked from the qualifying ones,
    rotating so different ones come up. Every device shows the same
    selection that day.
  - With a small library, no category rows appear until one qualifies.
  - Thresholds are tuned during the build.
- Expect hundreds of recipes, but the app must look good and work with fewer
  than ten.

### Derived terms

- What a recipe is, such as its dish type, diet, occasion or season, is
  worked out by the app with deterministic rules, not by hand and not by
  AI. These are its derived terms.
- They appear in three places: search understands them ("keitto" finds
  "Inkivääri-kanakeitto"), the search box offers a few as chips (only
  those with recipes behind them), and the home screen's category rows.
- The first kinds are dish type, diet, and occasion or season.
- Dish type comes from the title ("Fazerina-juustokakku" is a cake).
- Diet comes from the ingredient lines: no meat or fish found. A
  vegetarian term is shown only once a held-out check shows that it rarely
  lists meat dishes. Allergy-type terms (gluten-free, lactose-free) come
  only from what the source states.
- Occasion and season come from the site's keywords, from a list of dishes
  tied to an occasion ("joulutorttu" for Christmas), and from the
  household's own tags.
- On import, the site's categories and keywords that the app knows are
  mapped onto its own terms ("Jälkiruoat" becomes dessert) and kept with
  the recipe. They aren't offered as tags or reviewed one by one.
- The recipe view lists a recipe's derived terms, so none is applied
  unseen. A wrong one can be removed there and a missing one added, and
  the correction stays when the rules change.

### Tags

- Tags are the household's own groupings, such as "grandma's recipes" or
  "kids' favourites", which only the household knows. What a recipe is
  comes from derived terms instead.
- One flat list: no groups or hierarchy.
- Free-form and in any language; the household decides how to use them.
- Tags are normalised to lowercase.
- Duplicate checks ignore case, spacing and plurals ("pasta", "Pasta",
  "pastas"; "jälkiruoka", "jälkiruoat"). Finnish plurals are irregular, so
  simple suffix rules won't do. The check is deliberately broad: it also
  flags other forms of a word ("välipala", "välipalaa") and English words
  made from one another ("bake", "baking").
- The duplicate check reads every tag by the rules of both languages, so a
  tag needs no language of its own: "pizza" and "pizzat" are flagged
  whichever recipes they are on.
- Possible duplicates are flagged for someone to review, never merged
  automatically. A flag can be dismissed, and the pair isn't flagged
  again.
- Typing a tag offers existing tags first, including other forms of what
  is typed, by the duplicate check: typing "jälkiruoat" offers an existing
  "jälkiruoka".
- A tag management screen lists every tag with its recipe count. Anyone can
  rename, merge and delete tags there, and flagged possible duplicates
  appear there too. Merging moves every recipe onto one tag.
- Deleting and merging tags can be undone, so neither asks for confirmation.
- Tags never disappear by themselves. An unused tag stays until someone
  deletes it.
- Filtering by several tags shows recipes that have all of them.
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
  the recipe. Every cooked date is kept, not only the last.

### Recipe view and cooking

- No separate cooking mode.
- The screen stays awake while a recipe is open.
- Tap to cross off ingredients and steps.
- Tap a time mentioned in a step to start a timer.
- To explore: the first step not yet crossed off is highlighted as the
  current one, so the view guides cooking without a separate mode.

### Interface language

- Full translation support from day one. Finnish and English first.
- Set per device, with English as the default.

### Offline

- Read-only offline use, including search.
- Cover photos are resized and compressed when uploaded.
- All recipe text and the optimised cover photos are cached for offline
  reading.
- The server renders the page around the screens: the document, the menu,
  the interface language and the sidebar. Screens render in the browser
  from data loaded through server functions. Any page the server sends can
  then start the app at any address, so the service worker keeps the latest
  one and serves it for every address offline.
- The service worker is built with Workbox, through vite-plugin-pwa. It
  caches the app's built files when it installs. Pages and data (server
  functions that read) come from the server, or from the cache when the
  server doesn't answer within 3 seconds.
- A new version takes over as soon as it's installed, and open pages reload
  into it. The editor's draft survives the reload, so nothing typed is
  lost, but the page can still reload while someone is typing.
- Until recipe caching is built (M4), data is offline only once it has been
  read online. A screen whose data was never read shows the default error
  page offline. Photos aren't kept for offline use until then; one that
  doesn't load leaves no gap or broken image.

## Not now

- Groceries and pantry tracking.
- AI features beyond reading recipes and tidying steps (see Reading with
  AI).
- Translating tags or searches between languages ("dessert" finding
  "jälkiruoka").
- Search matching later parts of compound words ("jauho" finding
  "vehnäjauhoja"). A later improvement. The first part already matches as
  you type ("kana" finds "kanapata").
- Importing from sites that block requests not made by a browser, such as
  K-Ruoka, S-Kaupat and maangchi.com. The add dialog says the site blocked
  the import.
- Importing recipes from other apps or files. There are no existing recipes
  to bring in.
- An arm64 image, for servers such as a Raspberry Pi. Maybe later.

## Build order

- M0, core logic without UI: the ingredient parser for Finnish and English,
  unit conversion and formatting, Finnish word handling for search and tags,
  and the test suite of real recipe lines, conversions and searches.
- M1, the basic loop: add a recipe from a link (the add dialog, the share
  menu entry, pasting anywhere) and check it in the editor, or type one
  in, with recognition as you type; recipe view with unit conversion and
  adjustable servings; library with sorting and search; Finnish and
  English interface; Docker image, installable as an app.
  - Search runs in the browser from the start, so it doesn't have to be
    rebuilt for offline later.
  - The data model includes from day one what's costly to add later:
    original lines, measuring system, sections, cooked dates, and deletions
    that can be undone.
  - A small prototype proved that TanStack Start and a service worker can
    serve the app offline, before much was built on top of it. The way
    screens render and the service worker under Offline come from it.
- M2: cover photos, tags and the tag screen, nightly backups. Photos no
  recipe uses (from an import never saved, or replaced or removed in the
  editor) stay in the photos folder until the nightly job clears them out,
  after long enough that an open draft keeps its photo.
- M3, everyday use: home rows, the meal queue, cooking aids (screen kept
  awake, crossing off, timers), undo and recently deleted.
- M4, offline: caching recipes and photos, and offline search.
- M5: reading with AI (photos, pages without Recipe data, pasted text) and
  Tidy steps, and export. The AI parts were built ahead of M2.
- Early, alongside the milestones: try a few real cookbook photos against
  one cloud model and one local model.

## Visual design

- Use the shadcn/ui preset the project is set up with (`b5AyAQb5pY`): the
  Maia style on Base UI, the taupe base colour, the orange theme, a bold
  menu accent and Lucide icons (`components.json`). Hold it on every
  screen.
- Text is set in Atkinson Hyperlegible Next, headings in Bitter. These
  replace the preset's own fonts (Figtree, Noto Serif).
- Warnings are amber (`--warning` in `src/styles.css`), which the preset
  doesn't have: Tailwind's amber-600, or amber-500 in dark mode.
- Light and dark themes, from the preset. The theme is set per device
  (System, Light, Dark); System, the default, follows the device's own
  setting.
- The app icon is a placeholder until a real one is designed: a white
  Bitter Bold R on the theme orange (`public/favicon.svg`).
- The menu has Home, Library, Add, Queue and Settings. Phones show it as a
  bottom bar floating as a pill; wider screens as an inset sidebar that
  collapses to icons, headed by the app name in the interface language
  (Recipes, Reseptit). Add stands out as a filled orange button: round in
  the middle of the bottom bar, at the top of the sidebar. The bottom bar
  marks the current page in orange.
- In a phone's browser the page itself scrolls, so the browser can tuck its
  toolbar away and pulling down reloads; the floating bars move with the
  page when it bounces, as fixed elements do there. In the installed app
  and on wider screens each screen scrolls inside the app, so the bars stay
  put; on wider screens inside the inset, with the app's own scrollbar,
  shown while scrolling. While a dialog is open the page doesn't bounce,
  and the floating bars fade out.
- Toasts appear at the top right (across the top on phones), clear of the
  bottom bar.
- No up-front design proposals. Set up the basics first, then iterate on the
  UI with me bit by bit.

## Avoid (common defaults for apps like this)

- A grid of rounded food-photo cards with heart icons and star ratings
- A dashboard home with stat cards
- A desktop sidebar squeezed onto a phone
- Emoji as icons, chef-hat logos, cheerful filler copy
- Purple gradients, Inter or system fonts as the only typeface

## Working rules

The working rules are in [AGENTS.md](../AGENTS.md), so every task reads them,
not only those that open this brief.

## Before calling a screen done

Check it at phone width first. Test with a recipe that mixes units, a
Finnish recipe, a recipe without a photo, and a library of 3 recipes as well
as 300. Then tell me what still looks like a template.
