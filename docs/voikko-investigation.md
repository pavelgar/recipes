# Voikko investigation

Evaluated on 23 October 2026 against the development corpus only. The
held-out corpus and its ledgers were not used. This is an evaluation, not
a change to the application's word matching or dependencies.

Voikko with a Snowball fallback can reduce our Finnish linguistic code and
substantially improve the known false matches. Its dictionary misses
several food words, and browser use adds assets and an initialization
lifecycle.

Decision (24 October 2026): Voikko is ruled out, and the current word
keys stay. The decision was first deferred to the M1 offline prototype, so
that Voikko's asset and start-up cost could be weighed alongside the
service worker and offline caching. That assessment is in
[With the offline prototype](#with-the-offline-prototype).

Later the same day, the Finnish keys changed: a key keeps the group of the
vowel it drops (a and o, ä and ö, e and i), and one-letter endings are cut
only after a vowel. The figures below for the current rules describe the
keys as evaluated. The changed keys pass 218 of 221 groups, also missing
`koti` / `kotona`, and remove eight of the nine wrong word pairs; `kukkia`
/ `kukkoa` remains. English words moved to wink-porter2-stemmer, so
`@orama/stemmers` is no longer installed; a Snowball fallback would add it
back.

## What was tested

- Upstream libvoikko 4.3.3, built locally from commit
  `ad9d89ef20680cbdb572894bd3e40b84573666f2`, with the Finnish VFST backend.
- The separate Rust/WebAssembly rewrite, `@yongsk0066/voikko@0.4.0`.
  This was the npm registry's latest version at evaluation time. It is
  not a JavaScript binding maintained by upstream Voikko.
- The npm package's bundled standard dictionary: SM-Version 2.6, built
  21 February 2026. Its `mor.vfst` SHA-256 is
  `95b816605ca670e813cff20c9bc9767b4a52928ab662d6336373cd387a51446a`.
- Upstream's expanded morphology dictionary snapshot, built 18 June 2024,
  as a separate comparison. It is older than the npm dictionary, so the
  comparison also changes dictionary age, not just vocabulary selection.

Using the same standard dictionary, upstream C++ and the Rust/WASM port
returned the same sets of base forms for all 2,058 evaluation inputs.
This checks the behavior used here; it does not establish equivalence for
Voikko's other functionality or for arbitrary text.

The inputs cover 1,584 distinct Finnish words from development recipe
titles and ingredients, the 221 Finnish answer-key groups, and words and
joined spellings from the 535 Finnish tags. There are 1,137 tags overall.
English matching was left as implemented. Tag comparisons retained the
production rules for recipe languages, spacing and punctuation.

## Matching results

A word group passes when every form matches every other form. These are
whole-word checks, without the search interface's unfinished-word prefix
matching.

- **Current rules: 219 of 221 groups.** The misses are `maku` / `maun` and
  `muu` / `muita`.
- **Voikko alone: 208 of 221.** A word receives its original spelling and
  all base forms returned by the analyzer; unknown words match only their
  exact spelling. Voikko fixes both current misses but loses 13 other
  groups.
- **Voikko with Snowball for unknown words: 218 of 221.** This could remove
  `finnish.ts` and use the already installed Finnish stemmer from
  `@orama/stemmers`. The remaining misses are `karamellisoidut` /
  `karamellisoitua`, `sinappinen` / `sinappista`, and `koti` / `kotona`.
- **Voikko with our rules for unknown words: 220 of 221.** Only `koti` /
  `kotona` remains. This improves recall but keeps the handwritten rules
  whose removal motivated the investigation.

Unknown-word fallbacks retain the original spelling as well as their
generated keys, so exact spellings remain available regardless of
dictionary coverage.

The standard dictionary does not analyze 227 of the 1,584 Finnish corpus
words. Many are brands, abbreviations, foreign words or typos, but useful
recipe words are missing too: `balsamico`, `curd`, `kvinoa`, `sriracha`,
`digestivekeksejä` and `hoisinkastiketta`. A fallback is therefore useful
even with a full dictionary. For `kotona`, Voikko returns `koto`, while
`koti` returns `koti`; matching them needs a search-specific alias or other
policy beyond collecting dictionary base forms.

The expanded morphology snapshot reaches 209 groups alone, 218 with
Snowball fallback and 220 with our fallback. It does not remove the
fallback requirement. It also adds a collision between the `muna` and
`musta` groups, so a broader dictionary is not automatically better for
these searches.

## False matches and tags

All three standard-dictionary Voikko strategies remove the nine Finnish
word-pair collisions already marked wrong in the word ledger. Examples
include `jauhetta` / `jauhoja`, `makea` / `maku`, and `siivet` / `siivua`.
The total number of pairs across different answer-key groups or ungrouped
words falls from 21 with current rules to seven with Voikko, eight with
our unknown-word fallback, and nine with Snowball fallback.

These counts are not precision scores: several pairs are useful matches,
and new ones still need review. Voikko introduces six new pairs, including
`karkeaa` / `karkeasti`, `miedomman` / `mietoa` and `kukkia` / `kukkimaan`.
The last illustrates ambiguity: `kukkia` can mean flowers or the verb
"to bloom". Collecting all analyses cannot disambiguate an ingredient's
meaning. Snowball fallback additionally brings `ps` and `pss` together.

Every expected duplicate pair in the 27 Finnish tag answer-key groups
still matches under all three strategies. All also remove the current
wrong tag flag `munata` / `munaton`. Other flags change: `helposti` starts
matching `helppo` and `helppoa`, while `suola` stops matching `suolata`.
The checked word and tag ledgers were not changed or accepted.

## Browser, build and offline checks

The Rust/WASM package works in Node 24.18.0 and in a standalone browser
page with self-hosted assets. An isolated production build with the
project's installed Vite 8.3.5 also ran successfully in the browser.
Vite emitted browser-externalization warnings for the package's dynamic
Node imports; those paths were not executed in the main browser thread.

The unbundled wrapper, generated JavaScript glue, WASM and dictionary files
total **4,261,023 bytes**, or **1,739,063 bytes with gzip level 9**. The
dictionary accounts for most of this. The WASM runtime had a 9,240,576-byte
linear memory buffer after the evaluation. These are measured artifacts,
not an estimate of the final application bundle or total browser memory.

In one local desktop browser run, initialization including local asset
fetches took about 34 ms, and analyzing all 2,058 distinct inputs took
67 ms. Computing our current keys for those inputs took 10 ms. These
single-machine timings do not predict mobile or remote-download latency.
An adoption should cache analyses by word instead of analyzing repeated
ingredient words on every query or render.

A temporary service worker cached the page, modules, WASM and dictionary.
After stopping the local HTTP server, navigating to the page again
successfully initialized Voikko and analyzed all inputs from cached assets.
The worker and its cache were removed afterward. This demonstrates offline
feasibility; the application itself still needs its planned offline setup.
The package defaults to fetching from a CDN, so production integration
must explicitly use local asset URLs and include them in the offline cache.

The published package fails in a module Web Worker. Its environment check
interprets the absence of `window` and `document` as Node, then tries to
import `node:fs/promises`. The observed error was:

```text
WasmLoadError: Failed to load WASM module: Failed to fetch dynamically imported module: node:fs/promises
```

This is a problem with the third-party wrapper, not evidence of a failure
in upstream Voikko. Worker support would require fixing or replacing that
loader. Upstream also supplies an Emscripten build and JavaScript interface,
but adopting it means maintaining the browser build and dictionary assets.

## With the offline prototype

Assessed on 24 October 2026, once the app had its service worker. The
matching results above did not change.

**Download.** The service worker caches the app's built files when it
installs: 12 files, 899,948 bytes, or 391,618 bytes with gzip level 9
(the fonts are already compressed). Voikko's files would add 4,261,023
bytes, or 1,739,063 with gzip, so a device would download about 4.4 times
as much before the app works offline. Nitro serves static files
uncompressed unless a proxy in front compresses them, so without one the
whole 4.3 MB would travel. Only Finnish recipes need the dictionary, so it
could be cached the first time a Finnish recipe is searched instead, at
the cost of one more thing that has to be fetched before search works
offline.

**Start-up.** The same browser harness as above, timed in Chrome 156 with
the CPU slowed through the DevTools protocol, median of five runs:

| CPU slowdown | Voikko import | Voikko init | Analyse 2,058 inputs | Current keys |
| ------------ | ------------: | ----------: | -------------------: | -----------: |
| none         |          5 ms |       25 ms |                58 ms |         5 ms |
| 4×           |         12 ms |       79 ms |               195 ms |        18 ms |
| 6×           |         19 ms |      113 ms |               303 ms |        26 ms |

A slowed desktop CPU only approximates a phone, and WebAssembly may not
slow down in the same proportion. Search builds its index in the browser,
so Finnish recipes can't be indexed until Voikko has started. The wrapper
fails in Web Workers (see above), so that work runs on the main thread,
where it would hold up the page unless it were split up or the analyses
were cached by word.

**Conclusion.** Voikko with a Snowball fallback matches as many answer-key
groups as the current keys (218 of 221). It also separates `kukkia` /
`kukkoa`, the one known wrong pair the current keys keep. For that it costs
about 4.4 times the offline download and about sixteen times the start-up
work (416 ms against 26 ms at 6×). Voikko is ruled out.

## Implications for this feature

Voikko would replace the implementation behind `wordKeys`, while keeping
MiniSearch and our language and tag policies. Original word tokens would
still be needed for prefix search: an unfinished query usually cannot be
looked up as a complete dictionary word.

Of the options tested, Voikko plus Snowball was the most promising had
removing our Finnish rules been the priority. It trades the current code
for dictionary assets, asynchronous startup, fallback selection and a few
remaining matching gaps. Adding Voikko while retaining our rules improves
the development results but increases the amount we maintain.

No runtime dependency, parser rule, search behavior or corpus ledger was
changed by this investigation. This report and the decision in
`DESIGN.md` are documentation only.
The temporary benchmark scripts, detailed JSON results and browser
prototype are in `/tmp/recipes-voikko-investigation/` for this session.

## Sources and reproduction details

- [Upstream Voikko](https://voikko.puimula.org/)
- [Upstream releases](https://voikko.puimula.org/releases.html)
- [Upstream morphological-analysis attributes](https://github.com/voikko/corevoikko/blob/ad9d89ef20680cbdb572894bd3e40b84573666f2/libvoikko/doc/morphological-analysis.txt)
- [Upstream JavaScript build](https://github.com/voikko/corevoikko/blob/ad9d89ef20680cbdb572894bd3e40b84573666f2/libvoikko/js/build.sh)
- [Rust/WASM rewrite and npm wrapper](https://github.com/yongsk0066/corevoikko)
- [Published package](https://www.npmjs.com/package/@yongsk0066/voikko)
- [Expanded dictionary snapshot](https://www.puimula.org/htp/testing/voikko-snapshot-v5/)

The benchmark reads JSON from `corpus/ingredients/`, `corpus/rare-units/`,
`corpus/rare-forms/` and `corpus/tags/`, and uses the current word and tag
answer keys. It reproduces the production tag comparator's baseline
results before comparing alternative keys. The native comparison uses the
same input list and dictionary as the WASM run.

For the temporary files created during this evaluation:

```sh
bun --tsconfig-override tsconfig.json /tmp/recipes-voikko-investigation/benchmark.ts
node /tmp/recipes-voikko-investigation/benchmark.mjs
```

`benchmark.mjs` is the Bun-built Node bundle of the same benchmark. The
expanded dictionary comparison sets `VOIKKO_VARIANT=morpho` and
`VOIKKO_DICTIONARY_PATH=/tmp/recipes-voikko-investigation/morpho-dict/5/mor-morpho`.
`results.json` contains the standard-dictionary results;
`morpho-results.json` contains the expanded-dictionary results.
