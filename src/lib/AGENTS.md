# Libraries

## Ledgers

`__ledger__/` folders record how the code reads every corpus line, word and tag. Each ledger's header says what it records and what ✓ and ✗ mean for it; `src/test/ledger.ts` has the update rules.

The project owner decides the rules, in DESIGN.md, and leaves ledger entries to agents. A ✓ means an agent found the entry right by those rules.

- After changing code that a ledger records, judge every reported change against DESIGN.md and the ledger's header, then accept with `UPDATE_LEDGER=1 bun run test` (`-u` leaves ledgers alone). When more than 20 entries change, also have a subagent that didn't write the change judge them; give it the diff and DESIGN.md, not your conclusion.
- When DESIGN.md doesn't settle an entry, ask the owner about the rule, with the line as the example, and add the answer to DESIGN.md.
- When a rule can be checked by code, add a rule check: a test that applies it to every corpus line.
- Tune rules against the development corpus only. `corpus/AGENTS.md` describes the corpus and the held-out sample.
