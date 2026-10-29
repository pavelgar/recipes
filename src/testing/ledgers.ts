import { parseIngredient } from '@/core/quantities/ingredient'
import { presentIngredient, presentStep } from '@/core/quantities/present'
import { scanStep } from '@/core/quantities/steps'
import { checkLedger } from '@/testing/ledger'
import { describeIngredient, describeStep } from '@/testing/quantities'
import type { CorpusLine } from '@/testing/corpus'
import type { LedgerCheck } from '@/testing/ledger'
import type { DisplaySystem } from '@/core/quantities/measures'

// The ledgers of ingredient lines and step sentences, with a summary of
// each site's results after its heading.

const SEE = [
  'Written by the tests; see src/testing/ledger.ts for what ✓, ✗ and ? mean',
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
    sampled: what === 'held-out',
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
    sampled: what === 'held-out',
    summarise: (site, entries) => {
      const c = counts.get(site) ?? { sentences: 0, found: 0 }
      return `(${sites.get(site)}): ${c.sentences} sentences, ${entries.length} entries; ${c.found} with quantities`
    },
  })
}

// How every corpus line reads on a metric and a US device, and at one and a
// half times the servings on a metric one. Only what differs from the line
// as written is listed.
export function presentedLedger(
  path: string,
  lines: ReadonlyArray<CorpusLine>,
  sentences: ReadonlyArray<CorpusLine>,
): LedgerCheck {
  const items: Array<{ group: string; text: string; reading: Array<string> }> =
    []
  const changed = new Map<string, number>()
  const add = (line: CorpusLine, step: boolean) => {
    const show = (display: DisplaySystem, factor: number) => {
      const opts = { ...line, display, factor }
      return step
        ? presentStep(line.text, scanStep(line.text, line), opts).text
        : presentIngredient(parseIngredient(line.text, line), opts).text
    }
    const metric = show('metric', 1)
    const reading = [
      ...(metric !== line.text ? [`metric: ${metric}`] : []),
      ...(show('us', 1) !== line.text ? [`us: ${show('us', 1)}`] : []),
      ...(!step && show('metric', 1.5) !== metric
        ? [`×1.5: ${show('metric', 1.5)}`]
        : []),
    ]
    if (reading.length === 0) return
    changed.set(line.site, (changed.get(line.site) ?? 0) + 1)
    items.push({
      group: line.site,
      text: step ? `step: ${line.text}` : line.text,
      reading,
    })
  }
  for (const line of lines) add(line, false)
  for (const sentence of sentences) add(sentence, true)
  return checkLedger({
    path,
    title: [
      'Every corpus line and step sentence as a metric and a US device show',
      'it, and as a metric one shows it at 1.5 times the servings. Lines',
      'shown exactly as written are left out.',
      ...SEE,
    ],
    items,
    summarise: (site, entries) =>
      `: ${changed.get(site) ?? 0} lines and sentences, ${entries.length} entries`,
  })
}
