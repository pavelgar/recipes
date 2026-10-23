import { describe, expect, it } from 'vitest'
import { heldOutRecipes } from '@/test/corpus'
import { assertLedger } from '@/test/ledger'
import { findsLedger } from '@/test/words'

// Measures the word keys on the held-out sample in corpus/held-out/, which
// no rule was written against. Runs only on request:
//
//   HELD_OUT=1 bun run test held-out
//
// A fresh agent, one that hasn't worked on the rules, checks a random
// sample of the ledger's entries, and the share marked wrong is how often
// a search misses a form of a word or finds another word in text the rules
// haven't seen. See corpus/AGENTS.md for how to use the sample without
// spoiling it.
describe.runIf(process.env.HELD_OUT)('the held-out sample', () => {
  it('keeps the words each word finds', () => {
    const path = 'src/lib/words/__ledger__/held-out-words.txt'
    const check = findsLedger(path, heldOutRecipes)
    assertLedger(check, path, (message) => expect.fail(message))
  })
})
