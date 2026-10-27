# Quantities

The rules this library follows are in DESIGN.md, under "Units".

## Tests

- Rule checks go in `corpus.test.ts`.
- Rules about any amount, not only the corpus's (rounding steps, units by size, numbers read back as written), go in `properties.test.ts` as fast-check properties. When one fails, the counterexample is a case DESIGN.md either settles or should: fix the code, or ask the owner.
- Where the corpus has no example of a notation, a test uses the shortest text that shows it and says so, in its name ("(notation)") or in a "Notation tests" comment.
- `src/test/quantities.ts` explains how tests and ledgers write a reading.
