import { describe, expect, it } from 'vitest'
import { parseIngredient } from '@/lib/quantities/ingredient'
import { scanStep } from '@/lib/quantities/steps'
import { readUnit } from '@/lib/quantities/units'
import { ingredientLines, stepSentences } from '@/test/corpus'
import { describeIngredient, describeStep } from '@/test/quantities'
import type { LineQuantity } from '@/lib/quantities/line'
import type { CorpusLine } from '@/test/corpus'

// Properties that hold for every corpus line, and readings that must not
// change when the text changes in ways that don't matter.

function checkShape(line: CorpusLine, list: ReadonlyArray<LineQuantity>) {
  const n = line.text.length
  list.forEach((q, i) => {
    const where = `${JSON.stringify(line.text)} #${i}`
    expect(q.at[0], where).toBeGreaterThanOrEqual(0)
    expect(q.at[1], where).toBeLessThanOrEqual(n)
    expect(q.at[0], where).toBeLessThan(q.at[1])
    for (const number of q.numbers) {
      expect(number.at[0], where).toBeGreaterThanOrEqual(q.at[0])
      expect(number.at[1], where).toBeLessThanOrEqual(q.at[1])
    }
    // Links point back, so a list can be read in one pass.
    if (q.of !== null) expect(q.of, where).toBeLessThan(i)
    if (q.type !== 'temperature' && q.unitAt && q.unit) {
      const written = readUnit(line.text, q.unitAt[0], line.language)
      // "mm" reads as millimetres and becomes maustemitta in its line.
      if (q.unit.id !== 'maustemitta') {
        expect(written?.unit.id, where).toBe(q.unit.id)
      }
    }
  })
}

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

  // The editor reads a line on every keystroke.
  it('parses as it is typed', () => {
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

  it('with no-break or thin spaces for spaces', () => {
    for (const line of ingredientLines) {
      for (const space of [' ', ' ']) {
        const text = line.text.replace(/ /g, space)
        expect(
          ingredientReading(line, text).replaceAll(space, ' '),
          line.text,
        ).toBe(ingredientReading(line, line.text))
      }
    }
  })

  it('with an en dash, em dash or minus sign for the hyphen of a range', () => {
    for (const line of ingredientLines) {
      if (!/\d ?- ?\d/.test(line.text)) continue
      // A hyphen before a fraction makes a mixed number: "1-1/2".
      if (/\d-\d+\/\d/.test(line.text)) continue
      for (const dash of ['–', '—', '−']) {
        const text = line.text.replace(/(\d ?)-( ?\d)/g, `$1${dash}$2`)
        expect(
          ingredientReading(line, text).replaceAll(dash, '-'),
          line.text,
        ).toBe(ingredientReading(line, line.text))
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
