import { describe, expect, it } from 'vitest'
import { extractRecipe } from '@/core/import/extract.server'
import { clean, readMinutes } from '@/core/import/recipe.server'
import { UNKNOWN_LANGUAGE } from '@/core/languages'

// The pages here are built around real strings from published pages,
// most of them in the corpus (the URL says whose). The markup around them follows the forms the corpus sites
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
      imageUrl: null,
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

  // The importer doesn't guess where a site's steps, sentences and
  // headings start and end, so mistakes in them come as published, to fix
  // in the editor: jalotofu.fi runs its section headings onto the ends of
  // steps, myllynparas.fi cuts its sentences at commas and runs steps
  // together ("sekaan.Kiehauta"), and halfbakedharvest.com leaves out the
  // space after a step's number ("2.In"). Each method is cut to its first
  // steps.
  it.each([
    [
      'https://jalotofu.fi/reseptit/rapeat-tofupalat-korean-fried-tofu-kft/',
      'Valmista pikkelöity kaali-porkkanasalaatti:\n\nViipaloi kaalit sekä porkkana esim. mandoliinilla ohueksi suikaleeksi ja siirrä kulhoon, lisää loput ainekset, sekoita ja anna maustua 30 min välillä sekoittaen. Paista tofut:\n\nAvaa tofut, valuta ja revi käsin varovasti paloiksi.',
      [
        'Valmista pikkelöity kaali-porkkanasalaatti:',
        'Viipaloi kaalit sekä porkkana esim. mandoliinilla ohueksi suikaleeksi ja siirrä kulhoon, lisää loput ainekset, sekoita ja anna maustua 30 min välillä sekoittaen. Paista tofut:',
        'Avaa tofut, valuta ja revi käsin varovasti paloiksi.',
      ],
    ],
    [
      'https://www.myllynparas.fi/reseptit/kuorrutettu-kinkkupaistos',
      [
        'Keitä Raketti Spagettia lihaliemessä 6 min pakkauksen ohjeen mukaan ja valuta lihaliemi talteen siivilän läpi. Älä huuhdo. Kaada Raketti Spagetti teflon-uunivuokaan. Sekoita palvikinkkusuikaleet',
        'sienet ja purjorenkaat sekä mausteet pastan sekaan.Kiehauta kastiketta varten kattilassa voissa vehnäjauho',
      ].map((text) => ({ '@type': 'HowToStep', text })),
      [
        'Keitä Raketti Spagettia lihaliemessä 6 min pakkauksen ohjeen mukaan ja valuta lihaliemi talteen siivilän läpi. Älä huuhdo. Kaada Raketti Spagetti teflon-uunivuokaan. Sekoita palvikinkkusuikaleet',
        'sienet ja purjorenkaat sekä mausteet pastan sekaan.Kiehauta kastiketta varten kattilassa voissa vehnäjauho',
      ],
    ],
    [
      'https://www.halfbakedharvest.com/buffalo-chicken-strombolis/',
      '1. Preheat the oven to 450° F. Line a baking sheet with parchment paper. 2.In a bowl, combine the chicken, buffalo sauce, cilantro, chives, and jalapeño.',
      [
        'Preheat the oven to 450° F. Line a baking sheet with parchment paper. 2.In a bowl, combine the chicken, buffalo sauce, cilantro, chives, and jalapeño.',
      ],
    ],
  ])('takes the steps of %s as published', (url, instructions, steps) => {
    const html = page(
      jsonLd({ '@type': 'Recipe', recipeInstructions: instructions }),
    )
    expect(extractRecipe(html, url)).toMatchObject({
      steps: [{ heading: null, lines: steps }],
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

  it('reads steps broken by carriage returns alone', () => {
    // https://www.meillakotona.fi/reseptit/mansikkavuokakakku-tassa-on-kesan-nopein-mansikkakakku
    const html = page(
      jsonLd({
        '@type': 'Recipe',
        name: 'Mansikkavuokakakku',
        recipeIngredient: ['3 munaa', '1½ dl sokeria'],
        recipeInstructions:
          'Vatkaa munat ja sokeri paksuksi, vaaleaksi vaahdoksi. \rYhdistä kuivat aineet ja lisää vaahtoon varovasti sekoittaen.\r\nKumoa pohja sokeroidulle leivinpaperille.',
      }),
    )
    expect(
      extractRecipe(html, 'https://www.meillakotona.fi/reseptit/x')?.steps,
    ).toEqual([
      {
        heading: null,
        lines: [
          'Vatkaa munat ja sokeri paksuksi, vaaleaksi vaahdoksi.',
          'Yhdistä kuivat aineet ja lisää vaahtoon varovasti sekoittaen.',
          'Kumoa pohja sokeroidulle leivinpaperille.',
        ],
      },
    ])
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

  // jalotofu.fi's rating plugin writes a Recipe of its own, with only a
  // name and a rating, before the full one.
  it('reads the first Recipe that holds a recipe', () => {
    const url =
      'https://jalotofu.fi/reseptit/rapeat-tofupalat-korean-fried-tofu-kft/'
    const name = 'RAPEAT TOFUPALAT | KOREAN FRIED TOFU (KFT)'
    const html = page(
      jsonLd({
        '@context': 'https://schema.org/',
        '@type': 'Recipe',
        name,
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '5',
          bestRating: '5',
          ratingCount: '3',
        },
      }) +
        jsonLd({
          '@context': 'http://schema.org',
          '@type': 'Recipe',
          name,
          recipeIngredient: [
            '2 kpl Jalotofu Aasia 300g',
            'rypsiöljyä paistamiseen',
            '3 dl kauramaitoa',
          ],
        }),
    )
    expect(extractRecipe(html, url)).toMatchObject({
      title: name,
      ingredients: [
        {
          lines: [
            '2 kpl Jalotofu Aasia 300g',
            'rypsiöljyä paistamiseen',
            '3 dl kauramaitoa',
          ],
        },
      ],
    })
  })

  it('reads the first microdata Recipe that holds a recipe', () => {
    const html = page(
      '',
      `<div itemscope itemtype="https://schema.org/Recipe">
        <span itemprop="name">Ananas-rahkajuoma</span>
      </div>
      <article itemscope itemtype="https://schema.org/Recipe">
        <h1 itemprop="name">Ananas-rahkajuoma</h1>
        <ul>
          <li itemprop="recipeIngredient">250 g Valio maitorahkaa</li>
          <li itemprop="recipeIngredient">3 dl Valio ananastäysmehua</li>
        </ul>
      </article>`,
    )
    expect(
      extractRecipe(html, 'https://www.valio.fi/reseptit/ananas-rahkajuoma/'),
    ).toMatchObject({
      ingredients: [
        {
          lines: ['250 g Valio maitorahkaa', '3 dl Valio ananastäysmehua'],
        },
      ],
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
      // Valio writes the yield's number twice, and it's read once.
      servings: '1 l',
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

  // A British recipe on .com, whose page says lang="en-GB". Its ingredients
  // are cut to the first two, its steps to the first.
  it('reads the measures of the region a page states', () => {
    const html = page(
      jsonLd({
        '@type': 'Recipe',
        name: 'Easy sweet potato and cod traybake recipe',
        recipeIngredient: ['2 tbsp. vegetable oil', '1 tsp. mustard seeds'],
        recipeInstructions: [
          {
            '@type': 'HowToStep',
            text: '<strong></strong>Preheat oven to 200°C (180°C fan) mark 6. In a small bowl, mix the oil, spices, curry paste and plenty of seasoning.',
          },
        ],
      }),
      '',
      'en-GB',
    )
    expect(
      extractRecipe(
        html,
        'https://www.goodhousekeeping.com/uk/food/recipes/a26144717/sweet-potato-cod-traybake/',
      ),
    ).toMatchObject({ language: 'en', measuringSystem: 'british' })
  })

  // kinuskikissa.fi gives its Finnish recipes lang="en".
  it('reads the language the recipe is written in', () => {
    const html = page(
      jsonLd({
        '@context': 'https://schema.org/',
        '@type': 'Recipe',
        name: 'Kaneliässät',
        recipeIngredient: [
          '200 g voita ',
          '2 dl sokeria ',
          '2  pientä munaa ',
          '4.5 dl vehnäjauhoja ',
          '2 tl vaniljasokeria ',
          '1 tl kanelia ',
          '1 tl leivinjauhetta ',
          '0.5 dl  hienoa (ruoko)sokeria',
          '2 tl kanelia ',
          '1 tl vaniljasokeria ',
        ],
        recipeInstructions: [
          'TAIKINA. Vatkaa voi ja sokeri vaahdoksi. Sekoita munat joukkoon yksitellen vaahtoon vatkaten.',
          'Yhdistä kuivat aineet keskenään ja lisää taikinaan.',
          'Nosta taikina jääkaappiin jähmettymään pariksi tunniksi.',
          'Jaa taikina osiin ja kierittele taikinapaloista jauhoja apuna käyttäen sormen paksuisia tankoja.',
          'Leikkaa tangot noin 8 cm:n pätkiksi.',
          'PINNALLE. Yhdistä (ruoko)sokeriin kaneli ja vaniljasokeri.',
          'Rullaa tankoja huolellisesti kanelisokerissa. Nosta pellille leivinpaperin päälle ja taivuta S-kirjaimen muotoon.',
          'Paista 200 asteessa noin 10 minuuttia. Anna jäähtyä ja ei kun nauttimaan!  🙂',
        ].map((text) => ({ '@type': 'HowToStep', text })),
      }),
      '',
      'en',
    )
    expect(
      extractRecipe(html, 'https://www.kinuskikissa.fi/kaneliassat/'),
    ).toMatchObject({ language: 'fi' })
  })

  // https://www.arla.se/recept/sockerkaka/, a language the app has no
  // rules for. Its steps are cut to the first two.
  it('keeps the language a page states, rules or not', () => {
    const html = page(
      jsonLd({
        '@type': 'Recipe',
        name: 'Sockerkaka',
        recipeIngredient: [
          '75 g Svenskt Smör från Arla®',
          '1 dl Arla Ko® Standardmjölk',
          '2 ägg',
          '2 dl strösocker',
          '2 tsk vaniljsocker',
          '3 dl vetemjöl',
          '1½ tsk bakpulver',
        ],
        recipeInstructions: [
          'Sätt ugnen på 175° eller 160° varmluft.',
          'Smörj och bröa en form som rymmer ca 1 ½ liter. ',
        ].map((text) => ({ '@type': 'HowToStep', text })),
      }),
      '',
      'sv',
    )
    expect(
      extractRecipe(html, 'https://www.arla.se/recept/sockerkaka/'),
    ).toMatchObject({ language: 'sv', measuringSystem: 'metric' })
  })

  // Pages that state no language, built from the recipes above: franc
  // tells from enough text, and nothing tells from a little.
  it.each([
    [
      'https://www.kinuskikissa.fi/kaneliassat/',
      {
        '@type': 'Recipe',
        name: 'Kaneliässät',
        recipeIngredient: [
          '200 g voita ',
          '2 dl sokeria ',
          '2  pientä munaa ',
          '4.5 dl vehnäjauhoja ',
        ],
        recipeInstructions: [
          'TAIKINA. Vatkaa voi ja sokeri vaahdoksi. Sekoita munat joukkoon yksitellen vaahtoon vatkaten.',
          'Yhdistä kuivat aineet keskenään ja lisää taikinaan.',
          'Nosta taikina jääkaappiin jähmettymään pariksi tunniksi.',
          'Jaa taikina osiin ja kierittele taikinapaloista jauhoja apuna käyttäen sormen paksuisia tankoja.',
          'Leikkaa tangot noin 8 cm:n pätkiksi.',
          'PINNALLE. Yhdistä (ruoko)sokeriin kaneli ja vaniljasokeri.',
          'Rullaa tankoja huolellisesti kanelisokerissa. Nosta pellille leivinpaperin päälle ja taivuta S-kirjaimen muotoon.',
          'Paista 200 asteessa noin 10 minuuttia. Anna jäähtyä ja ei kun nauttimaan!  🙂',
        ],
      },
      'fi',
    ],
    [
      'https://www.arla.se/recept/sockerkaka/',
      {
        '@type': 'Recipe',
        name: 'Sockerkaka',
        recipeIngredient: ['2 ägg', '2 dl strösocker', '3 dl vetemjöl'],
      },
      UNKNOWN_LANGUAGE,
    ],
  ])('reads %s, stating no language, as %j', (url, recipe, language) => {
    const html = `<!doctype html><html><head>${jsonLd(recipe)}</head><body></body></html>`
    expect(extractRecipe(html, url)).toMatchObject({ language })
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

  // olivemagazine.com marks a collection page as a Recipe, with keywords
  // for its one ingredient.
  it('finds no recipe in a Recipe with one ingredient and no steps', () => {
    const html = page(
      jsonLd({
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        name: '57 healthy chicken recipes',
        recipeIngredient:
          'chicken, chicken breasts, chicken thighs, potatoes, spices, peppers, noodles',
      }),
      '',
      'en',
    )
    expect(
      extractRecipe(
        html,
        'https://www.olivemagazine.com/recipes/collection/best-ever-healthy-chicken-recipes/',
      ),
    ).toBeNull()
  })
})

// As the pages published their photos in October 2026.
describe("the recipe's photo", () => {
  const photoOf = (url: string, data: Record<string, unknown>, head = '') =>
    extractRecipe(
      page(
        jsonLd({
          '@context': 'https://schema.org',
          '@type': 'Recipe',
          name: 'Ananas-rahkajuoma',
          recipeIngredient: [
            '250 g Valio maitorahkaa',
            '3 dl Valio ananastäysmehua',
          ],
          ...data,
        }) + head,
      ),
      url,
    )?.imageUrl

  it('reads an address', () => {
    const image =
      'https://images.arla.com/recordid/7668715D-1614-4188-AE6D780EE2280497/banaanismoothie-maapahkinavoin-kera.jpg?width=1300&height=525&mode=crop&crop=(0,97,0,-257)&format=jpg'
    expect(
      photoOf(
        'https://www.arla.fi/reseptit/banaanismoothie-maapahkinavoin-kera/',
        {
          image,
        },
      ),
    ).toBe(image)
  })

  it('reads an ImageObject', () => {
    expect(
      photoOf(
        'https://www.kingarthurbaking.com/recipes/baked-doughnuts-three-ways-recipe',
        {
          image: {
            '@type': 'ImageObject',
            url: 'https://www.kingarthurbaking.com/sites/default/files/recipe_legacy/4037-3-large.jpg',
          },
        },
      ),
    ).toBe(
      'https://www.kingarthurbaking.com/sites/default/files/recipe_legacy/4037-3-large.jpg',
    )
  })

  // WordPress SEO plugins give the page's main image once, in the @graph.
  it('follows a reference to an ImageObject', () => {
    const url = 'https://kotiliesi.fi/resepti/etikkasilakat/'
    const html = page(
      jsonLd({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Recipe',
            '@id': `${url}#recipe`,
            name: 'Etikkasilakat',
            recipeIngredient: ['8  silakkafileetä', '1  sipuli'],
            image: { '@id': `${url}#primaryimage` },
          },
          {
            '@type': 'ImageObject',
            inLanguage: 'fi',
            '@id': `${url}#primaryimage`,
            url: 'https://kotiliesi.fi/wp-content/uploads/reseptit/177691-silakat.jpg',
            contentUrl:
              'https://kotiliesi.fi/wp-content/uploads/reseptit/177691-silakat.jpg',
            width: 2048,
            height: 1536,
          },
        ],
      }),
    )
    expect(extractRecipe(html, url)?.imageUrl).toBe(
      'https://kotiliesi.fi/wp-content/uploads/reseptit/177691-silakat.jpg',
    )
  })

  it('takes the largest stated width', () => {
    expect(
      photoOf('https://www.bbcgoodfood.com/recipes/boulevardier', {
        image: [
          {
            '@type': 'ImageObject',
            url: 'https://images.immediate.co.uk/production/volatile/sites/30/2021/02/Boulevardier-c51a559.jpg?resize=768,713',
            width: 768,
            height: 713,
          },
          {
            '@type': 'ImageObject',
            url: 'https://images.immediate.co.uk/production/volatile/sites/30/2021/02/Boulevardier-c51a559.jpg?resize=900,836',
            width: 900,
            height: 836,
          },
        ],
      }),
    ).toBe(
      'https://images.immediate.co.uk/production/volatile/sites/30/2021/02/Boulevardier-c51a559.jpg?resize=900,836',
    )
  })

  // Each crop of the photo is as wide as the others.
  it('takes the first of equal widths', () => {
    const crop = (height: number) => ({
      '@type': 'ImageObject',
      url: `https://assets.meillakotona.fi/elvis/file/AFOz-kwNKFIBzJIIij6rww/*/mk0318_arki_kana5_preview_1770313432824_pM0zk.jpg?w=1066&h=${height}&fit=crop-center&q=75`,
      width: 1066,
      height,
    })
    expect(
      photoOf(
        'https://www.meillakotona.fi/reseptit/broileria-ja-kaalia-hoisinkastikkeessa-uusi-arkiruokasuosikki-valmistuu-vartissa',
        { image: [crop(1066), crop(800), crop(600)] },
      ),
    ).toBe(crop(1066).url)
  })

  // WP Recipe Maker lists the full photo, then square, 4:3 and 16:9 crops.
  it('takes the first listed without sizes', () => {
    const photo =
      'https://www.justonecookbook.com/wp-content/uploads/2021/05/Butter-Shoyu-Chicken-6001-I'
    expect(
      photoOf('https://www.justonecookbook.com/butter-shoyu-chicken/', {
        image: [
          `${photo}.jpg`,
          `${photo}-500x500.jpg`,
          `${photo}-500x375.jpg`,
          `${photo}-480x270.jpg`,
        ],
      }),
    ).toBe(`${photo}.jpg`)
  })

  // Its og:image is then the site's logo.
  it("has none when the recipe's data gives none", () => {
    expect(
      photoOf(
        'https://www.bbc.co.uk/food/recipes/almond_and_orange_tart_69229',
        { image: null },
        '<meta property="og:image" content="https://food.files.bbci.co.uk/kandl-food/images/non-spriteable-images/bbc_placeholder.png">',
      ),
    ).toBeNull()
  })

  it("reads an <img>'s address in microdata, against the page's", () => {
    const html = page(
      '',
      `<article itemscope itemtype="https://schema.org/Recipe">
        <h1 itemprop="name">Etikkasilakat</h1>
        <img itemprop="image" src="/wp-content/uploads/reseptit/177691-silakat.jpg" alt="">
        <ul>
          <li itemprop="recipeIngredient">8  silakkafileetä</li>
          <li itemprop="recipeIngredient">1  sipuli</li>
        </ul>
      </article>`,
    )
    expect(
      extractRecipe(html, 'https://kotiliesi.fi/resepti/etikkasilakat/')
        ?.imageUrl,
    ).toBe(
      'https://kotiliesi.fi/wp-content/uploads/reseptit/177691-silakat.jpg',
    )
  })

  // A page that loads its images as they scroll into view can start with a
  // placeholder in place of the address.
  it('passes over what is no web address', () => {
    expect(
      photoOf('https://kotiliesi.fi/resepti/etikkasilakat/', {
        image: [
          'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
          'https://kotiliesi.fi/wp-content/uploads/reseptit/177691-silakat.jpg',
        ],
      }),
    ).toBe(
      'https://kotiliesi.fi/wp-content/uploads/reseptit/177691-silakat.jpg',
    )
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
  // The times written as text are as jalotofu.fi, hellofresh.co.uk,
  // epicurious.com and olivemagazine.com publish them.
  it.each([
    ['PT30M', 30],
    ['PT1H30M', 90],
    ['P0DT0H45M', 45],
    ['PT0.5H', 30],
    ['PT0M', null],
    ['10 min', 10],
    ['30m', 30],
    ['4 hours', 240],
    ['1 hour 15 minutes', 75],
    ['30 minutes, plus cooling', 30],
    ['1 hour 30 minutes (plus rising and cooling)', 90],
    ['Cook Time (approx.)', null],
  ])('reads %s as %s minutes', (duration, minutes) => {
    expect(readMinutes([duration])).toBe(minutes)
  })
})
