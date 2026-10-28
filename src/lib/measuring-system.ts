import { UNKNOWN_LANGUAGE } from '@/lib/languages'
import type { RecipeLanguage } from '@/lib/languages'
import type { MeasuringSystem } from '@/lib/quantities'

// Sites whose domain doesn't say their country: the corpus sites
// (tests/corpus/ingredients), and the British sites on .com that imported in a
// survey of recipe sites. None of those says en-GB in its pages, so only
// the domain tells.
const SITE_SYSTEMS: ReadonlyArray<readonly [string, MeasuringSystem]> = [
  ['bbcgoodfood.com', 'british'],
  ['goodto.com', 'british'],
  ['greatbritishchefs.com', 'british'],
  ['hairybikers.com', 'british'],
  ['jamieoliver.com', 'british'],
  ['nigella.com', 'british'],
  ['olivemagazine.com', 'british'],
  ['recipetineats.com', 'australian'],
  ['theguardian.com', 'british'],
]

// The regions whose cup and spoon sizes the app knows apart from metric.
const REGION_SYSTEMS: Readonly<Partial<Record<string, MeasuringSystem>>> = {
  US: 'us',
  GB: 'british',
  AU: 'australian',
}

// How a recipe's units read until someone says otherwise, guessed from the
// site it was published on ("valio.fi"): a Finnish site writes metric, an
// Australian site's tablespoon holds 20 ml. Then from the region its page
// states with its language: "en-GB" is British, "en-AU" Australian, and a
// region with measures the app doesn't tell apart from metric is metric
// ("en-NZ"). The site comes first, since a British blog on WordPress can
// still state WordPress's default, "en-US". Other recipes, and typed ones,
// go by their language: the measures of the region it is most likely
// written in, by CLDR's likely subtags, which the platform carries.
// English is the US's, Scots Britain's, Swedish Sweden's, so US, British
// and metric. Metric for a language nothing is known about.
export function guessMeasuringSystem(
  site: string | null,
  language: RecipeLanguage,
  region: string | null = null,
): MeasuringSystem {
  if (site !== null) {
    const on = (name: string) => site === name || site.endsWith(`.${name}`)
    const known = SITE_SYSTEMS.find(([name]) => on(name))
    if (known) return known[1]
    if (site.endsWith('.fi')) return 'metric'
    if (site.endsWith('.au')) return 'australian'
    if (site.endsWith('.uk')) return 'british'
  }
  if (language === UNKNOWN_LANGUAGE) return 'metric'
  try {
    const likely = new Intl.Locale(language, region ? { region } : {})
    const { region: found } = likely.maximize()
    return (found ? REGION_SYSTEMS[found] : undefined) ?? 'metric'
  } catch {
    return 'metric'
  }
}
