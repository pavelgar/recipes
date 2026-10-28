import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'
import { formatDecimal, formatFraction } from '@/lib/quantities/format'
import { parseIngredient } from '@/lib/quantities/ingredient'
import {
  HALVES,
  QUARTERS,
  SIMPLE,
  TEASPOON,
  measureSize,
  metricVolume,
  metricWeight,
  toCelsius,
  toFahrenheit,
  usVolume,
  usWeight,
} from '@/lib/quantities/kitchen'
import { US_CUP, US_TBSP } from '@/lib/quantities/measures'
import { readNumber } from '@/lib/quantities/numbers'
import { presentIngredient } from '@/lib/quantities/present'
import { scanStep } from '@/lib/quantities/steps'
import { checkShape } from '@/test/quantities'
import type { Measure } from '@/lib/quantities/kitchen'
import type { Language } from '@/lib/quantities/numbers'

// Properties of the arithmetic for any amount, not only the corpus's: the
// rounding rules of DESIGN.md, "Units", and numbers that read back as they
// were written. fast-check draws the amounts, a new set each run, and
// shrinks a failure to the smallest amount that shows it; the seed it
// prints repeats the run.

const LANGUAGES: ReadonlyArray<Language> = ['fi', 'en']

// Kitchen amounts in millilitres or grams: a pinch to a big pot.
const amount = fc.double({ min: 0.5, max: 20_000, noNaN: true })
const twoAmounts = fc
  .tuple(amount, amount)
  .map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as const)

const valueOf = (measure: Measure) => {
  const [part] = measure
  expect(typeof part.value).toBe('number')
  return part.value as number
}
const isMultiple = (n: number, step: number) =>
  Math.abs(n / step - Math.round(n / step)) < 1e-9
const isWholePlus = (n: number, fractions: ReadonlyArray<number>) =>
  fractions.some((f) => Math.abs(n - Math.floor(n + 1e-9) - f) < 1e-9)

describe('metric volumes', () => {
  test.prop([amount])(
    'are decilitres with one decimal, and litres from 10 dl',
    (ml) => {
      const measure = metricVolume(ml)
      const [{ unit }] = measure
      const value = valueOf(measure)
      expect(isMultiple(value, 0.1)).toBe(true)
      if (unit === 'dl') expect(value).toBeLessThan(10)
      else expect([unit, ml >= 995]).toEqual(['l', true])
    },
  )

  test.prop([twoAmounts])('never show less for more', ([less, more]) => {
    expect(measureSize(metricVolume(less), false)).toBeLessThanOrEqual(
      measureSize(metricVolume(more), false),
    )
  })
})

describe('US volumes', () => {
  test.prop([amount, fc.boolean()])(
    'are teaspoons below a tablespoon, tablespoons below ¼ cup, then cups',
    (ml, quarts) => {
      const measure = usVolume(ml, quarts)
      const units = measure.map((part) => part.unit)
      if (ml < US_TBSP) expect(units).toEqual(['tsp'])
      else if (ml < US_CUP / 4) expect(units).toEqual(['tbsp'])
      else if (quarts && ml >= 8 * US_CUP) expect(units).toEqual(['quart'])
      else expect(units[0]).toMatch(/^(cup|tbsp)$/)
    },
  )

  test.prop([amount, fc.boolean()])(
    'write each part in the fractions its unit takes',
    (ml, quarts) => {
      const fractions = {
        tsp: TEASPOON,
        tbsp: HALVES,
        cup: SIMPLE,
        quart: QUARTERS,
      }
      for (const part of usVolume(ml, quarts)) {
        const allowed = fractions[part.unit as keyof typeof fractions]
        expect(isWholePlus(part.value as number, allowed), part.unit).toBe(true)
      }
    },
  )
})

describe('metric weights', () => {
  test.prop([amount])(
    'round to 1 g below 20 g, 5 g below 250 g, 10 g below 1 kg, then kilograms with one decimal',
    (g) => {
      const measure = metricWeight(g)
      const [{ unit }] = measure
      const value = valueOf(measure)
      if (unit === 'kg') {
        expect(isMultiple(value, 0.1)).toBe(true)
        return
      }
      const step = value < 20 ? 1 : value < 250 ? 5 : 10
      expect(isMultiple(value, step), `${value} g`).toBe(true)
      expect(value).toBeLessThan(1000)
    },
  )

  test.prop([twoAmounts])('never show less for more', ([less, more]) => {
    expect(measureSize(metricWeight(less), false)).toBeLessThanOrEqual(
      measureSize(metricWeight(more), false),
    )
  })
})

