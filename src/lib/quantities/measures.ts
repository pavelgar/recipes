import type { MeasuringSystem } from '@/lib/quantities/scan'
import type { Unit, UnitId } from '@/lib/quantities/units'

// How big each measure is, and which measures a display reads as they are.
// See DESIGN.md, "Units".

// The unit system a device shows quantities in. The imperial display uses
// US measures.
export type DisplaySystem = 'metric' | 'us'

// What a measure is counted in: millilitres, grams or millimetres.
export type Dimension = 'volume' | 'weight' | 'length'

type Size = number | Readonly<Record<MeasuringSystem, number>>

// Spoons, cups and the imperial volumes depend on the recipe's measuring
// system. British measures: cup 250 ml, tablespoon 15 ml, pint 568 ml.
// Australian tablespoon 20 ml, cup 250 ml. A metric recipe reads cups as
// 250 ml and pints the British way.
const imperial = (us: number, other: number) => ({
  us,
  british: other,
  australian: other,
  metric: other,
})

const SIZES: Partial<Record<UnitId, Size>> = {
  ml: 1,
  cl: 10,
  dl: 100,
  l: 1000,
  maustemitta: 1,
  tsp: imperial(4.92892, 5),
  tbsp: { us: 14.7868, british: 15, australian: 20, metric: 15 },
  cup: imperial(236.588, 250),
  'fl-oz': imperial(29.5735, 28.4131),
  pint: imperial(473.176, 568.261),
  quart: imperial(946.353, 1136.52),
  gallon: imperial(3785.41, 4546.09),
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
  mm: 1,
  cm: 10,
  in: 25.4,
}

// The size of one unit in millilitres, grams or millimetres, as the recipe's
// measuring system reads it. Null for packages, counts and pinches.
export function sizeOf(unit: Unit, system: MeasuringSystem): number | null {
  const size = SIZES[unit.id]
  if (size === undefined) return null
  return typeof size === 'number' ? size : size[system]
}

export function dimensionOf(unit: Unit): Dimension | null {
  return unit.kind === 'volume' ||
    unit.kind === 'weight' ||
    unit.kind === 'length'
    ? unit.kind
    : null
}

const METRIC = new Set<UnitId>([
  'ml',
  'cl',
  'dl',
  'l',
  'maustemitta',
  'g',
  'kg',
  'mm',
  'cm',
])
// US volumes read as written only in a US recipe; ounces, pounds and inches
// are the same everywhere.
const US_VOLUMES = new Set<UnitId>(['cup', 'fl-oz', 'pint', 'quart', 'gallon'])
const US_OTHER = new Set<UnitId>(['oz', 'lb', 'in'])

// Australian tablespoons convert by volume, into teaspoons: 1 tbsp = 4 tl.
export const AUSTRALIAN_TABLESPOON_IN_TEASPOONS = 4

export function isAustralianTablespoon(
  unit: Unit,
  system: MeasuringSystem,
): boolean {
  return unit.id === 'tbsp' && system === 'australian'
}

// Whether a measure reads as written in the display system, so it isn't
// converted. Spoons map one-to-one (rkl = tbsp, tl = tsp) in both, except
// Australian tablespoons.
export function readsAsWritten(
  unit: Unit,
  system: MeasuringSystem,
  display: DisplaySystem,
): boolean {
  if (unit.id === 'tsp' || unit.id === 'tbsp') {
    return !isAustralianTablespoon(unit, system)
  }
  if (display === 'metric') return METRIC.has(unit.id)
  return US_OTHER.has(unit.id) || (US_VOLUMES.has(unit.id) && system === 'us')
}

// The temperature scale a display shows.
export function scaleOf(display: DisplaySystem): 'C' | 'F' {
  return display === 'metric' ? 'C' : 'F'
}
