import { describe, expect, it } from 'vitest'
import { parseIngredient } from '@/core/quantities/ingredient'
import { scanStep } from '@/core/quantities/steps'
import { ingredientLines, stepSentences } from '@/testing/corpus'
import {
  checkShape,
  describeIngredient,
  describeStep,
} from '@/testing/quantities'
import type { CorpusLine } from '@/testing/corpus'

// Properties that hold for every corpus line, and readings that must not
// change when the text changes in ways that don't matter.

describe('every corpus line', () => {
  it('has spans, numbers, units and links that fit its text', () => {
    for (const line of ingredientLines) {
      const parsed = parseIngredient(line.text, line)
      checkShape(line, parsed.quantities)
      const mains = parsed.quantities.filter((q) => q.role === 'main')
      const recognised =
        parsed.result === 'measured' || parsed.result === 'counted'
      expect(mains.length, line.text).toBe(recognised ? 1 : 0)
    }
    for (const sentence of stepSentences) {
      const list = scanStep(sentence.text, sentence)
      checkShape(sentence, list)
      expect(list.every((q) => !q.scales && q.role !== 'main')).toBe(true)
    }
  })

  // The editor reads a line on every keystroke. Every prefix of every line
  // grows with the corpus: 3.5 s on a laptop and 6.4 s on GitHub's
  // runners, past the 5 s default.
  it('parses as it is typed', { timeout: 30_000 }, () => {
    for (const line of ingredientLines) {
      for (let end = 1; end < line.text.length; end++) {
        const text = line.text.slice(0, end)
        checkShape({ ...line, text }, parseIngredient(text, line).quantities)
      }
    }
  })
})

describe('readings stay the same', () => {
  const ingredientReading = (line: CorpusLine, text: string) =>
    describeIngredient(parseIngredient(text, line))

  const stepReading = (line: CorpusLine, text: string) =>
    describeStep(text, scanStep(text, line))

  it('with no-break or thin spaces for spaces', () => {
    for (const space of ['\u00a0', '\u2009', '\u202f']) {
      // Some lines already hold such spaces, so both readings are compared
      // with plain ones.
      const plain = (reading: string) => reading.replaceAll(space, ' ')
      for (const line of ingredientLines) {
        const text = line.text.replace(/ /g, space)
        expect(plain(ingredientReading(line, text)), line.text).toBe(
          plain(ingredientReading(line, line.text)),
        )
      }
      for (const sentence of stepSentences) {
        const text = sentence.text.replace(/ /g, space)
        expect(stepReading(sentence, text).map(plain), sentence.text).toEqual(
          stepReading(sentence, sentence.text).map(plain),
        )
      }
    }
  })

  it('with an en dash, em dash or minus sign for the hyphen of a range', () => {
    const ranged = (text: string) =>
      // A hyphen before a fraction makes a mixed number: "1-1/2".
      /\d ?- ?\d/.test(text) && !/\d-\d+\/\d/.test(text)
    for (const dash of ['–', '—', '−']) {
      const dashed = (text: string) =>
        text.replace(/(\d ?)-( ?\d)/g, `$1${dash}$2`)
      for (const line of ingredientLines) {
        if (!ranged(line.text)) continue
        expect(
          ingredientReading(line, dashed(line.text)).replaceAll(dash, '-'),
          line.text,
        ).toBe(ingredientReading(line, line.text))
      }
      for (const sentence of stepSentences) {
        if (!ranged(sentence.text)) continue
        expect(
          stepReading(sentence, dashed(sentence.text)).map((r) =>
            r.replaceAll(dash, '-'),
          ),
          sentence.text,
        ).toEqual(stepReading(sentence, sentence.text))
      }
    }
  })

  it('with 1/2 for ½', () => {
    const strip = (reading: string) => reading.replace(/ {2}\[.*$/, '')
    for (const line of ingredientLines) {
      if (!line.text.includes('½')) continue
      const text = line.text.replace(/(\d)?½/g, (_, whole?: string) =>
        whole ? `${whole} 1/2` : '1/2',
      )
      expect(strip(ingredientReading(line, text)), line.text).toBe(
        strip(ingredientReading(line, line.text)),
      )
    }
  })

  it('with words before a step, its quantities only moving', () => {
    const prefix = 'Then, '
    for (const sentence of stepSentences) {
      const before = scanStep(sentence.text, sentence)
      const after = scanStep(prefix + sentence.text, sentence)
      expect(
        describeStep(prefix + sentence.text, after),
        sentence.text,
      ).toEqual(describeStep(sentence.text, before))
      expect(after.map((q) => q.at[0] - prefix.length)).toEqual(
        before.map((q) => q.at[0]),
      )
    }
  })
})
