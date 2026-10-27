import { sumBy } from 'es-toolkit'
import {
  INCH,
  OUNCE,
  POUND,
  US_CUP,
  US_QUART,
  US_TBSP,
  US_TSP,
  sizeOf,
} from '@/lib/quantities/measures'
import { unitById } from '@/lib/quantities/units'
import type { Value } from '@/lib/quantities/numbers'

// Kitchen measures: which unit a cook would write an exact amount in, and
// how far to round it. See DESIGN.md, "Units". Amounts come in millilitres,
// grams, millimetres or degrees.

export type KitchenUnit =
  | 'ml'
  | 'dl'
  | 'l'
  | 'g'
  | 'kg'
  | 'mm'
  | 'cm'
  | 'tsp'
  | 'tbsp'
  | 'cup'
  | 'quart'
  | 'oz'
  | 'lb'
  | 'in'

export type Part = { readonly value: Value; readonly unit: KitchenUnit }

// One part, or a cup measure with tablespoons added: "⅓ cup + 1½ tbsp".
export type Measure = ReadonlyArray<Part>

// Fractions a cook writes, by measure. Each list starts at zero.
export const SIMPLE = [0, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4]
export const TEASPOON = [0, 1 / 8, 1 / 4, 1 / 2, 3 / 4]
export const QUARTERS = [0, 1 / 4, 1 / 2, 3 / 4]
export const HALVES = [0, 1 / 2]
export const INCHES = [0, 1 / 8, 1 / 4, 1 / 2, 3 / 4]

// How far a simple fraction may be off before spoons are added: 1,5 dl →
// ⅔ cup (5.1% over), 2 dl → ¾ cup + 1½ tbsp (¾ cup alone is 11% under).
const SPOON_TOLERANCE = 0.06

export const maxOf = (v: Value) => (typeof v === 'number' ? v : v.max)

// Sizes of the units measures come out in, in millilitres, grams or
// millimetres. Teaspoons and tablespoons are US ones in the US display and
// 5 and 15 ml in the metric one.
export function partSize(unit: KitchenUnit, us: boolean): number {
  const metricSpoon = !us && (unit === 'tsp' || unit === 'tbsp')
  return sizeOf(unitById(unit), metricSpoon ? 'metric' : 'us')!
}

// The size of a measure, at the top of a range.
export function measureSize(measure: Measure, us: boolean): number {
  return sumBy(measure, (part) => maxOf(part.value) * partSize(part.unit, us))
}

// How far a conversion may land from the exact amount before the amount is
// left as written instead: ½ g of saffron is no fraction of an ounce.
export const CONVERSION_LIMIT = 0.35

// Applies f to a number or both ends of a range, keeping a range only while
// its ends differ.
export function mapValue(v: Value, f: (n: number) => number): Value {
  if (typeof v === 'number') return f(v)
  const min = f(v.min)
  const max = f(v.max)
  return max > min ? { min, max } : max
}

// The nearest whole number plus one of the fractions. Never zero for a
// positive amount: the smallest fraction above zero, or one, instead.
export function nearestFraction(
  n: number,
  fractions: ReadonlyArray<number>,
): number {
  if (n <= 0) return n
  const whole = Math.floor(n)
  let best = whole + 1
  for (const f of fractions) {
    if (Math.abs(whole + f - n) < Math.abs(best - n)) best = whole + f
  }
  return best > 0 ? best : (fractions.find((f) => f > 0) ?? 1)
}

