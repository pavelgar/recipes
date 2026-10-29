# Recipe classification research

Researched on 23 October 2026, as input for how the app could work out what
a recipe is: its dish type, course, diet, time, cuisine, occasion or season
and main ingredient. It covers recipe apps, recipe sites' search filters,
schema.org, open food data, rule-based approaches and search interfaces.
Nothing here is decided. Measurements used the development corpus only;
nothing under `tests/corpus/held-out/` was read.

## Summary

- None of the nine recipe apps checked classifies recipes with
  deterministic rules. Where anything is automatic, it is an AI model:
  Norish's enrichment, Mealie's import step and RecipeSage's public
  catalogue.
- Apps that turn site keywords into tags draw complaints about clutter.
  Mealie imports them only when asked, Tandoor pre-ticks only those that
  already exist, and KitchenOwl and Norish drop them.
- All nine readable recipe sites filter by dish type or course and by diet,
  and most by main ingredient, occasion or season, cuisine and method. Only
  valio.fi and kotikokki.net filter by time; six others have a single
  "quick" value. All five Finnish sites offer a vegetarian value and
  "Gluteeniton".
- The corpus sites put diet, season and occasion in `keywords`. Only
  bbcgoodfood.com (3 of 5 sampled pages) and kotikokki.net (1 of 5) state a
  diet in `suitableForDiet`.
- A title's head word names a dish type for 80% of Finnish and 78% of
  English corpus titles, with a word list written on those same titles.
  Compounds and course mislead: "Banaanipannukakut" is pancakes, and
  "Siikamousse" is savoury.
- Ruling out "vegetarian" by matching Open Food Facts names with the app's
  word keys caught 38 of 64 Finnish recipes with meat, fish or gelatine,
  with one wrong flag. In English it caught 55 of 60 with none, once a
  "whiting"/"white" stemming collision was removed. Substring matching
  caught more but wrongly flagged 45 Finnish recipes.
- Ruling out "gluten-free" needs more than the open data: plain "flour" is
  not a gluten source in either Open Food Facts list, and "gluten-free
  flour" contains the word "gluten".
- Open Food Facts has 2,150 ingredient entries with Finnish names and
  inherited diet values, but the licence of its taxonomy files is
  unverified. Fineli (CC BY 4.0) has official Finnish food classes and diet
  codes, but names foods as eaten.
- Published times are uneven: on 7 of 37 sampled pages, prep plus cook is
  30 minutes or less while the published total is longer.
- In search-interface research, suggestions help only when they have
  results: NN/g saw suggested queries chosen in 23% of offers. Spotify's
  filter chips derived from each listener's own collection are the closest
  analogy found.

## How this was researched

- **Apps.** Each app's source repository was shallow-cloned at the commit
  given below and read, not run. Paprika is closed source, so only its
  official guides were used. Every issue quote below was re-checked
  against the GitHub API.
- **Sites' filters.** Listing and search pages of the ten sites were
  read as raw HTML, embedded JSON and script text, never run: 36 requests
  in all, within robots.txt, with an identifying user agent and at least
  1.5 seconds between requests per host. bbcgoodfood.com and
  bettycrocker.com keep their filters under `/search`, which robots.txt
  disallows, so only their menus were read. k-ruoka.fi answered with a
  Cloudflare challenge, which was not bypassed.
- **Recipe pages.** 46 pages were fetched to check `suitableForDiet` and
  times. The URLs came from `tests/corpus/tags/*.json`, shuffled with seed
  20261023, taking the first five per site (womensweeklyfood.com.au's file
  has one URL). robots.txt was checked for `*` and for Claude's agents;
  none of the ten sites names Claude. Requests used an identifying user
  agent and were 1.5 seconds apart per site. The crawl delays in
  bbcgoodfood.com's and tasteofhome.com's robots.txt apply only to other
  named agents (Scope3/2.0, AhrefsBot, Pinterestbot);
  womensweeklyfood.com.au's 5 seconds applies to all and was followed.
- **Corpus.** `ingredients/`, `rare-units/`, `rare-forms/`, `steps/` and
  `tags/`: 634 recipes with titles (223 Finnish, 411 English). 325 of them
  have full ingredient lists in `ingredients/` (175 Finnish, 150 English);
  the other folders hold selected lines only. Ingredient words were matched
  with the app's own `splitWords` and `wordKeys` from `src/core/words/`,
  imported read-only by a script outside the repo. That was the working
  tree of 23 October, whose English keys use wink-porter2-stemmer; the
  last commit uses @orama/stemmers. Both are Snowball's English algorithm,
  and both stem "whiting", "white" and "whites" to "white" (checked).
- **Web sources.** Quotes from schema.org, Google, NN/g and the app repos
  were copied from fetched pages. The Mealie, Norish and Tandoor quotes
  below, Google's keyword guidance and NN/g's 23% figure were fetched a
  second time and compared.
- Scripts and raw results are in `/tmp/research/` for this session only.
  This research changed no file in the repo other than this one.

## 1. Recipe apps

| App                | Organisation                                                                      | Site category, cuisine and keywords on import                                                   | Automatic classification                               |
| ------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Mealie             | Flat categories, tags and tools, shared by the group; cookbooks are saved filters | Off by default. When on: keywords become tags, categories become categories; cuisine is dropped | None by rules; an AI step on import, told not to infer |
| Tandoor            | Hierarchical keywords; foods with properties; books                               | Category, cuisine, keywords, author and site merged into keywords; existing ones pre-ticked     | Exact-rename aliases; no rules that add keywords       |
| RecipeSage         | Flat labels per user; label groups that can warn when missing                     | Category becomes labels on JSON-LD import; keywords and cuisine not read                        | None for own recipes; AI for the public catalogue      |
| Norish             | Four fixed meal categories, curated cuisines, open tags                           | Keywords dropped on the main path; category and keywords aliased onto the four categories       | AI enrichment with a probability check                 |
| Paprika            | Nested categories; built-in views such as Top Rated                               | Not documented                                                                                  | None                                                   |
| KitchenOwl         | Flat tags per household                                                           | All three ignored                                                                               | None for recipes                                       |
| Grocy              | No tags or categories; user-defined fields                                        | No web import                                                                                   | Stock status of each recipe                            |
| Nextcloud Cookbook | One category plus keywords, stored in each recipe's JSON file                     | First category only; keywords kept as published; cuisine unused                                 | None                                                   |
| Recipya            | One category from a seeded list, one cuisine, keywords                            | First category only                                                                             | None found                                             |