describe('US weights', () => {
  test.prop([amount])('are ounces below 2 lb, then quarter pounds', (g) => {
    const measure = usWeight(g)
    const [{ unit }] = measure
    const value = valueOf(measure)
    if (unit === 'lb') {
      expect(isWholePlus(value, QUARTERS)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(2)
    } else {
      expect(value).toBeLessThan(32)
    }
  })

  test.prop([twoAmounts])('never show less for more', ([less, more]) => {
    expect(measureSize(usWeight(less), true)).toBeLessThanOrEqual(
      measureSize(usWeight(more), true),
    )
  })
})

describe('oven temperatures', () => {
  const celsius = fc.integer({ min: -20, max: 300 })
  const fahrenheit = fc.integer({ min: 0, max: 575 })

  test.prop([celsius])(
    'are in steps of 25 °F from 120 °C, and of 5 °F below',
    (c) => {
      expect(isMultiple(toFahrenheit(c), c >= 120 ? 25 : 5)).toBe(true)
    },
  )

  test.prop([fahrenheit])(
    'are in steps of 10 °C from 120 °C, and of 1 °C below',
    (f) => {
      const c = toCelsius(f)
      expect(Number.isInteger(c)).toBe(true)
      if (((f - 32) * 5) / 9 >= 120) expect(isMultiple(c, 10)).toBe(true)
    },
  )

  test.prop([fc.tuple(celsius, celsius)])(
    'never get colder as they get hotter, in °F',
    ([a, b]) => {
      const [low, high] = a <= b ? [a, b] : [b, a]
      expect(toFahrenheit(low)).toBeLessThanOrEqual(toFahrenheit(high))
    },
  )

  test.prop([fc.tuple(fahrenheit, fahrenheit)])(
    'never get colder as they get hotter, in °C',
    ([a, b]) => {
      const [low, high] = a <= b ? [a, b] : [b, a]
      expect(toCelsius(low)).toBeLessThanOrEqual(toCelsius(high))
    },
  )
})

describe('numbers', () => {
  // A whole number and one of the fractions the app writes as a glyph.
  const fraction = fc
    .tuple(
      fc.integer({ min: 0, max: 99 }),
      fc.constantFrom(0, 1 / 2, 1 / 3, 2 / 3, 1 / 4, 3 / 4, 1 / 8, 3 / 8),
    )
    .map(([whole, part]) => whole + part)
    .filter((n) => n > 0)

  test.prop([fraction, fc.constantFrom(...LANGUAGES)])(
    'written as fractions read back as written',
    (n, language) => {
      for (const text of [
        formatFraction(n),
        formatFraction(n, { slash: true }),
        formatFraction(n, { slash: true, joiner: '-' }),
      ]) {
        const read = readNumber(text, 0, language)
        expect(read?.end, text).toBe(text.length)
        expect(read?.value, text).toBeCloseTo(n, 9)
      }
    },
  )

  test.prop([
    fc.double({ min: 0.1, max: 9999, noNaN: true }),
    fc.constantFrom(...LANGUAGES),
  ])(
    'written as decimals read back as written, to one decimal',
    (n, language) => {
      const text = formatDecimal(n, language)
      const read = readNumber(text, 0, language)
      expect(read?.end, text).toBe(text.length)
      expect(read?.value, text).toBeCloseTo(Math.round(n * 10) / 10, 9)
    },
  )
})

describe('scaled measures', () => {
  // A measure as recipes write it, and servings changed from one count to
  // another.
  const written = fc
    .tuple(
      fc.integer({ min: 0, max: 4 }),
      fc.constantFrom(1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4),
    )
    .map(([whole, part]) => whole + part)
  const factor = fc
    .tuple(fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 24 }))
    .map(([from, to]) => to / from)

  test.prop([written, factor, fc.constantFrom('dl', 'tl')], {
    // CI seed 641006560: a decimal rounded at the half-step boundary.
    examples: [[0.5, 0.3, 'dl']],
  })(
    'read within 10% of the amount, as a fraction only when one is that close',
    (n, f, unit) => {
      const text = `${formatFraction(n)} ${unit} maitoa`
      const opts = { language: 'fi', system: 'metric' } as const
      const shown = presentIngredient(parseIngredient(text, opts), {
        ...opts,
        display: 'metric',
        factor: f,
      }).text
      const read = readNumber(shown, 0, 'fi')
      expect(read, shown).not.toBeNull()
      const exact = n * f
      const off = Math.abs(read!.value - exact)
      if (read!.form === 'fraction') {
        expect(off / exact, shown).toBeLessThanOrEqual(0.1 + 1e-9)
      } else {
        // A decimal to one place, allowing floating-point noise at the
        // half-step boundary (0.2 - 0.15 is slightly more than 0.05).
        expect(off, shown).toBeLessThanOrEqual(
          Math.max(0.1 * exact, 0.05) + 1e-9,
        )
      }
    },
  )

  test.prop([fc.integer({ min: 1, max: 12 })])(
    'up to 3 Australian tablespoons convert exactly, into tablespoons and teaspoons',
    (quarters) => {
      const n = quarters / 4
      const opts = { language: 'en', system: 'australian' } as const
      const shown = presentIngredient(
        parseIngredient(`${formatFraction(n)} tbsp oil`, opts),
        { ...opts, display: 'metric' },
      ).text
      // "1 tbsp + 1 tsp oil", "4 tbsp oil", "2 tsp oil"
      const parts = /^(?:(\S+) tbsp)?(?: \+ )?(?:(\S+) tsp)? oil$/.exec(shown)
      expect(parts, shown).not.toBeNull()
      const number = (s: string | undefined) =>
        s === undefined ? 0 : readNumber(s, 0, 'en')!.value
      const ml = number(parts![1]) * 15 + number(parts![2]) * 5
      expect(ml, shown).toBeCloseTo(n * 20, 9)
    },
  )
})

