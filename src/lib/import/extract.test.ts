import { describe, expect, it } from 'vitest'
import { extractRecipe } from '@/lib/import/extract'
import { clean, readMinutes } from '@/lib/import/recipe'

// The pages here are built around real strings from the corpus (the URL
// says whose). The markup around them follows the forms the corpus sites
// publish: a script of their own, a @graph with references, and microdata.
// Site names are placeholders.

const page = (head: string, body = '', lang = 'fi') =>
  `<!doctype html><html lang="${lang}"><head>${head}</head><body>${body}</body></html>`

const jsonLd = (data: unknown, type = 'application/ld+json') =>
  `<script type="${type}">${JSON.stringify(data)}</script>`

describe('extractRecipe', () => {
  it('reads a Recipe in a script of its own', () => {
    const url = 'https://kotiliesi.fi/resepti/etikkasilakat/'
    const html = page(
      jsonLd({
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        name: 'Etikkasilakat',
        recipeIngredient: [
          '8  silakkafileetä',
          '  korppujauhoja',
          '  suolaa, pippuria',
          '1  sipuli',
          '2 rkl voita',
          '  Etikkaliemi:',
          '1 dl etikkaa',
          '2 dl sokeria',
          '3 dl vettä',
        ],
      }) + '<meta property="og:site_name" content="Kotiliesi">',
    )
    expect(extractRecipe(html, url)).toEqual({
      title: 'Etikkasilakat',
      language: 'fi',
      measuringSystem: 'metric',
      servings: null,
      prepMinutes: null,
      cookMinutes: null,
      totalMinutes: null,
      ingredients: [
        {
          heading: null,
          lines: [
            '8 silakkafileetä',
            'korppujauhoja',
            'suolaa, pippuria',
            '1 sipuli',
            '2 rkl voita',
            'Etikkaliemi:',
            '1 dl etikkaa',
            '2 dl sokeria',
            '3 dl vettä',
          ],
        },
      ],
      steps: [],
      sourceName: 'Kotiliesi',
      sourceUrl: url,
    })
  })

  it('follows references in a @graph and reads step sections', () => {
    const url = 'https://www.recipetineats.com/baked-pumpkin-risotto/'
    const html = page(
      jsonLd({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': 'https://www.recipetineats.com/#organization',
            name: 'RecipeTin Eats',
          },
          {
            '@type': 'Recipe',
            name: 'Baked Creamy Pumpkin Risotto',
            publisher: { '@id': 'https://www.recipetineats.com/#organization' },
            recipeYield: ['5', '5 - 6 people'],
            recipeIngredient: [
              '3 tbsp / 50 g  unsalted butter (, divided)',
              'Salt &amp; pepper',
            ],
            recipeInstructions: [
              {
                '@type': 'HowToSection',
                name: 'Risotto',
                itemListElement: [
                  { '@type': 'HowToStep', text: 'Preheat oven to 180C/350F.' },
                  {
                    '@type': 'HowToStep',
                    text: 'Melt 1 tbsp / 20g butter in ovenproof pot (preferably with a lid) over medium high heat.',
                  },
                ],
              },
            ],
          },
        ],
      }) + `<link rel="canonical" href="${url}">`,
      '',
      'en-US',
    )
    expect(extractRecipe(html, `${url}?utm_source=share`)).toMatchObject({
      title: 'Baked Creamy Pumpkin Risotto',
      language: 'en',
      measuringSystem: 'australian',
      servings: '5 - 6 people',
      ingredients: [
        {
          heading: null,
          lines: ['3 tbsp / 50 g unsalted butter (, divided)', 'Salt & pepper'],
        },
      ],
      steps: [
        {
          heading: 'Risotto',
          lines: [
            'Preheat oven to 180C/350F.',
            'Melt 1 tbsp / 20g butter in ovenproof pot (preferably with a lid) over medium high heat.',
          ],
        },
      ],
      sourceName: 'RecipeTin Eats',
      sourceUrl: url,
    })
  })

  it('reads a Recipe whose @type is a list, inside another item', () => {
    const url =
      'https://www.kingarthurbaking.com/recipes/baked-doughnuts-three-ways-recipe'
    const html = page(
      jsonLd({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        mainEntity: {
          '@type': ['Recipe'],
          name: 'Baked Doughnuts Three Ways',
          recipeYield: ['12', '12 doughnuts'],
          recipeIngredient: ['4 tablespoons (57g) butter'],
          recipeInstructions:
            'Preheat the oven to 375°F with a rack in the top third.\n' +
            'Spoon the batter into the lightly greased doughnut pans, filling the wells to about 1/4&quot; shy of the rim.',
        },
      }),
      '',
      'en',
    )
    expect(extractRecipe(html, url)).toMatchObject({
      measuringSystem: 'us',
      servings: '12 doughnuts',
      steps: [
        {
          heading: null,
          lines: [
            'Preheat the oven to 375°F with a rack in the top third.',
            'Spoon the batter into the lightly greased doughnut pans, filling the wells to about 1/4" shy of the rim.',
          ],
        },
      ],
    })
  })

  it('reads a script typed as application/ld&#x2B;json, as arla.fi writes it', () => {
    const html = page(
      jsonLd(
        {
          '@type': 'Recipe',
          name: 'Banaanismoothie maapähkinävoin kera ',
          recipeIngredient: ['2 banaania', '4 dl Arla® Kevytmaitoa'],
        },
        'application/ld&#x2B;json',
      ),
    )
    expect(
      extractRecipe(
        html,
        'https://www.arla.fi/reseptit/banaanismoothie-maapahkinavoin-kera/',
      ),
    ).toMatchObject({ title: 'Banaanismoothie maapähkinävoin kera' })
  })

  it('reads JSON-LD missing a comma at a line break', () => {
    const html = page(
      `<script type="application/ld+json">{
        "@type": "Recipe",
        "name": "Mangosorbetti"
        "recipeIngredient": ["5dl Bonne Mangososetta", "5g ksantaania"]
      }</script>`,
    )
    expect(
      extractRecipe(
        html,
        'https://www.kotikokki.net/kumppanit/bonne/reseptit/nayta/884419/Mangosorbetti/',
      ),
    ).toMatchObject({
      title: 'Mangosorbetti',
      ingredients: [{ lines: ['5dl Bonne Mangososetta', '5g ksantaania'] }],
    })
  })

  // The step is from https://www.valio.fi/reseptit/baskimaan-juustokakku/.
  it('reads microdata', () => {
    const html = page(
      '',
      `<article itemscope itemtype="https://schema.org/Recipe">
        <h1 itemprop="name">Ananas-rahkajuoma</h1>
        <meta itemprop="recipeYield" content="1, 1 l">
        <ul>
          <li itemprop="recipeIngredient">250 g Valio maitorahkaa</li>
          <li itemprop="recipeIngredient">3 dl Valio ananastäysmehua</li>
        </ul>
        <ol>
          <li itemprop="recipeInstructions" itemscope itemtype="https://schema.org/HowToStep">
            <span itemprop="text">Kaada taikina vuokaan leivinpaperin päälle ja paista 200-asteisessa uunissa 1 h 15 min. tai kunnes kakun pinta on tummanruskea.</span>
          </li>
        </ol>
      </article>`,
    )
    expect(
      extractRecipe(html, 'https://www.valio.fi/reseptit/ananas-rahkajuoma/'),
    ).toMatchObject({
      title: 'Ananas-rahkajuoma',
      servings: '1, 1 l',
      ingredients: [
        {
          lines: ['250 g Valio maitorahkaa', '3 dl Valio ananastäysmehua'],
        },
      ],
      steps: [
        {
          lines: [
            'Kaada taikina vuokaan leivinpaperin päälle ja paista 200-asteisessa uunissa 1 h 15 min. tai kunnes kakun pinta on tummanruskea.',
          ],
        },
      ],
    })
  })

  // HTML source wraps long text over several lines. Only the page's own
  // breaks, such as paragraphs, split it.
  it('reads microdata written over several lines', () => {
    const html = page(
      '',
      `<article itemscope itemtype="https://schema.org/Recipe">
        <h1 itemprop="name">
          Gluteeniton kesäkurpitsa-juustoleipä
        </h1>
        <ul>
          <li itemprop="recipeIngredient">
            175 g
            kesäkurpitsaa raastettuna
          </li>
        </ul>
        <div itemprop="recipeInstructions">
          <p>Kaada taikina voideltuun, suorakaiteen muotoiseen 1,5 litran
            vetoiseen leipävuokaan.</p>
          <p>Paista 175 asteessa uunin alatasolla n. 40 min tai kunnes
            kypsä.</p>
        </div>
      </article>`,
    )
    expect(
      extractRecipe(
        html,
        'https://www.valio.fi/reseptit/gluteeniton-kesakurpitsa-juustoleipa/',
      ),
    ).toMatchObject({
      title: 'Gluteeniton kesäkurpitsa-juustoleipä',
      ingredients: [{ lines: ['175 g kesäkurpitsaa raastettuna'] }],
      steps: [
        {
          lines: [
            'Kaada taikina voideltuun, suorakaiteen muotoiseen 1,5 litran vetoiseen leipävuokaan.',
            'Paista 175 asteessa uunin alatasolla n. 40 min tai kunnes kypsä.',
          ],
        },
      ],
    })
  })

  it('finds no recipe on a page without one', () => {
    expect(
      extractRecipe(page('<title>Valio</title>'), 'https://www.valio.fi/'),
    ).toBeNull()
  })

  it('finds no recipe in a Recipe without ingredients or steps', () => {
    const html = page(jsonLd({ '@type': 'Recipe', name: 'Ananas-rahkajuoma' }))
    expect(
      extractRecipe(html, 'https://www.valio.fi/reseptit/ananas-rahkajuoma/'),
    ).toBeNull()
  })
})

describe('clean', () => {
  it.each([
    ['Salt &amp; pepper', 'Salt & pepper'],
    [
      '10+  miniature Reece&#39;s Peanut Butter Cups (, halved)',
      "10+ miniature Reece's Peanut Butter Cups (, halved)",
    ],
    ['<p>Preheat oven to 180C/350F.</p>', 'Preheat oven to 180C/350F.'],
  ])('reads %j as %j', (text, cleaned) => {
    expect(clean(text)).toBe(cleaned)
  })
})

describe('readMinutes', () => {
  it.each([
    ['PT30M', 30],
    ['PT1H30M', 90],
    ['P0DT0H45M', 45],
    ['PT0.5H', 30],
    ['PT0M', null],
    ['30 min', null],
  ])('reads %s as %s minutes', (duration, minutes) => {
    expect(readMinutes([duration])).toBe(minutes)
  })
})