// The largest whole number plus one of the fractions not above n.
function floorFraction(n: number, fractions: ReadonlyArray<number>): number {
  const whole = Math.floor(n)
  let best = whole
  for (const f of fractions) if (whole + f <= n + 1e-9) best = whole + f
  return best
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step
const oneDecimal = (n: number) => Math.max(0.1, Math.round(n * 10) / 10)

// Metric volumes are decilitres with one decimal, even below half a
// decilitre, and litres from 10 dl: ⅓ cup → 0,8 dl, 5 cups → 1,2 l.
export function metricVolume(ml: Value): Measure {
  if (maxOf(mapValue(ml, (n) => oneDecimal(n / 100))) >= 10) {
    return [{ unit: 'l', value: mapValue(ml, (n) => oneDecimal(n / 1000)) }]
  }
  return [{ unit: 'dl', value: mapValue(ml, (n) => oneDecimal(n / 100)) }]
}

// US volumes: teaspoons below a tablespoon, tablespoons below ¼ cup, then
// cups. A cup amount is the nearest simple fraction when that is within 6%,
// and otherwise the fraction below with tablespoons added: 1 dl → ⅓ cup +
// 1½ tbsp. Ranges keep to one unit. In English, quarts from 8 cups.
export function usVolume(ml: Value, quarts: boolean): Measure {
  const top = maxOf(ml)
  if (top < US_TBSP) {
    return [
      {
        unit: 'tsp',
        value: mapValue(ml, (n) => nearestFraction(n / US_TSP, TEASPOON)),
      },
    ]
  }
  if (top < US_CUP / 4) {
    return [
      {
        unit: 'tbsp',
        value: mapValue(ml, (n) => nearestFraction(n / US_TBSP, HALVES)),
      },
    ]
  }
  if (quarts && top >= 8 * US_CUP) {
    return [
      {
        unit: 'quart',
        value: mapValue(ml, (n) => nearestFraction(n / US_QUART, QUARTERS)),
      },
    ]
  }
  const cupsOf = (n: number) => nearestFraction(n / US_CUP, SIMPLE)
  if (typeof ml !== 'number')
    return [{ unit: 'cup', value: mapValue(ml, cupsOf) }]
  return cupsWithSpoons(ml / US_CUP, 16)
}

// A cup amount as the nearest simple fraction, or the fraction below plus
// spoons when that is more than 6% off. spoonsPerCup is 16 tablespoons.
export function cupsWithSpoons(cups: number, spoonsPerCup: number): Measure {
  const near = nearestFraction(cups, SIMPLE)
  if (Math.abs(near - cups) / cups <= SPOON_TOLERANCE) {
    return [{ unit: 'cup', value: near }]
  }
  const base = floorFraction(cups, SIMPLE)
  const spoons = Math.round((cups - base) * spoonsPerCup * 2) / 2
  if (base === 0) return [{ unit: 'tbsp', value: Math.max(0.5, spoons) }]
  if (spoons === 0 || spoons >= spoonsPerCup / 4) {
    return [{ unit: 'cup', value: near }]
  }
  return [
    { unit: 'cup', value: base },
    { unit: 'tbsp', value: spoons },
  ]
}

// Tablespoons in halves, or the half below plus teaspoons when that is more
// than 6% off: 2¼ tbsp → 2 tbsp + ¾ tsp.
export function tablespoonsWithTeaspoons(tbsp: number): Measure {
  const near = nearestFraction(tbsp, HALVES)
  if (Math.abs(near - tbsp) / tbsp <= SPOON_TOLERANCE) {
    return [{ unit: 'tbsp', value: near }]
  }
  const base = floorFraction(tbsp, HALVES)
  const tsp = nearestFraction((tbsp - base) * 3, TEASPOON)
  if (base === 0) return [{ unit: 'tsp', value: tsp }]
  return [
    { unit: 'tbsp', value: base },
    { unit: 'tsp', value: tsp },
  ]
}

// Grams to 1 g below 20 g, 5 g below 250 g and 10 g below a kilo, then
// kilograms with one decimal: 1 oz → 30 g, 8 oz → 225 g, 1 lb → 450 g.
export function metricWeight(g: Value): Measure {
  const grams = (n: number) =>
    n < 20
      ? Math.max(1, Math.round(n))
      : n < 250
        ? roundTo(n, 5)
        : roundTo(n, 10)
  if (maxOf(mapValue(g, grams)) >= 1000) {
    return [{ unit: 'kg', value: mapValue(g, (n) => oneDecimal(n / 1000)) }]
  }
  return [{ unit: 'g', value: mapValue(g, grams) }]
}

// Ounces below 2 lb (eighths and quarters below 1 oz, halves below 4 oz,
// whole above),
// then pounds in quarters: 500 g → 18 oz, 1 kg → 2¼ lb.
export function usWeight(g: Value): Measure {
  const ounces = (n: number) => {
    const oz = n / OUNCE
    if (oz < 1) return nearestFraction(oz, TEASPOON)
    if (oz < 4) return nearestFraction(oz, HALVES)
    return Math.max(1, Math.round(oz))
  }
  if (maxOf(mapValue(g, ounces)) >= 32) {
    return [
      {
        unit: 'lb',
        value: mapValue(g, (n) => nearestFraction(n / POUND, QUARTERS)),
      },
    ]
  }
  return [{ unit: 'oz', value: mapValue(g, ounces) }]
}

// Small lengths take the sizes recipes use (½ in ↔ 1 cm, ¼ in ↔ 5 mm, 1 in
// ↔ 2,5 cm); from 5 cm up, whole centimetres.
const SMALL_LENGTHS = [2, 3, 5, 10, 20, 25, 30, 40, 50]

function roundMillimetres(mm: number): number {
  if (mm > 50) return roundTo(mm, 10)
  let best = SMALL_LENGTHS[0]
  for (const size of SMALL_LENGTHS) {
    if (Math.abs(Math.log(size / mm)) < Math.abs(Math.log(best / mm))) {
      best = size
    }
  }
  return best
}

function roundInches(inches: number): number {
  if (inches < 0.25) return nearestFraction(inches, [0, 1 / 8, 1 / 4])
  return nearestFraction(inches, inches < 2 ? INCHES : HALVES)
}

// Lengths in millimetres below a centimetre, otherwise centimetres. Every
// value of a size takes the same unit: 9 × 13 in → 23 × 33 cm.
export function metricLengths(mm: ReadonlyArray<Value>): {
  values: Array<Value>
  unit: 'mm' | 'cm'
} {
  const rounded = mm.map((v) => mapValue(v, roundMillimetres))
  const unit = Math.max(...rounded.map(maxOf)) >= 10 ? 'cm' : 'mm'
  return {
    unit,
    values:
      unit === 'cm' ? rounded.map((v) => mapValue(v, (n) => n / 10)) : rounded,
  }
}

// Inches in eighths below ¼ in, quarters below 2 in, halves above.
export function usLengths(mm: ReadonlyArray<Value>): Array<Value> {
  return mm.map((v) => mapValue(v, (n) => roundInches(n / INCH)))
}

// Oven temperatures, from 120 °C (250 °F) up, follow the usual tables in
// steps of 25 °F and 10 °C: 180 °C ↔ 350 °F, 220 °C ↔ 425 °F. Lower ones
// are kept close: 5 °F and 1 °C steps, 165 °F → 74 °C. Either way the
// table starts where the temperature reaches 120 °C, so a hotter oven never
// reads cooler: 249 °F is 120.6 °C, and reads 120 °C like 250 °F.
export function toFahrenheit(celsius: number): number {
  const f = (celsius * 9) / 5 + 32
  return celsius >= 120 ? roundTo(f, 25) : roundTo(f, 5)
}

export function toCelsius(fahrenheit: number): number {
  const c = ((fahrenheit - 32) * 5) / 9
  return c >= 120 ? roundTo(c, 10) : Math.round(c)
}