describe('any text', () => {
  // Lines put together from what ingredient lines and steps are made of, so
  // the reader's paths meet each other in combinations no page has
  // published.
  const token = fc.oneof(
    fc.integer({ min: 0, max: 2000 }).map(String),
    fc.constantFrom('½', '¼', '¾', '⅓', '1/2', '1-1/2', '1,5', '1.5', '.25'),
    fc.constantFrom('dl', 'rkl', 'tl', 'mm', 'g', 'kg', 'cup', 'cups', 'tbsp'),
    fc.constantFrom('tsp', 'oz', 'ounce', 'lb', 'in.', 'cm', '°C', '°F', 'pkt'),
    fc.constantFrom('à', 'x', '×', '-', '–', 'to', 'tai', 'or', 'plus', 'of'),
    fc.constantFrom('(', ')', ',', ':', '/', '+', '~', 'n.', 'noin', 'about'),
    fc.constantFrom('maitoa', 'jauhoja', 'flour', 'sugar', 'each', 'can'),
    fc.string({ maxLength: 3 }),
  )
  const space = fc.constantFrom('', ' ', '  ', ' ', ' ')
  const line = fc
    .array(fc.tuple(token, space), { maxLength: 12 })
    .map((parts) => parts.map(([t, s]) => t + s).join(''))
  const opts = fc.record({
    language: fc.constantFrom(...LANGUAGES),
    system: fc.constantFrom(
      'metric' as const,
      'us' as const,
      'british' as const,
      'australian' as const,
    ),
  })

  test.prop([line, opts], { numRuns: 2000 })(
    'reads as an ingredient line into quantities that fit it',
    (text, options) => {
      const parsed = parseIngredient(text, options)
      checkShape({ text, language: options.language }, parsed.quantities)
      const mains = parsed.quantities.filter((q) => q.role === 'main')
      const recognised =
        parsed.result === 'measured' || parsed.result === 'counted'
      expect(mains.length).toBe(recognised ? 1 : 0)
    },
  )

  test.prop([line, opts], { numRuns: 2000 })(
    'reads as a step into quantities that fit it',
    (text, options) => {
      const list = scanStep(text, options)
      checkShape({ text, language: options.language }, list)
      expect(list.every((q) => !q.scales && q.role !== 'main')).toBe(true)
    },
  )
})
