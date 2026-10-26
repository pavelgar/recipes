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
import { presentIngredient, presentStep } from '@/lib/quantities/present'
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

// Notation properties: these are minimal quantity expressions, not sample
// recipes. The generator supplies the values and meanings independently
// of the parser, so dropping a recognised quantity cannot pass them.
describe('generated quantity notation', () => {
  const whole = fc.integer({ min: 1, max: 20 })
  const measuringSystem = fc.constantFrom(
    'metric' as const,
    'us' as const,
    'british' as const,
    'australian' as const,
  )
  const written = fc.oneof(
    whole.map((value) => ({ text: String(value), value })),
    fc.integer({ min: 1, max: 199 }).map((tenths) => ({
      text: `${Math.floor(tenths / 10)},${tenths % 10}`,
      value: tenths / 10,
    })),
    fc
      .tuple(
        whole,
        fc.constantFrom(
          ['¼', 0.25] as const,
          ['½', 0.5] as const,
          ['¾', 0.75] as const,
        ),
      )
      .map(([n, [glyph, part]]) => ({ text: `${n}${glyph}`, value: n + part })),
    whole.map((n) => ({ text: `${n}-1/2`, value: n + 0.5 })),
  )
  const measure = fc.constantFrom(
    { language: 'fi' as const, written: 'dl', id: 'dl' },
    { language: 'fi' as const, written: 'rkl', id: 'tbsp' },
    { language: 'fi' as const, written: 'tl', id: 'tsp' },
    { language: 'en' as const, written: 'cups', id: 'cup' },
    { language: 'en' as const, written: 'oz', id: 'oz' },
    { language: 'en' as const, written: 'tbsp', id: 'tbsp' },
  )

  test.prop(
    [written, measure, measuringSystem, fc.constantFrom('', ' ', ' ', ' ')],
    {
      numRuns: 300,
    },
  )(
    'recognises the generated number and unit as the main amount',
    (number, unit, system, space) => {
      const text = `${number.text}${space}${unit.written}`
      const parsed = parseIngredient(text, { language: unit.language, system })
      expect(parsed.result).toBe('measured')
      expect(parsed.quantities).toHaveLength(1)
      expect(parsed.quantities[0]).toMatchObject({
        type: 'amount',
        value: number.value,
        unit: { id: unit.id },
        role: 'main',
        of: null,
        scales: true,
      })
    },
  )

  test.prop([whole, whole, fc.constantFrom('-', '–', ' to ')])(
    'keeps both ends of a generated range',
    (low, width, separator) => {
      const parsed = parseIngredient(`${low}${separator}${low + width} dl`, {
        language: 'en',
        system: 'metric',
      })
      expect(parsed.quantities).toHaveLength(1)
      expect(parsed.quantities[0]).toMatchObject({
        type: 'amount',
        value: { min: low, max: low + width },
        unit: { id: 'dl' },
        role: 'main',
        scales: true,
      })
    },
  )

  test.prop([whole, whole, fc.constantFrom('+', 'plus', 'tai', 'or')])(
    'keeps additions and alternatives as two amounts',
    (first, second, join) => {
      // Alternatives in the same unit can be a range ("1 or 2 dl"). Use
      // distinct units for alternatives, as in fresh versus dried herbs.
      const [a, b] =
        join === 'tai'
          ? ['rkl', 'tl']
          : join === 'or'
            ? ['tbsp', 'tsp']
            : ['dl', 'dl']
      const parsed = parseIngredient(`${first} ${a} ${join} ${second} ${b}`, {
        language: join === 'tai' ? 'fi' : 'en',
        system: 'metric',
      })
      expect(parsed.quantities).toHaveLength(2)
      expect(parsed.quantities).toMatchObject([
        { value: first, role: 'main', scales: true },
        { value: second, role: 'other', scales: true },
      ])
    },
  )

  test.prop([
    fc.integer({ min: 2, max: 6 }),
    fc.integer({ min: 1, max: 10 }).map((n) => n * 5),
    fc.integer({ min: 2, max: 3 }),
    fc.constantFrom(...LANGUAGES),
    fc.boolean(),
  ])(
    'scales package totals and leaves each package’s size fixed',
    (count, grams, factor, language, each) => {
      const pack = language === 'fi' ? 'pkt' : 'cans'
      const size = (n: number) =>
        each ? (language === 'fi' ? `à ${n} g` : `${n} g each`) : `${n} g`
      const text = `${count} ${pack} (${size(grams)})`
      const opts = {
        language,
        system: 'metric' as const,
        display: 'metric' as const,
        factor,
      }
      const parsed = parseIngredient(text, opts)
      expect(parsed.quantities).toHaveLength(2)
      expect(parsed.quantities).toMatchObject([
        { value: count, role: 'main', scales: true },
        { value: grams, role: each ? 'each' : 'total', of: 0, scales: !each },
      ])
      expect(presentIngredient(parsed, opts).text).toBe(
        `${count * factor} ${pack} (${size(each ? grams : grams * factor)})`,
      )
    },
  )

  test.prop([whole])(
    'reads Finnish mm by its position and kind of line',
    (n) => {
      const opts = { language: 'fi' as const, system: 'metric' as const }
      expect(
        parseIngredient(`${n} mm suolaa`, opts).quantities[0],
      ).toMatchObject({
        type: 'amount',
        value: n,
        unit: { id: 'maustemitta' },
      })
      expect(
        parseIngredient(`${n} g, ${n} mm`, opts).quantities[1],
      ).toMatchObject({
        type: 'amount',
        value: n,
        unit: { id: 'mm' },
        scales: false,
      })
      expect(scanStep(`${n} mm`, opts)).toMatchObject([
        { type: 'amount', value: n, unit: { id: 'mm' }, scales: false },
      ])
    },
  )

  test.prop([whole, whole, fc.integer({ min: 100, max: 250 }), whole])(
    'recognises measures and temperatures in steps, leaving times and counts alone',
    (spoons, grams, temperature, minutes) => {
      const text = `${spoons} tbsp, ${grams} g, ${temperature} °C, ${minutes} min, 2`
      const opts = {
        language: 'en' as const,
        system: 'us' as const,
        display: 'metric' as const,
        factor: 3,
      }
      const quantities = scanStep(text, opts)
      expect(quantities).toHaveLength(3)
      expect(quantities).toMatchObject([
        {
          type: 'amount',
          value: spoons,
          unit: { id: 'tbsp' },
          role: 'other',
          scales: false,
        },
        {
          type: 'amount',
          value: grams,
          unit: { id: 'g' },
          role: 'other',
          scales: false,
        },
        { type: 'temperature', value: temperature, scale: 'C', scales: false },
      ])
      expect(presentStep(text, quantities, opts).text).toBe(text)
    },
  )

  test.prop([fc.integer({ min: 1, max: 3 }), measuringSystem])(
    'converts cups by the recipe’s measuring system',
    (cups, system) => {
      const opts = {
        language: 'en' as const,
        system,
        display: 'metric' as const,
      }
      const text = `${cups} ${cups === 1 ? 'cup' : 'cups'} water`
      // US customary cup: 236.5882365 ml; the other recipe systems use 250 ml.
      const ml = system === 'us' ? 236.5882365 : 250
      const dl = Math.round((cups * ml) / 10) / 10
      expect(presentIngredient(parseIngredient(text, opts), opts).text).toBe(
        `${dl} dl water`,
      )
    },
  )

  test.prop([fc.integer({ min: 1, max: 3 }), measuringSystem])(
    'keeps ordinary spoons one-to-one and converts Australian tablespoons',
    (spoons, system) => {
      const opts = {
        language: 'en' as const,
        system,
        display: 'metric' as const,
      }
      const text = `${spoons} tbsp water`
      const expected =
        system === 'australian' ? `${spoons * 4} tsp water` : text
      expect(presentIngredient(parseIngredient(text, opts), opts).text).toBe(
        expected,
      )
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
