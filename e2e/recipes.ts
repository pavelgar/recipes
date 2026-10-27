// Real recipes from the development corpus (corpus/AGENTS.md), for tests
// that need one. The corpus keeps only the step sentences that mention an
// amount or a temperature, so these steps are those sentences.

// https://www.valio.fi/reseptit/tomaattinen-peltileipa/
export const PELTILEIPA = {
  title: 'Tomaattinen peltileipä',
  servings: '1 uunipellillinen',
  ingredients: [
    '5 dl Valio maitoa',
    '1 pussi (11 g) kuivahiivaa',
    '1 rkl sokeria',
    '2 tl suolaa',
    '1 dl punaista pestoa',
    '11 dl vehnäjauhoja',
    '2-3 rkl Valio Oivariini® juoksevaa',
  ],
  steps: [
    'Lämmitä maito 42-asteiseksi.',
    'Painele taikina ohueksi (1- 1 ½ cm) levyksi leivinpaperilla vuoratulle pellille.',
    'Paista uunin keskiosassa 200 asteessa n. 15 min.',
  ],
}

// The same recipe as someone could paste it from a message: a dash before
// each ingredient, and two steps run together as a page can publish them.
export const PELTILEIPA_PASTED = [
  PELTILEIPA.title,
  PELTILEIPA.servings,
  ...PELTILEIPA.ingredients.map((line) => `- ${line}`),
  `${PELTILEIPA.steps[0]}${PELTILEIPA.steps[1]}`,
  PELTILEIPA.steps[2],
].join('\n')
