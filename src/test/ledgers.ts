import { parseIngredient } from '@/lib/quantities/ingredient'
import { scanStep } from '@/lib/quantities/steps'
import { checkLedger } from '@/test/ledger'
import { describeIngredient, describeStep } from '@/test/quantities'
import type { CorpusLine } from '@/test/corpus'
import type { LedgerCheck } from '@/test/ledger'

// The ledgers of ingredient lines and step sentences, with a summary of
// each site's results after its heading.

const SEE = [
  'Written by the tests; see src/test/ledger.ts for what ✓, ✗ and ? mean',
  'and how to update it.',
]

export function ingredientLedger(
  path: string,
  lines: ReadonlyArray<CorpusLine>,
  what: string,
): LedgerCheck {
  const results = new Map<string, Map<string, number>>()
  const sites = new Map<string, string>()
  const items = lines.map((line) => {
    const parsed = parseIngredient(line.text, line)
    const counts = results.get(line.site) ?? new Map<string, number>()
    counts.set(parsed.result, (counts.get(parsed.result) ?? 0) + 1)
    results.set(line.site, counts)
    sites.set(line.site, `${line.language}, ${line.system}`)
    return {
      group: line.site,
      text: line.text,
      reading: [describeIngredient(parsed)],
    }
  })
  return checkLedger({
    path,
    title: [
      `Every ${what} ingredient line as parseIngredient reads it, one entry`,
      'per distinct line and site.',
      ...SEE,
    ],
    items,
    summarise: (site, entries) => {
      const counts = results.get(site) ?? new Map<string, number>()
      const total = [...counts.values()].reduce((a, b) => a + b, 0)
      const parts = ['measured', 'counted', 'no-amount', 'unrecognised'].map(
        (r) => `${counts.get(r) ?? 0} ${r}`,
      )
      return `(${sites.get(site)}): ${total} lines, ${entries.length} entries; ${parts.join(', ')}`
    },
  })
}

export function stepLedger(
  path: string,
  sentences: ReadonlyArray<CorpusLine>,
  what: string,
): LedgerCheck {
  const counts = new Map<string, { sentences: number; found: number }>()
  const sites = new Map<string, string>()
  const items = sentences.map((sentence) => {
    const reading = describeStep(
      sentence.text,
      scanStep(sentence.text, sentence),
    )
    const c = counts.get(sentence.site) ?? { sentences: 0, found: 0 }
    c.sentences++
    if (reading.length > 0) c.found++
    counts.set(sentence.site, c)
    sites.set(sentence.site, `${sentence.language}, ${sentence.system}`)
    return { group: sentence.site, text: sentence.text, reading }
  })
  return checkLedger({
    path,
    title: [
      `Every ${what} step sentence as scanStep reads it, one entry per`,
      'distinct sentence and site.',
      ...SEE,
    ],
    items,
    summarise: (site, entries) => {
      const c = counts.get(site) ?? { sentences: 0, found: 0 }
      return `(${sites.get(site)}): ${c.sentences} sentences, ${entries.length} entries; ${c.found} with quantities`
    },
  })
}
