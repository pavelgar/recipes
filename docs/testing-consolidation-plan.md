# Testing consolidation plan

Plan from main at `071b878`, after [PR #10](https://github.com/pavelgar/recipes/pull/10). The first follow-up is implemented on `consolidate-quantity-tests`; the corpus-input audit remains a following PR.

The goal is to reduce the amount of recorded output that needs reviewing when code changes, while preserving meaningful checks of the recipe rules in [DESIGN.md](../DESIGN.md). Line count is a measure of the reduction, not a coverage target.

## What the merged baseline contains

The three development quantity ledgers contained 22,523 Git diff lines and 10,163 entries:

- `src/lib/quantities/__ledger__/ingredients.txt`: 9,326 lines; 4,115 unchecked entries, 518 checked right and 3 checked wrong.
- `src/lib/quantities/__ledger__/steps.txt`: 1,769 lines; 696 unchecked entries, 195 checked right and 1 checked wrong.
- `src/lib/quantities/__ledger__/presented.txt`: 11,428 lines; 4,564 unchecked entries, 70 checked right and 1 checked wrong.

Together, 9,375 entries are unchecked and 788 have been judged. Most of the size and ongoing review burden is here.

The word-merge, tag-pair and new importer-page ledgers together have only 547 lines. They record semantic judgments and real page readings that the new arithmetic and schema-form properties do not replace. Keep them in the first follow-up.

The development corpus has 15,364 lines of JSON across ingredients, steps, rare forms, rare units, former held-out samples and tags. It feeds quantity checks, word-form and search tests, tag tests, generated importer pages, and the expected recipes for the 39 skeleton pages. Pruning it requires a separate dependency audit.

The baseline validation already passed: 1,089 unit/component tests, typecheck, lint and formatting locally; all three PR CI jobs passed at `1f6c605`.

## First follow-up PR: retire the bulk quantity ledgers

Keep recipe behavior and corpus inputs stable during this PR. Work through presentation, ingredients and steps in separate commits, adding replacement checks before removing each ledger.

1. Audit the 788 judged quantity entries against existing tests. For each distinct behavior, identify the existing named test or property that checks it, or add a compact regression. Record the mapping in the PR review notes; avoid creating another permanent output inventory. Preserve all five known-wrong cases with their intended readings and visible known-failure status.
2. Fill the gaps with independent expectations. Use generated amounts and notation variants for rules that DESIGN.md settles, and sourced real lines for language and contextual ambiguities. Expected readings must come from the rule or a reviewed example, rather than being produced by the parser being tested.
3. Retain the existing corpus-wide invariants in `corpus.test.ts` and `present.test.ts`: spans, text preservation, scaling, conversions and related checks. The properties in `properties.test.ts` supplement them. Non-crashing and internally consistent results alone do not establish correct recognition.
4. Remove each full-output ledger and its development assertion only after its distinct judged behavior is covered. Review unchecked entries for additional notation or contextual categories; do not automatically turn every recorded output into a new expected case. The candidate files total 22,523 lines; the final net reduction depends on the replacement tests.
5. Remove helpers that become unused. `ingredientLedger` and `stepLedger` also support the held-out workflow, so they cannot simply be deleted with the development assertions. Update `src/lib/AGENTS.md`, `src/lib/quantities/AGENTS.md` and `corpus/AGENTS.md` to describe the new boundary between properties, explicit regressions and the remaining ledgers. The remaining development ledgers are already fully judged, so remove the obsolete `ledger:sample` command and script.

The semantic checks must cover the rules that generic fuzzing can miss: Finnish inflection and number words, `mm` in its different contexts, package totals versus per-item amounts, counts and times inside instructions, alternatives, restated units, sections, and the distinctions between US, British, Australian and metric measures.

## Validation for the first PR

- Run the focused quantity tests after each replacement, then the full `bun run test`, typecheck, lint and formatting checks.
- Demonstrate that the replacement checks fail for deliberate breaks in the behaviors being retired: for example scaling a per-package size, scaling step amounts, mixing measuring systems, or failing to recognise a representative Finnish amount. Restore each deliberate break before continuing.
- Check that the remaining development ledgers still pass without accepting new readings just to make the migration green.
- Compare the final diff with the baseline: report the recorded outputs removed, new regression cases added, known limitations preserved and any coverage intentionally narrowed. Test count alone is not evidence of equivalent coverage.

All reads, searches and test runs continue to exclude `corpus/held-out/` and `held-out-*.txt`. Do not run or change the held-out evaluation as part of this work.

## First follow-up result

Independent audits accounted for all 788 judged entries. Existing named tests and rule checks cover the repeated semantic classes; 44 additional sourced assertions close the identified contextual and vocabulary gaps, and eight generated properties independently check recognition and scaling. All five known-wrong entries remain visible as six expected-failure assertions, including both presentation modes of one entry.

The three ledgers and their development assertions are removed. The input corpus and corpus-wide invariants remain. All remaining development ledgers were already fully judged, so the obsolete sampler is removed too.

The audit exposed an eager held-out import in the ordinary corpus loader. Loading is now inside the explicitly requested evaluation callbacks. A filesystem guard that rejects held-out data and ledger reads reproduced the old problem and passed the final full suite after the fix. The held-out evaluation itself was not run.

Validation: 1,138 tests passed, six expected failures, three skipped; typecheck, lint and formatting passed. Five deliberate semantic breaks were caught by the generated properties and then restored. The migration intentionally ends full-output freezing for the 9,375 unchecked entries; it preserves independently checked rule classes and regressions instead of every old output string.

## Following PR: reduce duplicated corpus inputs

After the quantity-ledger migration lands, audit which input examples each consumer needs:

1. Give generated importer tests a compact set of sourced text and headings, with variation supplied by their generators. Give the real-page skeleton tests explicit reviewed expectations for their selected pages, so neither suite requires the entire quantity/search corpus just to supply text or an answer.
2. Make selected parser and presentation regressions carry their language, measuring system and source explicitly. Today many look these up in the full corpus and assert membership there, which prevents removal of otherwise redundant recipes.
3. Identify representative real lines for every supported notation and contextual distinction. Preserve cases that found bugs. Audit word-form answer keys, search expectations and tag duplicate groups separately before removing any recipe or tag data they use.
4. Remove redundant input records and update the consuming tests and guides together. If a test currently measures a seeded sample, describe how a curated replacement changes what that test can claim; a smaller curated set is not the same statistical sample.

Choose the retained corpus size after this audit. The success criterion is a smaller set with clear reasons for keeping its examples, without losing unique language or recipe-context coverage.