No app here derives dish type, diet or cuisine with deterministic rules.
Every automatic tagger found uses an AI model: Norish's enrichment, Mealie's
import step, RecipeSage's public catalogue, and two outside scripts for
Mealie
([mealie_auto_tagger](https://github.com/andrewimpellitteri/mealie_auto_tagger),
[mealie-tagging](https://github.com/cao-jacky/mealie-tagging)). Mealie,
Tandoor, KitchenOwl and Norish all read pages with the Python library
[recipe-scrapers](https://github.com/hhursev/recipe-scrapers), which also
reads `suitableForDiet` and renames `VeganDiet` to "Vegan Diet"
([`_schemaorg.py`, 15.12.0](https://github.com/hhursev/recipe-scrapers/blob/15.12.0/recipe_scrapers/_schemaorg.py#L398-L411)).

### Mealie

Read at commit `cb59fad8`.

- Categories, tags and tools are flat and shared by the group. The docs say
  "Categories are the overarching organizer… we recommend… one or two",
  and tags are "nearly identical… use tags freely"
  ([features.md](https://github.com/mealie-recipes/mealie/blob/cb59fad8f0187b1972ac040bf06aca0a34967c44/docs/docs/documentation/getting-started/features.md#L48-L70)).
  There is no built-in vocabulary. Cookbooks are saved filters over
  categories, tags, tools and foods.
- On import, `keywords` become tags and `recipeCategory` becomes
  categories, split on commas and put into Title Case
  ([scraper_strategies.py](https://github.com/mealie-recipes/mealie/blob/cb59fad8f0187b1972ac040bf06aca0a34967c44/mealie/services/scraper/scraper_strategies.py#L273-L274),
  [cleaner.py](https://github.com/mealie-recipes/mealie/blob/cb59fad8f0187b1972ac040bf06aca0a34967c44/mealie/services/scraper/cleaner.py#L632-L675)).
  Both happen only when the user ticks "Import original keywords as tags"
  or "Import original categories", which default to off
  ([preferences.ts](https://github.com/mealie-recipes/mealie/blob/cb59fad8f0187b1972ac040bf06aca0a34967c44/frontend/app/composables/use-users/preferences.ts#L237-L238)).
  An existing tag with the same slug is reused; otherwise a new one is made.
  `recipeCuisine` is not read.
- The AI import step matches site terms onto existing organisers with a
  fuzzy threshold of 90, because "Attaching the wrong organizer is worse
  than missing one, and near-misses are common among organizer names
  ("Vegan"/"Vegetarian")"
  ([organizer_resolver.py](https://github.com/mealie-recipes/mealie/blob/cb59fad8f0187b1972ac040bf06aca0a34967c44/mealie/services/recipe/organizer_resolver.py)).
  Its prompt says "Do not infer. Do not derive a cuisine from the
  ingredients, a course or meal from the kind of dish, an occasion or
  season from the style, or a diet from what the recipe happens to leave
  out", and "Returning empty lists is the correct answer for most recipes"
  ([resolve-organizers.txt](https://github.com/mealie-recipes/mealie/blob/cb59fad8f0187b1972ac040bf06aca0a34967c44/mealie/services/openai/prompts/recipes/resolve-organizers.txt#L9-L11)).
- Filters: categories, tags, tools, foods and households, each with an
  any/all switch. A "Recipe Finder" ranks recipes by the foods you have,
  allowing 5 missing by default. Data management has bulk tagging, merging
  and a list of empty tags.
- Users report import clutter: "it floods the tag system… I have to clean
  out the tag garbage after every import"
  ([discussion #242](https://github.com/mealie-recipes/mealie/discussions/242)).
  [#7142](https://github.com/mealie-recipes/mealie/discussions/7142) asks
  to "auto-suggest the 'vegan' flag (with user confirmation)".

### Tandoor Recipes

Read at commit `fe0aaaf5`.

- Keywords form a tree shared by a space
  ([models.py](https://github.com/TandoorRecipes/recipes/blob/fe0aaaf5110a38bfc3a426469e943ec0553573cc/cookbook/models.py#L723)).
  Foods are also a tree, with a supermarket category, "on hand", substitutes
  and numeric properties.
- On import, `keywords`, `recipeCategory`, `recipeCuisine`, the author and
  the site's host name go into one list, casefolded and de-duplicated
  ([recipe_url_import.py](https://github.com/TandoorRecipes/recipes/blob/fe0aaaf5110a38bfc3a426469e943ec0553573cc/cookbook/helper/recipe_url_import.py#L111-L145)).
  Each passes through keyword aliases and is matched against existing
  keywords. The import screen pre-ticks the existing ones and leaves new
  ones unticked
  ([RecipeImportPage.vue](https://github.com/TandoorRecipes/recipes/blob/fe0aaaf5110a38bfc3a426469e943ec0553573cc/vue3/src/pages/RecipeImportPage.vue#L825)).
- "Automations" come in ten types: Food Alias, Unit Alias, Keyword Alias,
  Description Replace, Instruction Replace, Never Unit, Transpose Words,
  Food Replace, Unit Replace and Name Replace
  ([models.py](https://github.com/TandoorRecipes/recipes/blob/fe0aaaf5110a38bfc3a426469e943ec0553573cc/cookbook/models.py#L1669-L1692)).
  Keyword Alias is an exact, case-insensitive rename. Aliases are usually
  made by ticking "Automate" when merging. No type adds a keyword from
  ingredients or times.
- Recipe properties, allergen-type ones included, are sums of food property
  values over the ingredient amounts. There is no diet flag. On a request
  for allergen and diet flags, the maintainer answered "probably by marking
  food with certain properties"
  ([#2022](https://github.com/TandoorRecipes/recipes/issues/2022)).
- Filters: keywords, foods and books with or, and, or-not and and-not;
  ratings; cooked counts and dates; and "make now" from foods on hand.
- [#1401](https://github.com/TandoorRecipes/recipes/issues/1401): "Imported
  keywords of 3rd party sites are great for searching but they clutter up
  the recipe cards."

### RecipeSage

Read at commit `beda3014`.

- Labels are flat and per user. Optional label groups can warn "if saving a
  recipe without a label in this category attached"
  ([schema.prisma](https://github.com/julianpoy/RecipeSage/blob/beda301475d2beb3272c79411c769557d350fd5f/packages/prisma/src/prisma/schema.prisma#L101-L132)).
- Its own clipper splits `recipeCategory` on commas into labels and does
  not read `keywords` or `recipeCuisine`
  ([jsonLD.ts](https://github.com/julianpoy/RecipeSage/blob/beda301475d2beb3272c79411c769557d350fd5f/packages/util/server/src/general/jsonLD.ts#L473-L487)).
  Clipping from the editor drops the labels.
- The public "Discover" catalogue has a fixed vocabulary in five groups:
  course, cuisine, dietary, mainIngredient and method. Course has 12
  values: breakfast, lunch, dinner, appetizer, sideDish, salad, soup,
  dessert, snack, beverage, bread and sauce
  ([discoverCategories.ts](https://github.com/julianpoy/RecipeSage/blob/beda301475d2beb3272c79411c769557d350fd5f/packages/util/shared/src/discoverCategories.ts)).
  An AI step assigns them, limited to valid keys.
- Users ask for NOT and boolean label filters
  ([#1949](https://github.com/julianpoy/RecipeSage/issues/1949)).

### Norish

Read at commit `c79a86b3` ([norish.dev](https://norish.dev)).

- Three vocabularies with different rules. Categories are a fixed list of
  four: Breakfast, Lunch, Dinner, Snack
  ([recipe-categories.ts](https://github.com/norish-recipes/norish/blob/c79a86b3271a7801401e65c88228874c7a648bb6/packages/db-schema/src/schema/recipe-categories.ts#L3-L8)).
  Cuisines are curated by an administrator; tags are open.
  [ADR-0012](https://github.com/norish-recipes/norish/blob/c79a86b3271a7801401e65c88228874c7a648bb6/docs/adr/recipes/0012-cuisines-are-curated-tags-are-not.md)
  explains: "Tags are an open folksonomy… while Cuisines are a curated
  vocabulary", and "Tags are meant to be a dumping ground, which is
  precisely why cuisine should not live there". It wants "Sicilian" to
  resolve "onto the row that already means Italian".
- The scraper path imports no tags; the code marks the tag builder "TODO…
  the tags often do not make sense"
  ([adapter.ts](https://github.com/norish-recipes/norish/blob/c79a86b3271a7801401e65c88228874c7a648bb6/packages/api/src/parser/python/adapter.ts#L89-L118)).
  Category and keywords are mapped through a fixed alias table onto the
  four categories, for example `supper: "Dinner"` and `dessert: "Snack"`.
- Classification is AI "Recipe Enrichment": tags, allergy tags, meal
  categories, nutrition, cuisines and more, each switchable, with only
  allergy detection on by default
  ([enrichment.md](https://github.com/norish-recipes/norish/blob/c79a86b3271a7801401e65c88228874c7a648bb6/apps/docs/docs/recipes/enrichment.md)).
  The default tag list has 37 entries, such as "vegetarian, vegan,
  gluten-free… quick meal, slow cooker, one-pot… easy, intermediate,
  advanced, budget-friendly"
  ([auto-tagging.txt](https://github.com/norish-recipes/norish/blob/c79a86b3271a7801401e65c88228874c7a648bb6/packages/shared-server/src/ai/prompts/auto-tagging.txt)).
  Existing data wins: tags are "only ever added, never removed".
- Filters include maximum cooking time as chips for under 15, 30, 60 and
  120 minutes.
- Issues show the model's limits: "it just doesn't assign all the tags…
  allergen tags e.g. Dairy Free"
  ([#437](https://github.com/norish-recipes/norish/issues/437)), and "AI
  sometimes creates tags with wrong caps, even if it is set to only use
  predefined tags" ([#421](https://github.com/norish-recipes/norish/issues/421)).

### Paprika

From the official [Mac](https://www.paprikaapp.com/help/mac/) and
[iOS](https://www.paprikaapp.com/help/ios/) guides.

- Categories can nest, and a recipe can be in "one (or more) categories".
  Built-in views that "cannot be removed" include All Recipes, Most Recent,
  Top Rated, Favorites and Uncategorized. The guides mention no tags.
- The guides say nothing about what happens to a site's category or
  keywords when clipping (**unverified**).
- Search covers the name by default, with other fields selectable, and a
  "Match" choice of all or any categories.

### KitchenOwl, Grocy, Nextcloud Cookbook and Recipya

- **KitchenOwl** (commit `cac641c6`): flat tags per household; import
  ignores `keywords`, `category` and `cuisine`
  ([recipe_scraping.py](https://github.com/TomBursch/kitchenowl/blob/cac641c619963f13134aecb80fadfb81f0c9249b/backend/app/service/recipe_scraping.py#L42-L139)).
  Tag chips filter with AND. A user asks to "use a tag as an exclusion
  filter" ([#695](https://github.com/TomBursch/kitchenowl/issues/695)).
- **Grocy** (commit `41206cb9`): recipes have no tags or categories; users
  add their own fields. The maintainer calls this "one of the most
  frequently asked usage questions of all"
  ([#2946](https://github.com/grocy/grocy/issues/2946)). Recipes are
  filtered by stock status instead.
- **Nextcloud Cookbook** (commit `d183b35c`): keeps only the first
  `recipeCategory` value, and keeps `keywords` as published after
  splitting on commas
  ([FixKeywordsFilter.php](https://github.com/nextcloud/cookbook/blob/d183b35c7aa9fa45f6c46220e40deff2963ce771/lib/Helper/Filter/JSON/FixKeywordsFilter.php#L42)).
  [#682](https://github.com/nextcloud/cookbook/issues/682), open since
  2021: "Over time I got a lot of different keywords, some are English,
  some are German… a lot of them are just not helpful at all."
  [#2180](https://github.com/nextcloud/cookbook/issues/2180): "you can't
  exclude Tags in the search, so you would have to use a Tag like 'Gluten
  free' on each recipe."
- **Recipya** (commit `0df0ee29`): every new user gets a seeded list of
  categories: "uncategorized, appetizers, bread, breakfasts, condiments,
  dessert, lunch, main dish, salad, side dish, snacks, soups, stews"
  ([migration](https://github.com/reaper47/recipya/blob/0df0ee292cff05045e5d72a656456ebad460969e/internal/services/migrations/20230609214207_add_recipes.sql#L178-L185)).

### What the apps show

- A small fixed or curated vocabulary next to open tags is common: Norish's
  four categories and curated cuisines, RecipeSage's Discover groups,
  Recipya's seeded categories, Mealie's categories against tags.
- For site keywords, five behaviours were found: drop them (KitchenOwl,
  Norish's scraper path), import on request (Mealie), offer them with only
  existing ones pre-ticked (Tandoor), keep them as published (Nextcloud
  Cookbook), or map them onto a fixed list (Norish's categories). The
  clutter complaints come from the apps that keep or create them.
- Users of three apps ask for exclusion filters (KitchenOwl #695,
  Nextcloud Cookbook #2180, RecipeSage #1949); Tandoor already has or-not
  and and-not. A diet check that rules things out is a kind of exclusion.

## 2. What recipe sites filter by

Values are copied from each site's listing or search page as published,
with group names in the original language. Full lists are in
`/tmp/research/sites/facets-<site>.json`. No site shows recipe counts per
value in its HTML; kingarthurbaking.com's search API returns them.

### Finnish sites

**valio.fi**, [reseptihaku](https://www.valio.fi/reseptihaku/) (filter
data embedded in the page):

- **Ruokalajit**: Alkuruoat, Pääruoat, Jälkiruoat, Salaatit, Keitot,
  Juustotarjottimet, Aamu-, väli- ja iltapalat, Kylmät juomat, Kuumat
  juomat
- **Leivonta**: Taikinat, Kakut, Muffinsit, Pullat, Leivät, Suolaiset
  piirakat, Mokkapalat, Makeat piirakat, Keksit
- **Ruokavaliot**: Gluteeniton, Laktoositon, Luomu, Kasvis (lakto-ovo),
  Kevyempi, Vähemmän suolaa, Kananmunaton, Maidoton, Vegaaninen,
  Vähähiilihydraattinen, Sydänmerkki-resepti
- **Raaka-aineet**: Liha, Jauheliha, Broileri, Kala, Kasvikset ja
  juurekset, MiFU, Juusto, Äyriäiset, Peruna, Riista, Hedelmät, Marjat
- **Aika**: 20 min, 40 min, 1 h, 2 h, as a maximum of active time (the
  field is `preparation_time_active_minutes`)
- **Vaikeustaso**: Helppo, Keskitaso, Haastava
- **Valmistustapa**: Grillissä, Liedellä, Uunissa, Airfryer, Muu
- **Teemat** (23): Kalakeittopäivä, Runebergin päivä, Laskiainen,
  Ystävänpäivä, Pääsiäinen, Vappu, Äitienpäivä, Valmistujaiset, Juhannus,
  Venetsialaiset, Suomalaisen ruoan päivä, Halloween, Pyhäinpäivä,
  Isänpäivä, Itsenäisyyspäivä, Pikkujoulut, Joulu, Uusivuosi, Brunssi,
  Illanistujaiset, Lastenjuhlat, Grillaus, Piknik
- **Kulttuuri** (15): Aasia, Britannia, Espanja, Intia, Italia, Kreikka,
  Lähi-itä, Pohjois-Amerikka, Ranska, Skandinavia, Suomi, Australia,
  Etelä-Amerikka, Keski-Eurooppa, Venäjä
- Also **Kategoria** (Ruoanlaitto, Leivonta) and **Tehnyt** (who made it).

**yhteishyva.fi**, [haku](https://yhteishyva.fi/haku):

- **Ruokalaji**: Arkiruoka, Keitto, Pasta, Salaatti, Välipala, Illallinen,
  Jälkiruoka, Juhlaan, Leivonta
- **Raaka-aine**: Kasvikset, Hedelmät, Kala, Kasviproteiini, Kana,
  Jauheliha, Liha
- **Ruokavalio**: Gluteeniton, Maidoton, Munaton, Laktoositon, FODMAP,
  Kasvisruoka, Vegaaninen
- No time filter. The menu "Juhlat ja sesongit" has 17 entries, such as
  Laskiainen, Grillikausi, Juhannus, Sadonkorjuu and Pikkujoulut.

**arla.fi**, [reseptit](https://www.arla.fi/reseptit/): 18 groups of
hierarchical tags, 528 tags in all. Among them:

- **Ruokavalio ja allergiat**: Gluteeniton, Karppaus, Kasvisruoka,
  Kasvisruokavalio, Lakto-ovo, Laktoositon, Pescovegetaristi,
  Proteiinipitoinen, Sokeriton, Vähähiilihydraattinen, Vähäkalorinen,
  Vähärasvainen
- **Vuodenaikoja ja vapaapäiviä**: Äitienpäivä, Halloween, Isänpäivä,
  Itsenäisyyspäivä, Joulu, Juhannus, Pääsiäinen, Rapujuhlat, Runebergin
  päivä, Uusivuosi, Vappu, Ystävänpäivä; Kesä, Kevät, Syksy, Talvi; Ympäri
  vuoden
- **Ateria** (30, for example Aamupala, Lounas, Illallinen with Alkuruoka,
  Pääruoka and Jälkiruoka under it, Eväs, Piknik), **Tilaisuudet** (19,
  for example Arkiruoka, Kahdelle, Lastenjuhlat, Perjantai),
  **Reseptin tyyppi** (79, for example Keitto, Pata, Lihapullat,
  Voileipäkakku, Wrapit), **Leivonta ja jälkiruoat** (51), **Maailman
  ruokia** (29) and **Ruoanlaitto tyyli** (37, including Nopea, Helppo,
  Halpa and a Valmistustapa subgroup).
- Nine main-ingredient groups: Meijeri, Hedelmät, Kasvikset, Yrtit ja
  mausteet, Lihat, Siipikarja, Kalat ja äyriäiset, Pähkinät ja siemenet,
  Ruokakomero.
- "Ehdotetut teemat" (suggested themes) shows 10 tags as shortcuts:
  Aamupala, Iltapala, Lounas, Jauheliha, Uusi, Smoothie, Vuoka,
  Kasvisruoka, Arkiruoka, Lastenjuhlat.
- No time filter, only the tag "Nopea".

**soppa365.fi**, [reseptihaku](https://www.soppa365.fi/reseptihaku): one
flat **Kategoria** list of 27: Burgerit ja hodarit, Kana, Leivonta, Pizzat
ja piirakat, Kala, Liha, Kasvis, Arjen nopeat, Juhli ja nauti, Alkuruuat,
Jälkiruuat, Aamiaiset, Välipalat, Grillaus, Suolainen leivonta, Makea
leivonta, Pastat ja risotot, Keitot, Salaatit, Padat ja laatikot,
Kastikkeet, tahnat ja marinadit, Lisukkeet, Juomat, Säilöntä, Gluteeniton,
Vegaaninen, Muuta. Theme pages add "30 minuuttia", "Vegebaari" and others.

**kotikokki.net**, [reseptit](https://www.kotikokki.net/reseptit/):

- **Kategoria** (16): Alkupalat, Pääruoat, Jälkiruoat, Juomat, Keitot,
  Pastat ja nuudelit, Pizzat, Makeat leivonnaiset, Kastikkeet ja
  marinadit, Välipalat, Salaatit, Leivät ja sämpylät, Suolaiset
  leivonnaiset, Lisukkeet, Säilöntä, Vauvan ruoka
- **Pääraaka-aine**: Kasvikset, Marjat ja hedelmät, Punainen liha,
  Makkara ja jauheliha, Kana ja linnut, Viljat ja riisi, Kala ja
  äyriäiset, Maitotuotteet ja kananmuna
- **Erikoisruokavalio**: Gluteeniton, Sokeriton, Kananmunaton,
  Kasvisruoka, Vegaani, Maidoton, Vähähiilihydraattinen, Vähärasvainen
- **Valmistusaika**: a slider with steps from "hetki" through 15 min, 30
  min, 1 h, 1 h 30 min, 2 h, 3 h, 6 h, 12 h and 24 h to "useita päiviä"
- Sort: Parhaiten osuvat, Uusimmat, Peukutetuimmat, Aakkosittain. 40 theme
  pages, such as "Helpot arkiruokareseptit" and "Hävikkiruoka".

**k-ruoka.fi: unverified.** robots.txt allows `/reseptit` but disallows
the `haku=` and `suodata=` parameters, and `/reseptit` returned HTTP 403
with a Cloudflare challenge. Search-engine summaries of its help pages
mention dish type, main ingredient, cooking time, season, diet and meal
type, and time bands "5–15 min, 15–30 min, 30–60 min, over 60 min"; the
Finnish labels are not known.

### English sites

- **tasteofhome.com**, [recipes](https://www.tasteofhome.com/recipes/): 802
  filter chips in 13 groups. Group names were matched from the site's menu,
  not printed next to the chips.
  - **Meal Types**: Dinner, Desserts, Lunch, Side Dishes, Appetizers,
    Breakfast, Brunch, Snacks
  - **Health & Wellness**: Vegetarian, Diabetic, Dairy-Free, Healthy
    Eating, Vegan, Low-Fat, Low-Sodium, Gluten-Free, Low-Carb, Keto Diet
    (plus two article topics)
  - **Cooking Style**: Easy, Quick, Winning Recipes, Kid-Friendly,
    Make-Ahead, Cooking for Two, Freezer-Friendly, Comfort Food, Copycat
  - **Holidays & Events** (38, for example Potluck, Christmas, Fall,
    Thanksgiving, Super Bowl, Tailgating), **Cuisines** (40),
    **Techniques** (28), **Gear** (40), **Ingredients** (268) and
    **Dishes & Beverages** (334)
- **kingarthurbaking.com**: **Category** (a tree of 28 baking categories,
  such as Cake → Layer cake), **Ingredient** (include and exclude),
  **Diet** (Gluten-free, Dairy-free, Grain-free, Whole Grain, Vegan,
  Keto-friendly), **Methods** (Quick & easy, No-bake, Start with a mix,
  Overnight, No-knead, Bread machine, Tangzhong, Grilled), **Occasions**
  (11), **Flavors** (73) and **Ratings**. For the 398 cake recipes, Diet
  counts are Gluten-free 107, Dairy-free 38, Grain-free 23, Whole Grain 21,
  Vegan 12.
- **bbcgoodfood.com** and **bettycrocker.com** keep their filters under
  `/search`, which robots.txt disallows, so only their menus were read.
  bbcgoodfood.com's menu has What to cook (Quick and easy, One-pots, Slow
  cooker recipes, Traybakes, Air fryer recipes, Batch cooking), Meal type,
  Diet type (Vegan, Vegetarian) and Occasion recipes; its recipe cards show
  time, skill level and vegetarian, gluten-free and healthy badges.
  bettycrocker.com's recipe metadata uses the groups Meal Type, Key
  Ingredient, Theme, Prep Method, Dish Type, Occasion, Cuisine, Diet
  Nutrition and Season.

### Across the sites

| Kind                | Sites with it                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Dish type or course | All nine (menus only on bbcgoodfood.com and bettycrocker.com); often one group (valio.fi "Ruokalajit")              |
| Diet                | All nine (menus only on bbcgoodfood.com and bettycrocker.com)                                                       |
| Main ingredient     | valio.fi, yhteishyva.fi, arla.fi, kotikokki.net, tasteofhome.com, kingarthurbaking.com; soppa365.fi in its one list |
| Occasion or season  | valio.fi, arla.fi, tasteofhome.com, kingarthurbaking.com; menus on four others                                      |
| Cuisine             | valio.fi, arla.fi, tasteofhome.com; menus on bbcgoodfood.com, bettycrocker.com and kotikokki.net                    |
| Method or equipment | valio.fi, arla.fi, tasteofhome.com, kingarthurbaking.com; menus on bbcgoodfood.com and bettycrocker.com             |
| Time                | Only valio.fi (a maximum) and kotikokki.net (a range)                                                               |
| Difficulty          | valio.fi; a tag or badge on arla.fi, tasteofhome.com and bbcgoodfood.com                                            |

- **Diet values the Finnish sites share:** a vegetarian value on all five
  ("Kasvis (lakto-ovo)", "Kasvisruoka", "Kasvis") and "Gluteeniton" on all
  five. Vegan on four (not arla.fi). Dairy-free ("Maidoton"), lactose-free
  ("Laktoositon") and egg-free ("Kananmunaton", "Munaton") on three each.
  Low-carb on three.
- **Main-ingredient values the Finnish sites share:** meat ("Liha",
  "Lihat", "Punainen liha"), chicken ("Broileri", "Kana", "Kana ja
  linnut", "Siipikarja") and fish on all five, vegetables on four, and
  mince ("Jauheliha", "Makkara ja jauheliha") on at least three.
- **Quick is a value, not a range,** on six of the nine: "Arjen nopeat"
  and "30 minuuttia" (soppa365.fi), "Nopea" (arla.fi), "Quick"
  (tasteofhome.com), "Quick & easy" (kingarthurbaking.com), "Quick and
  easy" (bbcgoodfood.com) and "30 Minutes Or Less" (bettycrocker.com's
  metadata). yhteishyva.fi's filters have neither a time nor a quick
  value.
- **Site keywords are often the site's own facet values.** On
  kingarthurbaking.com 384 of 393 keyword uses are filter values, and all
  115 tasteofhome.com categories are Meal Types values. On valio.fi only
  103 of 318 are: its keywords also carry seasons ("talvi" 14, "syksy" 13)
  and forms such as "gluteenittomat reseptit" that its filters write
  "Gluteeniton". On kotikokki.net, 35 of 295.
- **The sites' dish lists against corpus titles.** Matching the title
  dish words of section 5.1 against the sites' own dish-type values (with
  the app's word keys) found 39 of the 80 Finnish dish words, covering 129
  of 179 dish-headed titles. In English it found 79 of 149 words, covering
  236 of 320 titles. The rest is a long tail ("bouillabaisse", "käristys",
  "nachot") and British spellings missing from American lists ("lasagne",
  "chilli", "omelette").

## 3. schema.org, and what the corpus sites publish

### Definitions

From schema.org V30.1, released 16 September 2026
([release](https://schema.org/version/latest/)):

- [`recipeCategory`](https://schema.org/recipeCategory), Text: "The
  category of the recipe—for example, appetizer, entree, etc."
- [`recipeCuisine`](https://schema.org/recipeCuisine), Text: "The cuisine
  of the recipe (for example, French or Ethiopian)."
- [`keywords`](https://schema.org/keywords), DefinedTerm, Text or URL:
  "Keywords or tags used to describe some item. Multiple textual entries in
  a keywords list are typically delimited by commas, or by repeating the
  property."
- [`suitableForDiet`](https://schema.org/suitableForDiet), Diet or
  RestrictedDiet: "Indicates a dietary restriction or guideline for which
  this recipe or menu item is suitable, e.g. diabetic, halal etc." `Diet`
  was added to the range in V30.0
  ([release notes](https://schema.org/docs/releases.html)).

[RestrictedDiet](https://schema.org/RestrictedDiet) has 11 members:
DiabeticDiet, GlutenFreeDiet, HalalDiet, HinduDiet ("in particular,
beef-free"), KosherDiet, LowCalorieDiet, LowFatDiet, LowLactoseDiet,
LowSaltDiet, VeganDiet ("exclusive of all animal products") and
VegetarianDiet ("exclusive of animal meat"). There is no dairy-free,
egg-free, nut-free or pescatarian member. The proposal that created it
called the list "inspired by the meal types offered by major airlines" and
"a trade-off between being as accurate as possible and reducing burden on
the publishers" ([#845](https://github.com/schemaorg/schemaorg/issues/845)).
Requests for more diets are open
([#4666](https://github.com/schemaorg/schemaorg/issues/4666),
[PR #4682](https://github.com/schemaorg/schemaorg/pull/4682)).

Google's [recipe guidance](https://developers.google.com/search/docs/appearance/structured-data/recipe)
recommends all three text fields:

- `recipeCategory`: "The type of meal or course your recipe is about. For
  example: "dinner", "main course", or "dessert, snack"."
- `keywords`: "Other terms for your recipe such as the season ("summer"),
  the holiday ("Halloween"), or other descriptors ("quick", "easy",
  "authentic")… Don't use a tag that's actually a recipeCategory or
  recipeCuisine."
- The page never mentions `suitableForDiet`, or the word "diet" at all
  (checked on the fetched text).

### What the corpus sites publish

Counted on `tests/corpus/tags/*.json`, splitting on commas (";;" for
kingarthurbaking.com).

- **`recipeCategory` is mostly course or meal.** tasteofhome.com: Dinner
  38, Desserts 25, Side Dishes 18, Lunch 16. bettycrocker.com: Dinner 23,
  Dessert 22, Side Dish 7. bbcgoodfood.com: Dinner 19, Dessert 12, Main
  course 7. arla.fi: Illallinen 8, Pääruoka 7, Lounas 7, Välipala 6,
  Jälkiruoka 6. kotikokki.net and valio.fi mix course with dish groups
  ("Pääruoat", "Suolaiset leivonnaiset", "Keitot"). yhteishyva.fi uses
  dish types ("Salaatit", "Piirakka", "Kastikkeet", "Pihvit") with 12 of
  its 18 values used once.
- **soppa365.fi puts the same list in `recipeCategory` and
  `recipeCuisine`**, mixing diet ("Kasvis" 15, "Gluteeniton" 3), speed
  ("Arjen nopeat" 12), main ingredient ("Kana", "Liha", "Kala"), method
  ("Grillaus") and occasion ("Juhli ja nauti"). Its URL paths repeat them:
  `/reseptit/kasvis-arjen-nopeat/tofu-kasvisvokki`.
- **`recipeCuisine` comes in several shapes.** Adjectives (arla.fi
  "Ranskalainen" 5, yhteishyva.fi "Aasialainen" 3), genitives ("Välimeren"
  7, "Lähi-idän" 1), country and region nouns (valio.fi "Espanja",
  "Keski-Eurooppa", "Skandinavia") and continents (tasteofhome.com "North
  America" 14, "Europe" 5).
- **Diet, season and occasion live in `keywords` on the Finnish sites.**
  valio.fi: "kasvis (lakto-ovo)" 15 of 28 recipes, "gluteeniton" 10,
  "laktoositon" 10, "kananmunaton" 8; "talvi" 14, "syksy" 13, "kevät" 12;
  "arkiruoka" 18, "viikonloppureseptit" 10, "kesäjuhlat" 10.
  yhteishyva.fi: "Munaton" 14, "Maidoton" 10, "Laktoositon" 9,
  "Gluteeniton" 9, "Kasvisruoka" 8, "Vegaaninen" 5; "Illanistujaiset" 7,
  "Valmistujaiset" 3, "Äitienpäivä" 3, "Edulliset" 3, "Nopeat" 3.
- **English keywords are noisier.** kingarthurbaking.com is the cleanest:
  "Breakfast & brunch" 20, "Dairy-free" 18, "Quick & easy" 13,
  "Gluten-free" 11, "Vegan" 10, "Thanksgiving" 7. bbcgoodfood.com mixes
  authors ("Josh Eagleton" 7), nutrients ("Fibre" 6, "Calcium" 5), time
  bands ("10-30 minutes", "30-60 minutes", "Over an hour") and "600 kcal
  or less" (5). bettycrocker.com's keywords are fragments ("&" 38, "bake"
  33, "pre-made" 26).
- **Some keywords are just the recipe.** All 37 arla.fi keyword values are
  used once, most of them the recipe's own name. kotikokki.net's are
  ingredient words that look machine-lemmatised: "voittaa" (to win) on 8
  recipes, apparently from "voita" (butter), and "suolata", "munata" and
  "öljytä" as verbs. That they are machine-made is an inference, not
  confirmed by the site.

### `suitableForDiet` on the sampled pages

The tag corpus didn't collect `suitableForDiet`, so 46 pages were checked
for it in JSON-LD and microdata.

| Site            | Pages | With a value | Notes                                          |
| --------------- | ----- | ------------ | ---------------------------------------------- |
| bbcgoodfood.com | 5     | 3            | One comma-separated string of schema.org URLs  |
| kotikokki.net   | 5     | 1            | The field is on all 5 pages; 4 are empty lists |
| 8 other sites   | 36    | 0            | Not present                                    |

The other eight are arla.fi, soppa365.fi, valio.fi, yhteishyva.fi,
kingarthurbaking.com, bettycrocker.com, tasteofhome.com and
womensweeklyfood.com.au (one page).

- bbcgoodfood.com writes the values as one string, not a list. On
  "Boulevardier" it is:

  ```text
  https://schema.org/GlutenFreeDiet, https://schema.org/VeganDiet, https://schema.org/VegetarianDiet
  ```

  "Foolproof chocolate & coffee fondants" has no value, though its
  ingredients (butter, chocolate, eggs, flour) are vegetarian. A missing
  value doesn't mean unsuitable.

- kotikokki.net's one value is `GlutenFreeDiet`, on "Karhu-tölkki kakku
  17.9.2022". Its ingredients include "kakkupohja, valmis 8-10hlö
  (Rainbow)", a ready-made sponge base whose gluten content the recipe
  doesn't state. kotikokki.net recipes are written by home cooks.
- The Finnish editorial sites carry the same information in `keywords`
  instead (above).

## 4. Open food data

Counts are from the files downloaded on 23 October 2026, parsed with
scripts in `/tmp/research/`.

### Open Food Facts ingredients taxonomy

[`taxonomies/food/ingredients.txt`](https://github.com/openfoodfacts/openfoodfacts-server/blob/23db7994ee10549b81d099e750903a80281e8fc8/taxonomies/food/ingredients.txt)
at commit `23db7994`: plain UTF-8 text, 104,946 lines, 5,753 entries. Each
entry has parent lines (`< en:meat`), one line of names per language, and
properties such as `vegan:en: no`.

- 2,150 entries have Finnish names (3,082 names in all). Explicit
  vegan/vegetarian values are few: 226 entries carry `vegan:en`, 229
  `vegetarian:en`. Most entries get a value by inheriting from a parent.
  Walking parents in sorted order, as Open Food Facts does, the Finnish
  entries come out vegetarian yes 1,456, maybe 309, no 256, none 129.
- Real entries, with their vegan and vegetarian values:
  - pork, `fi: sika, siasta, sian`: no, no
  - butter, `fi: voi, voita`: no, yes, with allergen milk
  - chicken egg, `fi: kananmuna, kananmunaa, kanamunaa`: no, yes
  - coconut milk, `fi: kookosmaito`: yes, yes
  - rennet, `fi: juoksute, juoksete`: maybe, maybe

  Sugar is vegan "maybe", and Parmigiano-Reggiano vegetarian "maybe".

- Gaps found: no Finnish name for plain gelatine (`liivate`), peanut butter
  (`maapähkinävoi`), plain `jauheliha`, `kermaviili` or
  `kauraruokakerma`. The hierarchy is uneven: pork and beef sit under
  "animal", not "meat".
- Open Food Facts itself decides a product's status in a fixed order
  ([Ingredients.pm](https://github.com/openfoodfacts/openfoodfacts-server/blob/23db7994ee10549b81d099e750903a80281e8fc8/lib/ProductOpener/Ingredients.pm#L5014-L5205)):
  any "no" ingredient makes the product non-vegan; otherwise any unknown
  ingredient makes it "vegan-status-unknown"; otherwise any "maybe" makes
  it "maybe-vegan"; only then is it vegan. An unknown ingredient never
  gives a positive result. Its docs warn: "Parsing might not be perfect and
  the ingredient detection might have issues in some languages"
  ([docs](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/get-ingredient-related-analysis/)).
- **Licence: unverified.** The repository is AGPL-3.0, which covers the
  software. The database is under the ODbL with contents under the DbCL
  ([world.openfoodfacts.org/data](https://world.openfoodfacts.org/data)).
  No statement was found for the taxonomy files themselves; the wiki page
  that may say is behind a bot check, which was not bypassed.

### Open Food Facts allergens taxonomy and the EU list

- [`taxonomies/allergens.txt`](https://github.com/openfoodfacts/openfoodfacts-server/blob/23db7994ee10549b81d099e750903a80281e8fc8/taxonomies/allergens.txt)
  has 27 entries: the 14 EU allergens, "none", and 12 entries with English
  and Japanese names only. The 14 have 1,694 Finnish synonyms in inflected
  forms, for example 642 for gluten and 388 for milk, among them "kerma",
  "kermaa", "kermasta", "voi" and "voita".
- The gluten list includes oats (`kaura`, and `oats` in English), while
  the ingredients taxonomy gives oat entries no allergen. Finnish sites
  label oat recipes gluten-free when the oats are: yhteishyva.fi's
  "Neljän aineksen marjamuffinssit" has "1 dl kaurahiutaleita
  (gluteenittomia)" and the keyword "Gluteeniton".
- Open Food Facts marks an allergen as a trace when "may contain" wording
  comes before it; the Finnish wording includes "saattaa sisältää"
  ([IngredientsStrings.pm](https://github.com/openfoodfacts/openfoodfacts-server/blob/23db7994ee10549b81d099e750903a80281e8fc8/lib/ProductOpener/IngredientsStrings.pm#L169)).
- The official Finnish names of the 14 allergens are in Ruokavirasto's
  [table](https://www.ruokavirasto.fi/globalassets/henkiloasiakkaat/tietoa-elintarvikkeista/elintarvikealan-toiminta-yksityishenkilona/taulukko_1-_allergioita_tai_intoleransseja_aiheuttavat_aineet.pdf),
  for example "Gluteenia sisältävät viljat ja viljatuotteet", "Maito ja
  maitotuotteet (ml. laktoosi)" and "Pähkinät ja mantelit ja pähkinä- ja
  mantelituotteet". The EU regulation's own text on EUR-Lex returned a bot
  check, so its English wording is **unverified** here.

### Fineli

Fineli is THL's Finnish food composition database.

- **Licence:** CC BY 4.0, crediting "Terveyden ja hyvinvoinnin laitos,
  Fineli", without implying THL endorses the service; Fineli is a
  registered trademark (from a
  [snapshot of the open data page](https://web.archive.org/web/20261017083602/https://fineli.fi/fineli/fi/avoin-data),
  17 October 2026).
- **Access:** fineli.fi answered every automated request, robots.txt
  included, with a Cloudflare challenge, which was not bypassed. The page
  snapshot lists packages of 4,232 foods with Finnish, Swedish and English
  names as CSV, but no release number. Counts below come from an unmodified
  third-party mirror of Release 18.0 (2017,
  [theel0ja/fineli-data](https://github.com/theel0ja/fineli-data/tree/b01d1e9dface84d4a7b8868e3eeb452d343770e4)),
  so they are older than the current data.
- **Format:** semicolon-separated CSV in ISO-8859-1 with decimal commas.
  `food.csv` gives each food two classifications, each with an upper level:
  IGCLASS (raaka-aineluokka, ingredient class) and FUCLASS
  (ruoankäyttöluokka, food use class).
- **Classes:** IGCLASS upper levels include MEATTOT "Lihat" (129 foods),
  FISHTOT "Kala" (81), MILKTOT "Maito" (348), EGGTOT "Muna" (10) and
  NONINGR "Ei raaka-aine" for all 2,621 dishes. FUCLASS has dish groups
  such as MEATDTOT "Liharuoat" (683) and FISHDTOT "Kalaruoat" (258).
- **Special diets:** `specdiet.csv` has 30 codes, for example VEGAN (1,036
  foods), LACVEGE (2,000) and GLUTFREE (2,303; Fineli leaves oats out of
  it). These are "suitable for" claims, and 588 foods have no code at all,
  so a missing code doesn't mean unsuitable. FOODID 776 "Kokolihaleikkele,
  naudanlihaleikkele, rasvaa 2,8 %", a beef cold cut, is coded LACVEGE in
  Release 18; whether that is fixed later is **unverified**.
- **Fit:** names describe foods as eaten, head first with qualifiers:
  "Jauho, vehnäjauho, puolikarkea", "Kerma, kuohukerma, rasvaa 38 %",
  "Jauheliha, sika-nauta". Recipe lines name ingredients differently
  ("2 dl kuohukermaa"), so matching needs its own word list.

### Others

| Source                                                                                           | Licence                                                                       | Finnish                                                  | Diet or group information                 |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| [Wikidata](https://www.wikidata.org/wiki/Wikidata:Licensing)                                     | CC0                                                                           | Labels on 890 of the 1,246 items OFF ingredients link to | No systematic vegan or vegetarian marking |
| [FoodOn](https://github.com/FoodOntology/foodon)                                                 | CC BY 4.0 (repository metadata)                                               | None (0 of 83,534 labels)                                | Has classes such as "vegan diet"          |
| [USDA FoodData Central](https://fdc.nal.usda.gov/)                                               | CC0                                                                           | None                                                     | Food categories, English only             |
| [Livsmedelsverket](https://www.livsmedelsverket.se/en/about-us/open-data/food-composition-data/) | CC BY 4.0                                                                     | None (Swedish and English)                               | LanguaL and FoodEx2 codes per food        |
| OFF `categories.txt` and `food_groups.txt`                                                       | As OFF, unverified                                                            | 1,844 of 14,751 categories; no Finnish food-group names  | Product categories, not ingredients       |
| [YSO (Finto)](https://finto.fi/yso/)                                                             | CC BY 4.0                                                                     | Yes, but only 202 food concepts                          | None                                      |
| EFSA FoodEx2                                                                                     | **Unverified**                                                                | **Unverified**                                           | Hierarchical classification with facets   |
| LanguaL                                                                                          | **Unverified** (search snippets only)                                         | **Unverified**                                           | Faceted food description                  |
| CIQUAL                                                                                           | **Unverified**; data.gouv.fr lists the 2020 release under the Licence Ouverte | None (French and English)                                | French food composition                   |

Wikidata does have Finnish labels where OFF lacks them, such as
"maapähkinävoi" (Q147651).

## 5. Deterministic approaches

### 5.1 Dish type from the title

**Tested:** a script took each title's head word and looked it up in a list
of dish words. For Finnish it removed site suffixes ("– katso ohje! |
Maku"), dates, "X:n kera" phrases and trailing words in local cases
("airfryerissa", "grillistä"), then took the last part of the last word
("Inkivääri-kanakeitto" → "kanakeitto") and matched its ending
("kanakeitto" → keitto), preferring the longest match. For English it cut
the title at " with ", " in ", " on ", " for " and " made " and took the
last word, or the last two for names such as "ice cream". The list of 81
Finnish and 152 English dish words was written while reading these
same titles, so the coverage below is an upper bound for new recipes. The
held-out sample would measure it fairly.

| Head word                      | Finnish (223) | English (411) |
| ------------------------------ | ------------- | ------------- |
| A dish word                    | 179 (80%)     | 320 (78%)     |
| A main ingredient or cut       | 28            | 65            |
| Neither, or the script misread | 16            | 26            |

- The vocabulary has a long tail. The Finnish matches use 80 dish words,
  52 of them only once; the English use 149, 96 of them once. The most
  common: kakku 17, keitto 11, piirakka 11, salaatti 9, leipä 8; cake 26,
  salad 18, bread 18, pie 13, casserole 11.
- **Compound endings mislead.** "Banaanipannukakut" ends in "kakut" but is
  pancakes, and "Dippilihapullat" ends in "pullat" (buns) but is
  meatballs; longest-match lists need "pannukakku" and "lihapullat" as
  entries. "Marmorileivät" and "Jäätelöleipä" end in "leipä" without
  being bread. "Kesärullakulhot" is a bowl of summer rolls.
- **Dish type isn't course.** "Vegaaninen voileipäkakku" (sandwich cake),
  "Siikamousse" (whitefish mousse), "Feta-tomaatti-tonnikala
  pannukakkukääretorttu" and "Cheesy spinach rice cakes" are savoury,
  though cake, mousse and roll suggest dessert. "Pizza Crust", "Chocolate
  Ermine Frosting" and "Munkkitaikina" are components.
- **Finnish endings collide with case endings.** The first version of the
  script dropped "sienipasta" and "sipulipasta" because "-sta" is also the
  elative ending.
- **Titles without a dish word** are named dishes ("Gujiya", "Kubaneh",
  "Boulevardier"), fanciful names ("Funny faces", "Venice dusk",
  "Kesäunelma"), and kotikokki.net's "Uusi resepti 11.3.2026" and "Kana
  Heston 30.6.2025". Some are the script's errors: "Jack in the box birthday
  cake" was cut at " in ", and "Pienet sitruunajuustokakut sous vide
  -tekniikalla" lost its head word.
- **Main ingredient** is usually the first part of a compound or the first
  words: "Kylmäsavulohipiirakka", "Inkivääri-kanakeitto", "Ginger Carrot
  Cake". It fails on "Easy Turkey Brownies" (turkey-shaped brownies) and
  "Tomato Soup Spice Cake".

**How to test:** a ledger per title, like the existing word ledgers: the
title, the head word and the dish type read, each marked checked or wrong.
The dish-type values the sites themselves publish (`recipeCategory`,
`keywords`) are a partial answer key: 330 corpus recipes have a non-empty
`recipeCategory`. The held-out titles would give the error rate on unseen
text.

### 5.2 Other signals in the title

Counted on the same 634 titles with simple patterns:

- **Cuisine.** Finnish place adjectives end in "-lainen" or "-läinen".
  The pattern found 17 titles, of which 12 are cuisines ("Nepalilainen
  broilerikastike", "Aasialainen pihvisalaatti") and 5 are other
  adjectives: "suolainen", "Suklainen", "täyteläinen",
  "Pähkinäsuklainen" and "Mökkiläisen" (a cottager's). An English list of
  30 cuisine words matched 35 titles, with false readings in "Crisp Belgian
  endive", "French Toast Bake", "Air-Fryer French Fries" and "French Dip
  Sandwiches". "Brussels Sprouts" and "Jerusalem Artichokes" would need
  the same care.
- **Season and occasion.** 12 Finnish titles matched words such as
  "joulu", "kesä", "kevät" and "vappu". Four are not seasons: "kesäkurpitsa"
  (courgette) twice, "Kevätsipulipiirakka" (spring onion) and "Vappu
  Pimiän täyteläinen kasviskeitto", where Vappu Pimiä is a person. In
  English, "Middle Eastern" matched "Easter" when the pattern lacked word
  boundaries, and "Birthday Cake Ice Cream" is a flavour.
- **Quick or easy.** 4 Finnish titles ("Nopea tortillalasagne", "Helppo
  kaali-pastagratiini") and 13 English ("Easy", "Simple"). In
  "Kesäkurpitsapasta nopean tomaattikastikken kera" the quick part is the
  sauce.
- **Method and equipment.** 22 Finnish and 65 English titles name one:
  "airfryerissa", "mikrossa", "grillistä", "Slow-Cooker", "Sheet-Pan",
  "No-Knead".
- **Diet.** 12 Finnish titles ("Gluteeniton", "Vegaaninen", "Vegepinsa",
  "Kasvis-bouillabaisse"), though "kasvis" in "Thai-kasviskeitto" names
  vegetables rather than a diet, and two are "protein". 14 English
  ("gluten-free" on 9), with false readings such as "Lighter Than Air
  Parmesan Puffs".

### 5.3 Diet from the ingredient lines

**Tested:** whether a rule can rule out "vegetarian" from the 325 recipes
with full ingredient lists. The word list was every Open Food Facts entry
whose inherited vegetarian value is "no", in Finnish and English. Two
matching methods were compared:

- **whole words:** a line word matches a name when they share a word key
  from the app's `wordKeys`, so "naudan" matches "nauta";
- **substrings:** the name appears anywhere in the line.

To score them, recipes containing meat, fish, shellfish, meat stock or
gelatine were marked by reading the lines of every recipe whose title or
lines suggested it. Alternatives were not counted ("soija- tai
osterikastiketta"). A misjudged recipe would shift the numbers slightly.

| Method                         | Finnish: found | Finnish: wrong flags | English: found | English: wrong flags |
| ------------------------------ | -------------- | -------------------- | -------------- | -------------------- |
| Whole words                    | 38 of 64       | 1                    | 56 of 60       | 24                   |
| Whole words, without "whiting" | —              | —                    | 55 of 60       | 0                    |
| Substrings                     | 53 of 64       | 45                   | 55 of 60       | 9                    |

- **Stemming collision.** The English stemmer turns "whiting" (a fish)
  into "white", so "egg whites", "white sugar" and "white wine" read as
  fish on 24 recipes. One dictionary entry caused every English wrong flag.
- **The one Finnish wrong flag** is "1 pkt Härkistä (250g)" in
  "Härkispyörykät": Härkis is a broad-bean product, and its word key
  matches "härkä", a beef synonym in the taxonomy.
- **Substring traps:** "kana" in "porkkana" and "kananmuna" (40 recipes),
  "luu" (bone) in "luumu", "etana" (snail) in "smetanaa", "osteri" in
  "osterivinokkaita" (oyster mushrooms), "ham" in "graham" and
  "Champagne", "ling" in "sparkling".
- **What whole words miss in Finnish (26 recipes):** compounds and forms
  the taxonomy lacks: "naudanjauhelihaa", "kinkkusuikaleita",
  "pekonisiivuja", "broilerinakkeja", "kananfileesuikaleita",
  "silakkafileetä", "1 kg silakoita", "200 g kylmäsavulohta",
  "grillimakkaraa", "porsaan ulko-tai sisäfileetä", "400 g bratwurstia",
  "Lihaliemikuutiota", "liivatelehteä" (4 desserts) and "1 flank steak".
  "4 välikyljystä" names a beef cut with no meat word at all.
- **What whole words miss in English (5):** "baby back ribs", "1 lamb
  shank", "2 thick sirloin steaks", "homemade pastrami" and "8 lamb loin
  chops". "250g/9oz plant-based mince" is correctly not flagged, and would
  catch a rule that treats "mince" as meat.
- **Site labels disagree with ingredients.** soppa365.fi files
  "Sienipiirakka" under "Kasvis", but its lines include "150–170 g
  pekonisiivuja". Its "Tofu-kasvisvokki", also "Kasvis", offers "soija- tai
  osterikastiketta". Whether soppa365.fi's "Kasvis" means vegetarian or
  vegetable dishes is not stated in the data.
- **Against site labels:** 36 Finnish recipes carry a site's vegetarian
  label. Whole words flagged one of them (Härkis, wrongly). Substrings
  flagged 20: "Sienipiirakka" correctly, "Tofu-kasvisvokki" for its
  oyster-sauce alternative, and the rest wrongly.

**Gluten.** The same test for gluten used the ingredients taxonomy's
allergen values plus the Finnish and English gluten synonyms in
`allergens.txt`:

- English: 61 recipes have a flour line, and only 7 were flagged. Neither
  list makes plain "flour" a gluten source, so "2 cups (240g) King Arthur
  Unbleached All-Purpose Flour", "85g plain flour" and "450g self-raising
  flour" pass. 54 English flour lines go unflagged.
- Negation: all four English flags on recipes the site labels gluten-free
  come from the word "gluten" in lines such as "2 cups (240g) King Arthur
  Gluten-Free Measure for Measure Flour". In Finnish, "5 dl gluteenitonta
  jauhoseosta" has the same problem for substring matching.
- Finnish: 39 of 52 recipes with a "jauho" line were flagged. Missed:
  "korppujauhoja" (7 lines) and "pankojauhoja" (2), breadcrumbs that
  usually contain wheat.
- Stock cubes, soy sauce and ready-made products ("kakkupohja, valmis")
  may or may not contain gluten. No word list can tell; only the package
  can.

**Prior art on wording and safety:**

- Edamam's health labels are defined by exclusion: Vegetarian "No meat,
  poultry, or fish", Gluten-Free "No ingredients containing gluten",
  Kosher "does not guarantee kosher preparation of the ingredients
  themselves" ([docs](https://developer.edamam.com/edamam-docs-recipe-api)).
- Spoonacular: "we automatically determine that a recipe with
  Worcestershire sauce isn't vegetarian (we're looking at you,
  anchovies.)", and "We do not have any medical training and thus cannot
  support the use of the API for medical use cases"
  ([docs](https://spoonacular.com/food-api/docs),
  [FAQ](https://spoonacular.com/food-api/faq)). Open Food Facts gives
  Worcestershire sauce vegetarian "maybe".
- Yummly (offline since December 2024) matched every word of a search
  against "A word in the title", "An ingredient", "An assigned cuisine,
  course, or holiday" or "A diet or allergy for which the recipe would be
  acceptable", with an ingredient hierarchy so that excluding fruit
  excluded apples
  ([archived docs, 2018](https://web.archive.org/web/20181009182142id_/https://developer.yummly.com/documentation)).

**How to test:** a ledger of each recipe's diet readings, with the matched
words shown, so a person can mark each ✓ or ✗. Site diet labels (valio.fi
"kasvis (lakto-ovo)", yhteishyva.fi "Kasvisruoka", kingarthurbaking.com
"Vegan") are a cross-check, not an answer key, given "Sienipiirakka".

### 5.4 Times

The corpus has no times, so the 46 sampled pages were read:

- 37 publish a usable `totalTime`. arla.fi writes "PT00M" for missing
  times, for all three on 3 of its 5 pages; kotikokki.net writes empty
  strings. Formats vary:
  "PT20M", "PT0H30M", "PT05H00M", "P0DT0H20M", "PT195M" and a bare "PT".
- On 7 of the 37, prep plus cook is 30 minutes or less while the published
  total is longer: five bettycrocker.com pages have no `cookTime` (prep 15
  minutes, total 6 hours 25 on one), and two kingarthurbaking.com pages
  give cook "PT0M" with totals of 1 hour and 1 hour 15. Totals include
  rising, chilling and standing. On 2 more, arla.fi gives "PT00M" for both
  with totals of 40 and 75 minutes.
- DESIGN.md's "Quick lunch" row uses prep plus cook, and a recipe stores
  prep and cook times but no total.
- Time bands seen: bbcgoodfood.com keywords "10-30 minutes", "30-60
  minutes", "Over an hour"; soppa365.fi "30 minuuttia" (12); Norish's chips
  under 15, 30, 60 and 120 minutes.

**How to test:** a table of published prep, cook and total per page, and
the band each reading falls in.

### 5.5 Mapping site terms onto a fixed vocabulary

- Norish maps category and keywords onto four meal categories with an alias
  table (`supper` → Dinner, `dessert` → Snack). Tandoor renames by exact
  alias, usually created while merging. Mealie's fuzzy match needs a score
  of 90.
- The corpus shows what an alias table would need: singular and plural
  ("Dessert", "Desserts"), Finnish spellings of one word ("Jälkiruoat",
  "jälkiruoat", "Jälkiruuat", "Jälkiruoka"), mixed facets in one field
  (soppa365.fi), cuisine as adjective, noun or region, and noise to drop
  (authors, nutrients, bettycrocker.com's fragments, arla.fi's titles as
  keywords).
- The app's existing duplicate check already matches "Jälkiruuat" with
  "jälkiruoka" (DESIGN.md, "Tags"), so it could match site terms against a
  vocabulary as well as against tags.
- Site terms cover only imported recipes. Typed and photographed recipes
  have none.

**How to test:** each distinct site term in `tests/corpus/tags/` (1,137 tags, 535
Finnish, per the Voikko investigation) with the vocabulary entry it maps to
or "dropped", in a ledger.

## 6. Search interface prior art

- **Facets cost metadata.** NN/g: "both existing and future content must
  have metadata applied for each facet", and "A simple filter can often be
  easier to understand and faster to use"
  ([Filters vs. Facets](https://www.nngroup.com/articles/filters-vs-facets/)).
  Its example is Epicurious's Cuisine, Main Ingredient and Dietary
  Consideration.
- **Suggestions are used less than people think.** NN/g: "suggested queries
  were selected by users in only 23% of the instances where they were
  offered" (31 of 136), and "Suggested terms that return zero results, or
  irrelevant results, are worse than unhelpful"
  ([Site search suggestions](https://www.nngroup.com/articles/site-search-suggestions/)).
- **Thematic filters get used.** Baymard, on e-commerce: "thematic filters
  saw very high utilization rates (above 50%)", with season as an example,
  and they "will typically have to be tailored uniquely to a site's product
  catalog" ([Macy's](https://baymard.com/blog/macys-filtering-experience)).
  On mobile "typically only 2 or 3 will fit on one line"
  ([promoting filters](https://baymard.com/blog/promoting-product-filters)).
  No Baymard research on recipe sites was found.
- **Chips that follow the query.** Google Search: "if you're searching for
  "dinner ideas," you might see topics like "healthy" or "easy." Tapping on
  a topic adds it to your query", and topics change as you tap
  ([Google, 2022](https://blog.google/products-and-platforms/products/search/refine-search-results/)).
- **Chips from a personal collection.** Spotify's Liked Songs shows "up to
  15 personalized mood and genre categories" for listeners with at least
  30 tracks, and they "update based on the content of your collection"
  ([Spotify, 2021](https://newsroom.spotify.com/2021-02-25/how-to-sort-your-favorite-songs-with-spotifys-new-genre-and-mood-filters/)).
  This is the closest analogy found to chips derived from a household's
  own recipes.
- **Search tokens.** Apple's guidelines: "A token is a visual
  representation of a search term that someone can select and edit, and
  acts as a filter for any additional terms in the search", and "Consider
  pairing tokens with search suggestions. People may not know which tokens
  are available"
  ([Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields)).
- **Chip types.** Material: "Is its content generated by the product
  (suggestion chip), or by the person using the product (input chip)?",
  and "Filter chips use tags or descriptive words to filter content"
  ([Chip.md](https://github.com/material-components/material-components-android/blob/66b0eeb53afeb6025ffbbd37734b08e5bce197ed/docs/components/Chip.md)).
- **Derived categories in photo apps.** Apple Photos suggests "dates,
  locations, and people you've named" and searches by "Category (beach or
  sunset, for example)"
  ([Apple](https://support.apple.com/guide/iphone/search-for-photos-and-videos-iph392d77d5f/ios)).
- **NYT Cooking:** "Recommendations will surface in the search bar as you
  type" ([help centre](https://thenewyorktimeshelpcenter.helpjuice.com/19686556670868-Cooking-Recipe-Features)).
  Its filter list was not checked: robots.txt disallows `/search` and
  Claude's crawlers.
- **What people ask for.** Of 119 recipe requests posted to Google Answers,
  56% named a dish, 54% an ingredient, 29% a type of dish, course or meal,
  24% a cuisine or region, 13% a diet, 13% a technique, 10% difficulty,
  5% an occasion and 3% cost
  ([Cunningham and Bainbridge, 2013](https://researchcommons.waikato.ac.nz/server/api/core/bitstreams/d5b33bc8-bc87-433e-b136-78f63df83d3a/content)).
  These are questions to an expert service, not search-box queries. No
  study giving the share of searches per facet on a recipe site was found.
- **When people look for what.** Recipe views have yearly and weekly cycles
  ([West, White and Horvitz](https://arxiv.org/pdf/1304.3742)), and on
  ichkoche.at "fish is mainly requested on Thursday and Friday"
  ([Wagner, Singer and Strohmaier, 2014](https://archives.iw3c2.org/www2014/proceedings/companion/p553.pdf)).

## 7. Candidate approaches and trade-offs

These are options, not recommendations. Several can be combined.

### Where derived terms appear

| Option                                                                                   | For                                                        | Against                                                                                                 |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Search only: derived words are indexed, so typing "keitto" or "kasvis" finds the recipes | Nothing new on screen; a wrong reading is barely visible   | Nobody knows which words work; Apple's guidelines note people "may not know which tokens are available" |
| Suggestion chips by the search box, only for terms the library has                       | Shows what can be searched; like Spotify's derived filters | NN/g saw suggestions chosen in 23% of offers; every chip must have results                              |
| Category rows on the home screen fed by derived terms instead of tags                    | Reuses the planned rows; nobody has to tag                 | Needs about four recipes per term; changes DESIGN.md's "Category rows show recipes by tag"              |

### Which vocabulary

- **A fixed list per kind** (dish type, course, diet, time band, season or
  occasion, cuisine, main ingredient), in Finnish and English. It is
  consistent, translatable and testable. But the dish-type tail is long:
  52 of the 80 Finnish dish words in the corpus titles occur once. Named
  dishes ("Gujiya", "Kubaneh") need their own entries.
- **The title's own head word**, with no list ("kanakeitto" gives "keitto").
  There is no list to keep, but Finnish needs the case-ending and compound
  rules from section 5.1, and heads such as "silakat" or "Heston" come out
  as terms.
- **Mixed:** fixed lists for diet, time and course, where wrong terms
  matter more, and the open head word for dish type.

### Diet

- **Rule out only.** "Contains meat or fish" is shown, or such recipes are
  left out of a "kasvis" search, and nothing is claimed. This is safest as
  wording. But as a filter, "not ruled out" acts as a claim: with the
  Open Food Facts word list and whole-word matching, 26 of 64 Finnish
  recipes with meat, fish or gelatine would pass, including
  "Spagettivuoka" with "400 g jauhelihaa". The rule-out list would need
  many more words before such a filter is reliable.
- **Claim only with every line known**, as Open Food Facts does: a single
  unknown line makes the status unknown. Few recipes would qualify until
  almost every ingredient word is recognised.
- **Use the site's label when there is one**, and drop it if the
  ingredients contradict it ("Sienipiirakka" with bacon). This helps only
  imported recipes from sites that label (valio.fi, yhteishyva.fi,
  kingarthurbaking.com, bbcgoodfood.com), and the sites' meanings differ.
- **Gluten and other allergens** need negation ("gluten-free flour"),
  English "flour" treated as wheat, and product knowledge no word list has
  (stock cubes, soy sauce). Leaving them out is also an option; "laktoositon"
  depends on the product bought and can't be read from words.

### Word lists for ingredients

| Option                            | For                                                   | Against                                                                                    |
| --------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Our own list, tuned on the corpus | Fits recipe Finnish ("silakoita", "kinkkusuikaleita") | Work to build and keep; the same risk of overfitting as the parser                         |
| Open Food Facts names             | 2,150 Finnish entries with inherited diet values      | Licence of the files unverified; gaps ("liivate", "jauheliha"); noise ("härkä", "whiting") |
| Wikidata labels                   | CC0; fills some gaps ("maapähkinävoi")                | No diet values; another source to merge                                                    |
| Fineli classes                    | CC BY 4.0; official Finnish food classes              | Names describe foods as eaten; site blocked automated download                             |

Any of them would need compound handling for Finnish: whole-word matching
found 59% of the meat recipes, substrings 83% with 45 wrong flags.

### Site categories and keywords on import

- **Ignore them** for derived terms, as KitchenOwl does. Typed, imported and
  photographed recipes are then treated alike.
- **Map them onto the fixed vocabulary** with an alias table, as Norish does
  for its four categories. Imports gain season and occasion terms that
  titles rarely carry ("talvi" 14 and "joulu" 2 on valio.fi). Typed
  recipes won't have them.
- **Offer them as household tags**, as DESIGN.md plans now. The apps that do
  this most (Mealie, Nextcloud Cookbook, Tandoor) have clutter complaints,
  and the new direction keeps tags for household groupings.

### Times

- Keep prep plus cook, as now. Seven of 37 sampled pages would look quicker
  than their published total.
- Also store the published total when there is one. That needs a field the
  data model doesn't have.
- Show time as bands (under 15, 30 or 60 minutes), as Norish and
  bbcgoodfood.com do.

### Household groupings

- Free-form tags stay as designed. A derived term and a tag could collide
  ("keitot" as a tag next to a derived "keitto"); the existing duplicate
  check could flag that.
- Derived terms and tags could share one list of chips, or derived terms
  could look different, so a household can tell its own groupings from the
  app's readings.

## 8. Open questions

1. Where should derived terms appear: in search only, as chips by the
   search box, as home rows, or a mix?
2. Which kinds come first? Every readable site filters by dish type or
   course and by diet, most by main ingredient and occasion, and two by
   time. In the one study found, requests named a dish (56%), an
   ingredient (54%) or a type of dish or course (29%) most often.
3. For diet, is "no meat found" acceptable behind a "kasvis" chip, knowing
   the misses, or should the app only ever say "contains meat"?
4. Does "kasvis" mean lacto-ovo vegetarian, as on valio.fi? Are vegan,
   gluten-free, dairy-free, lactose-free and egg-free in scope, given that
   some depend on the products bought?
5. Should site categories and keywords be ignored, mapped onto the app's
   vocabulary, or still offered as household tags?
6. Season and occasion: titles rarely carry them, and the words mislead
   ("kesäkurpitsa", "Vappu Pimiän"). Should they come only from site data,
   from a list of dish names ("joulutorttu", "glögi"), or be left to
   household tags?
7. Should the app store a recipe's published total time as well as prep and
   cook?
8. Can a person correct a derived term on one recipe ("Siikamousse" isn't
   a dessert)? DESIGN.md says "Nothing is applied without someone seeing
   it"; does that cover derived terms?
9. Which word lists may the app use? Open Food Facts needs its taxonomy
   licence confirmed first.
10. Main ingredient: from the title, from the ingredient lines, or not at
    all, since search already covers ingredients?
11. Should derived terms and household tags look the same?
12. Should derived terms get their own held-out sample, as the parser has,
    before their error rate is quoted?
13. DESIGN.md's "Tags" and "Finding recipes" sections still describe
    manual tags, category rows by tag and tag offers on import. Which of
    these change with the new direction?

## Reproduction

The scripts and data below were in `/tmp/research/` during the research
and were not kept. The list records how the numbers were produced;
re-running them means redoing the work.

- `scripts/diet_sample.py` fetched the 46 recipe pages (saved in
  `diet/pages/`, robots files in `diet/`); `scripts/times.py` reads their
  times.
- `scripts/inventory.py`, `fields.py`, `titles.py`, `title_signals.py`,
  `heads.py` and `dish.py` count the corpus fields and title signals.
- `pilot/pilot.ts`, `score.ts` and `gluten.ts` run the diet checks.
  `pilot/truth-fi.json` and `truth-en.json` list the recipes marked as
  containing meat, fish or gelatine. `pilot/crosscheck.ts` compares the
  corpus with the sites' filters. Run the TypeScript files from
  `/tmp/research/pilot/` with:

  ```sh
  bun --tsconfig-override /home/pavel/Documents/projects/recipes/tsconfig.json score.ts fi
  ```

- `data/` holds the downloaded Open Food Facts taxonomies (commit
  `23db7994`), the Fineli Release 18.0 mirror and the other datasets, with
  `data/MANIFEST.tsv` giving each file's source and SHA-256.
- `sites/facets-<site>.json` holds every filter value, built from the raw
  pages in `sites/raw/` (request log `sites/raw/requests.log`).
- App repositories were read at: Mealie `cb59fad8`, Tandoor `fe0aaaf5`,
  RecipeSage `beda3014`, Norish `c79a86b3`, KitchenOwl `cac641c6`, Grocy
  `41206cb9`, Nextcloud Cookbook `d183b35c`, Recipya `0df0ee29`,
  recipe-scrapers 15.12.0.
