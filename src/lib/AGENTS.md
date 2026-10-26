# Libraries

## Ledgers

`__ledger__/` folders record real-page imports, word merges and tag pairs. Each ledger's header says what it records and what ✓ and ✗ mean for it; `src/test/ledger.ts` has the update rules. Quantity development tests use explicit regressions and properties instead; see `quantities/AGENTS.md`. The held-out evaluation keeps its separate ledgers, as `corpus/AGENTS.md` describes.

The project owner decides the rules, in DESIGN.md, and leaves ledger entries to agents. A ✓ means an agent found the entry right by those rules.

- After changing code covered by a remaining development ledger, run `UPDATE_LEDGER=1 bun run test` (`-u` leaves ledgers alone). It records each new or changed reading as ! (to check), and stays red until every ! is judged: ✓, or ✗ with want lines, by DESIGN.md and the ledger's header. When more than 20 entries are to check, have a subagent that didn't write the change judge them; give it the diff and DESIGN.md, not your conclusion.
- Changes covered only by quantity regressions and properties do not need ledger updates.
- When DESIGN.md doesn't settle an entry, ask the owner about the rule, with the line as the example, and add the answer to DESIGN.md.
- When a rule can be checked by code, add a rule check: a test that applies it to every corpus line.
- Tune rules against the development corpus only. `corpus/AGENTS.md` describes the corpus and the held-out sample.
