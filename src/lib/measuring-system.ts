import type { Language, MeasuringSystem } from '@/lib/quantities'

// The corpus sites (corpus/ingredients) whose domain doesn't say their
// country.
const SITE_SYSTEMS: ReadonlyArray<readonly [string, MeasuringSystem]> = [
  ['bbcgoodfood.com', 'british'],
  ['recipetineats.com', 'australian'],
]

// How a recipe's units read until someone says otherwise, guessed from the
// site it was published on ("valio.fi"): a Finnish site writes metric, an
// Australian site's tablespoon holds 20 ml. Other recipes, and typed ones,
// which have no site, go by their language: US measures in English, metric
// in Finnish.
export function guessMeasuringSystem(
  site: string | null,
  language: Language,
): MeasuringSystem {
  if (site !== null) {
    const on = (name: string) => site === name || site.endsWith(`.${name}`)
    const known = SITE_SYSTEMS.find(([name]) => on(name))
    if (known) return known[1]
    if (site.endsWith('.fi')) return 'metric'
    if (site.endsWith('.au')) return 'australian'
    if (site.endsWith('.uk')) return 'british'
  }
  return language === 'fi' ? 'metric' : 'us'
}
