import { describe, expect, it } from 'vitest'
import { formatDimensions, formatMeasure } from '@/lib/quantities/format'
import {
  metricLengths,
  metricVolume,
  metricWeight,
  toCelsius,
  toFahrenheit,
  usLengths,
  usVolume,
  usWeight,
} from '@/lib/quantities/kitchen'
import type { Value } from '@/lib/quantities/numbers'

// The rounding rules, value by value. Whole recipe lines are tested in
// present.test.ts.

const US_CUP = 236.588
const metric = (ml: Value) => formatMeasure(metricVolume(ml), 'fi')
const us = (ml: Value) => formatMeasure(usVolume(ml, true), 'en')

describe('metric volumes', () => {
  it.each([
    [0.25, '0,6 dl'],
    [1 / 3, '0,8 dl'],
    [0.5, '1,2 dl'],
    [0.75, '1,8 dl'],
    [1, '2,4 dl'],
    [1.5, '3,5 dl'],
    [2, '4,7 dl'],
    [4, '9,5 dl'],
    [5, '1,2 l'],
  ])('%s US cups → %s', (cups, expected) => {
    expect(metric(cups * US_CUP)).toBe(expected)
  })

  it('stays in decilitres below half a decilitre', () => {
    expect(metric(29.57)).toBe('0,3 dl')
  })
})

describe('US volumes', () => {
  // The table approved for "add tablespoons when a simple fraction is off".
  it.each([
    [50, '3½ tbsp'],
    [100, '⅓ cup + 1½ tbsp'],
    [150, '⅔ cup'],
    [200, '¾ cup + 1½ tbsp'],
    [250, '1 cup'],
    [300, '1¼ cups'],
    [400, '1⅔ cups'],
    [500, '2 cups'],
  ])('%s ml → %s', (ml, expected) => {
    expect(us(ml)).toBe(expected)
  })

  it('uses teaspoons below a tablespoon', () => {
    expect(us(1)).toBe('¼ tsp')
    expect(us(10)).toBe('2 tsp')
  })

  it('uses quarts from 8 cups in English only', () => {
    expect(us(2000)).toBe('2 quarts')
    expect(formatMeasure(usVolume(2000, false), 'fi')).toBe('8½ kuppia')
  })

  it('keeps a range in one unit', () => {
    expect(us({ min: 300, max: 400 })).toBe('1¼–1⅔ cups')
  })
})

describe('weights', () => {
  it.each([
    [28.35, '30 g'],
    [7.09, '7 g'],
    [113.4, '115 g'],
    [226.8, '225 g'],
    [453.6, '450 g'],
    [907.2, '910 g'],
    [1134, '1,1 kg'],
  ])('%s g → %s', (g, expected) => {
    expect(formatMeasure(metricWeight(g), 'fi')).toBe(expected)
  })

  it.each([
    [7, '¼ oz'],
    [50, '2 oz'],
    [75, '2½ oz'],
    [200, '7 oz'],
    [500, '18 oz'],
    [900, '2 lb'],
    [1000, '2¼ lb'],
  ])('%s g → %s', (g, expected) => {
    expect(formatMeasure(usWeight(g), 'en')).toBe(expected)
  })
})

describe('lengths', () => {
  const toMetric = (inches: Array<number>) => {
    const { values, unit } = metricLengths(inches.map((n) => n * 25.4))
    return formatDimensions(values, unit, 'fi')
  }
  const toUs = (mm: Array<number>) =>
    formatDimensions(usLengths(mm), 'in', 'en')

  it.each([
    [[1 / 8], '3 mm'],
    [[1 / 4], '5 mm'],
    [[1 / 2], '1 cm'],
    [[3 / 4], '2 cm'],
    [[1], '2,5 cm'],
    [[1.5], '4 cm'],
    [[9, 13], '23 × 33 cm'],
  ])('%j in → %s', (inches, expected) => {
    expect(toMetric(inches)).toBe(expected)
  })

  it.each([
    [[2], '⅛ in'],
    [[5], '¼ in'],
    [[10], '½ in'],
    [[50, 40], '2 × 1½ in'],
    [[230, 330], '9 × 13 in'],
  ])('%j mm → %s', (mm, expected) => {
    expect(toUs(mm)).toBe(expected)
  })
})

describe('temperatures', () => {
  // The usual oven tables.
  it.each([
    [120, 250],
    [150, 300],
    [160, 325],
    [175, 350],
    [180, 350],
    [190, 375],
    [200, 400],
    [220, 425],
    [230, 450],
  ])('%s °C → %s °F', (c, f) => {
    expect(toFahrenheit(c)).toBe(f)
  })

  it.each([
    [250, 120],
    [300, 150],
    [325, 160],
    [350, 180],
    [375, 190],
    [400, 200],
    [425, 220],
    [450, 230],
  ])('%s °F → %s °C', (f, c) => {
    expect(toCelsius(f)).toBe(c)
  })

  it('keeps lower temperatures close', () => {
    expect(toCelsius(165)).toBe(74)
    expect(toCelsius(110)).toBe(43)
    expect(toFahrenheit(40)).toBe(105)
    expect(toFahrenheit(63)).toBe(145)
  })
})
