import { describe, expect, it } from 'vitest'
import { heldOutIngredientLines, heldOutStepSentences } from '@/test/corpus'
import { assertLedger } from '@/test/ledger'
import { ingredientLedger, stepLedger } from '@/test/ledgers'

// Measures the parser on the held-out sample in tests/corpus/held-out/,
// which no rule was written against. Runs only on request:
//
//   HELD_OUT=1 bun run test held-out
//
// Its ledgers record the readings like the corpus ledgers do. A fresh
// agent, one that hasn't worked on the rules, checks a random sample of
// entries, and the share marked wrong is the parser's error rate on text
// it hasn't seen. See tests/corpus/AGENTS.md for how to use the sample
// without spoiling it.
describe.runIf(process.env.HELD_OUT)('the held-out sample', () => {
  it('keeps its reading of every ingredient line', () => {
    const path = 'src/lib/quantities/__ledger__/held-out-ingredients.txt'
    const check = ingredientLedger(path, heldOutIngredientLines, 'held-out')
    assertLedger(check, path, (message) => expect.fail(message))
  })

  it('keeps its reading of every step sentence', () => {
    const path = 'src/lib/quantities/__ledger__/held-out-steps.txt'
    const check = stepLedger(path, heldOutStepSentences, 'held-out')
    assertLedger(check, path, (message) => expect.fail(message))
  })
})
