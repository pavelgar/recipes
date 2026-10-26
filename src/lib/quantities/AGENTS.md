# Quantities

The rules this library follows are in DESIGN.md, under "Units".

## Tests

- Expected readings belong in named cases in `ingredient.test.ts`, `steps.test.ts` and `present.test.ts`, checked against DESIGN.md. Keep distinct language and contextual cases, with a sourced corpus line or a minimal notation example. Development quantity tests do not record every output in a ledger.
- Rule checks go in `corpus.test.ts`.
- Rules about any amount, not only the corpus's (rounding steps, units by size, numbers read back as written), go in `properties.test.ts` as fast-check properties. When one fails, the counterexample is a case DESIGN.md either settles or should: fix the code, or ask the owner.
- Generated recognition tests must assert the values, units and roles they generated independently. Valid spans and round trips alone can pass when recognition is missing or consistently wrong.
- Known failures assert the intended result with `it.fails`. When one is fixed, remove its known-failure marker so it becomes a normal regression.
- Where the corpus has no example of a notation, a test uses the shortest text that shows it and says so, in its name ("(notation)") or in a "Notation tests" comment.
- `src/test/quantities.ts` explains how tests and ledgers write a reading.
