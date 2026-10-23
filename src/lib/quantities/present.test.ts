import { describe, expect, it } from 'vitest'
import { parseIngredient } from '@/lib/quantities/ingredient'
import { CONVERSION_LIMIT } from '@/lib/quantities/kitchen'
import { readsAsWritten, sizeOf } from '@/lib/quantities/measures'
import { readNumber, readNumberWord } from '@/lib/quantities/numbers'
import { presentIngredient, presentStep } from '@/lib/quantities/present'
import { readQuantity, readWordQuantity } from '@/lib/quantities/quantity'
import { scan } from '@/lib/quantities/scan'
import { scanStep } from '@/lib/quantities/steps'
import { isMeasure } from '@/lib/quantities/units'
import { ingredientLines, inCorpus, stepSentences } from '@/test/corpus'
import { assertLedger } from '@/test/ledger'
import { presentedLedger } from '@/test/ledgers'
import type { LineQuantity } from '@/lib/quantities/line'
import type { DisplaySystem } from '@/lib/quantities/measures'
import type { Value } from '@/lib/quantities/numbers'
import type {
  PresentOptions,
  Presented,
  Segment,
} from '@/lib/quantities/present'
import type { MeasuringSystem, Quantity } from '@/lib/quantities/scan'
import type { CorpusLine } from '@/test/corpus'

// Every line here is copied from the corpus and presented with its own
// site's language and measuring system. "metric ×1.5" is the metric display
// at one and a half times the servings.
const CASES: Record<
  string,
  Array<[line: string, how: string, expected: string]>
> = {
  'cups and pints become decilitres': [
    ['0.5 cup butter', 'metric', '1.2 dl butter'],
    [
      '1-1/2 cups strong brewed coffee',
      'metric',
      '3.5 dl strong brewed coffee',
    ],
    [
      '1 pint shucked oysters or 2 cans (8 ounces each) whole oysters, drained',
      'metric',
      '4.7 dl shucked oysters or 2 cans (225 g each) whole oysters, drained',
    ],
    ['0.33333334326744 cup buttermilk', 'metric', '0.8 dl buttermilk'],
  ],
  'text that already gives the display system stays as written': [
    ['125g/4½oz caster sugar ', 'us', '125g/4½oz caster sugar '],
    [
      '2 2/3 cups (320g) King Arthur Unbleached All-Purpose Flour',
      'metric',
      '2 2/3 cups (320g) King Arthur Unbleached All-Purpose Flour',
    ],
    [
      '1 cup plus 2 tablespoons (134g) King Arthur Unbleached All-Purpose Flour',
      'metric',
      '1 cup plus 2 tablespoons (134g) King Arthur Unbleached All-Purpose Flour',
    ],
    [
      '200 gram (7-ounce) skinless, boneless ocean trout or salmon fillet',
      'us',
      '200 gram (7-ounce) skinless, boneless ocean trout or salmon fillet',
    ],
    [
      'Preheat oven to 350 degrees F (175 degrees C).',
      'metric',
      'Preheat oven to 350 degrees F (175 degrees C).',
    ],
    [
      'Line the base of a 23 x 33cm / 13 x 9" pan with paper (Note 5)',
      'us',
      'Line the base of a 23 x 33cm / 13 x 9" pan with paper (Note 5)',
    ],
  ],
  'the same amount twice converts once': [
    ['330ml/11fl oz sparkling water', 'us', '1⅓ cups/11fl oz sparkling water'],
    ['200 g (3-4 dl)  puolukoita', 'us', '7 unssia (1¼–1⅔ kuppia)  puolukoita'],
  ],
  'decilitres become cups, with tablespoons when a fraction is off': [
    ['1 dl sokeria', 'us', '⅓ kuppia + 1½ rkl sokeria'],
    ['3 dl vehnäjauhoja', 'us', '1¼ kuppia vehnäjauhoja'],
    ['2 dl kuohukermaa', 'us', '¾ kuppia + 1½ rkl kuohukermaa'],
    ['250ml Sokeria', 'us', '1 kuppi Sokeria'],
    [
      '½ dl Arla® Meijerivoita sulatettuna',
      'us',
      '3½ rkl Arla® Meijerivoita sulatettuna',
    ],
    [
      'Lisää kaksi desilitraa kuohukermaa, teelusikallinen suolaa sekä puoli teelusikallista mustapippuria.',
      'us',
      'Lisää ¾ kuppia + 1½ rkl kuohukermaa, teelusikallinen suolaa sekä puoli teelusikallista mustapippuria.',
    ],
  ],
  // A converted Finnish unit takes the case the recipe wrote its amount
  // in, after an abbreviation too.
  'Finnish units keep their case': [
    [
      'Täyte: keitä puuroriisi 3 1/2 desiä 6 desissä vettä kypsäksi.',
      'us',
      'Täyte: keitä puuroriisi 1½ kuppia 2½ kupissa vettä kypsäksi.',
    ],
    [
      'Kaada taikina voideltuun, suorakaiteen muotoiseen 1,5 litran vetoiseen leipävuokaan.',
      'us',
      'Kaada taikina voideltuun, suorakaiteen muotoiseen 6⅓ kupin vetoiseen leipävuokaan.',
    ],
    [
      'Viillä terävällä veitsellä noin 2 cm:n levyinen reunus taikinan ympäri.',
      'us',
      'Viillä terävällä veitsellä noin ¾ tuuman levyinen reunus taikinan ympäri.',
    ],
    ['5 cm:n pala inkivääriä', 'us', '2 tuuman pala inkivääriä'],
  ],
  'Australian tablespoons become teaspoons': [
    ['1 tablespoon lime juice', 'metric', '4 tsp lime juice'],
    ['1 - 2 tbsp olive oil', 'metric', '4–8 tsp olive oil'],
    ['1 tablespoon (20g) ghee', 'metric', '1 tablespoon (20g) ghee'],
    ['1 tablespoon (20g) ghee', 'us', '4 tsp (¾ oz) ghee'],
    ['1 cup (220g) caster sugar', 'us', '1 cup (8 oz) caster sugar'],
  ],
  'amounts no unit fits stay as written': [
    ['½ g sahramia', 'us', '½ g sahramia'],
  ],
  weights: [
    [
      '1 pound shrimp, peeled and deveined',
      'metric',
      '450 g shrimp, peeled and deveined',
    ],
    ['1.25 pounds ground smoked ham', 'metric', '570 g ground smoked ham'],
    ['400G Nakkeja', 'us', '14 unssia Nakkeja'],
    [
      '1 (14 ounce) can sweetened condensed milk',
      'metric',
      '1 (400 g) can sweetened condensed milk',
    ],
    ['2 pkt (à 170 g)  pekonia', 'us', '2 pkt (à 6 unssia)  pekonia'],
  ],
  'lengths and sizes': [
    [
      '1-1/2 pounds boneless pork, cut into 1-inch cubes',
      'metric',
      '680 g boneless pork, cut into 2.5 cm cubes',
    ],
    [
      '2 (9 inch) prepared graham cracker crusts',
      'metric',
      '2 (23 cm) prepared graham cracker crusts',
    ],
    [
      'Grease and line the base and sides of 3 x 20cm cake tins with baking parchment.',
      'us',
      'Grease and line the base and sides of 3 x 8 in cake tins with baking parchment.',
    ],
    [
      'Spoon chicken mixture evenly into an 11x7-inch or 9-inch square baking dish.',
      'metric',
      'Spoon chicken mixture evenly into a 28 × 18 cm or 23 cm square baking dish.',
    ],
    [
      'Shape dough into 1-in. balls; place 2 in. apart on ungreased baking sheets.',
      'metric',
      'Shape dough into 2.5 cm balls; place 5 cm apart on ungreased baking sheets.',
    ],
  ],
  temperatures: [
    ['Preheat the oven to 375°F.', 'metric', 'Preheat the oven to 190°C.'],
    ['Kuumenna uuni 175 °C:een.', 'us', 'Kuumenna uuni 350 °F:een.'],
    [
      '1/4 cup warm water (110° to 115°)',
      'metric',
      '0.6 dl warm water (43–46°C)',
    ],
    [
      'Bake at 350 degrees for 1 hour or until internal meat temperature reaches 160 degrees F (73 degrees C).',
      'metric',
      'Bake at 180°C for 1 hour or until internal meat temperature reaches 160 degrees F (73 degrees C).',
    ],
    [
      'Preheat the oven to 190C/170C Fan/Gas 5 and grease a 26cm/10in spring-from cake tin.',
      'us',
      'Preheat the oven to 375°F/350°F Fan/Gas 5 and grease a 26cm/10in spring-from cake tin.',
    ],
    ['Paista 225 asteessa 45 minuuttia.', 'us', 'Paista 425 °F 45 minuuttia.'],
  ],
  "scaling keeps the writer's style": [
    ['1½ dl Arla® Kevytmaitoa', 'metric ×2', '3 dl Arla® Kevytmaitoa'],
    ['0,75dl kaakaojauhetta', 'metric ×2', '1,5dl kaakaojauhetta'],
    [
      '3-1/4 to 3-3/4 cups all-purpose flour',
      'us ×2',
      '6-1/2 to 7-1/2 cups all-purpose flour',
    ],
    [
      '1/2 to 1 teaspoon ground nutmeg, to taste',
      'us ×1.5',
      '3/4 to 1 1/2 teaspoons ground nutmeg, to taste',
    ],
    ['puolikas kurkkua siivutettuna', 'metric ×1.5', '¾ kurkkua siivutettuna'],
    ['  yksi paketti', 'metric ×2', '  kaksi pakettia'],
    [
      'two 8-ounce packages (452g) cream cheese, at room temperature',
      'metric ×1.5',
      'three 8-ounce packages (680g) cream cheese, at room temperature',
    ],
    [
      '600g/1lb 5oz raw jumbo prawns, peeled and deveined (defrosted if frozen)',
      'metric ×2',
      '1200g/2lb 10oz raw jumbo prawns, peeled and deveined (defrosted if frozen)',
    ],
    [
      'n. 5dl Virtasalmen Viljatuotteen Vaaleaa gluteenitonta jauhoseosta',
      'metric ×1.5',
      'n. 7,5dl Virtasalmen Viljatuotteen Vaaleaa gluteenitonta jauhoseosta',
    ],
    ['0.33333334326744 cup buttermilk', 'us ×1.2', '⅓ cup + 1 tbsp buttermilk'],
    ['1 tbsp soy sauce', 'us ×1.5', '1½ tbsp soy sauce'],
  ],
  'scaled grams and millilitres round to 5 from 20 up': [
    ['142ml carton double cream', 'metric ×1.5', '215ml carton double cream'],
    // Below 20, to the gram.
    ['10 g Arla® Meijerivoita', 'metric ×1.7', '17 g Arla® Meijerivoita'],
  ],
  'unit words agree with the new number': [
    ['1 maustemitta sahramia', 'metric ×1.5', '1½ maustemittaa sahramia'],
    ['1 clove garlic, minced', 'us ×2', '2 cloves garlic, minced'],
    ['1 pinch ground ginger', 'us ×2', '2 pinches ground ginger'],
    ['2 pulloa (0,33 l)  olutta', 'metric ×0.5', '1 pullo (0,17 l)  olutta'],
    [
      '4 rkl tuoretta tai 2 tl kuivattua timjamia',
      'metric ×1.5',
      '6 rkl tuoretta tai 3 tl kuivattua timjamia',
    ],
  ],
  "sizes of one piece don't scale": [
    [
      '2 x 150g cartons light Greek yogurt',
      'metric ×2',
      '4 x 150g cartons light Greek yogurt',
    ],
    [
      '3 tlk tomaattimurskaa, à 400 g',
      'metric ×2',
      '6 tlk tomaattimurskaa, à 400 g',
    ],
    [
      '½ dl vatkattua Arla® Lempi Smetana laktoositon 150 g',
      'metric ×2',
      '1 dl vatkattua Arla® Lempi Smetana laktoositon 150 g',
    ],
    [
      '2 boneless skinless chicken breasts, cut into slices 1cm/½in thick',
      'metric ×2',
      '4 boneless skinless chicken breasts, cut into slices 1cm/½in thick',
    ],
  ],
}

const corpus = [...ingredientLines, ...stepSentences]
const isStep = (line: string) => stepSentences.some((s) => s.text === line)

function presentLine(line: CorpusLine, opts: PresentOptions): Presented {
  return isStep(line.text)
    ? presentStep(line.text, scanStep(line.text, line), opts)
    : presentIngredient(parseIngredient(line.text, line), opts)
}

function optionsOf(line: CorpusLine, how: string): PresentOptions {
  const [display, factor] = how.split(' ×')
  return {
    language: line.language,
    system: line.system,
    display: display as DisplaySystem,
    factor: factor ? Number(factor) : 1,
  }
}

describe('presenting', () => {
  it('only uses lines from the corpus', () => {
    const lines = Object.values(CASES).flatMap((cases) => cases.map(([l]) => l))
    expect(lines.filter((line) => !inCorpus(corpus, line))).toEqual([])
  })

  for (const [group, cases] of Object.entries(CASES)) {
    describe(group, () => {
      it.each(cases)('%j %s', (text, how, expected) => {
        const line = corpus.find((l) => l.text === text)
        if (!line) throw new Error(`Not in the corpus: ${text}`)
        expect(presentLine(line, optionsOf(line, how)).text).toBe(expected)
      })
    })
  }

  it('marks what was converted and what scaled', () => {
    const text = '1 (14 ounce) can sweetened condensed milk'
    const parsed = parseIngredient(text, { language: 'en', system: 'us' })
    const { segments } = presentIngredient(parsed, {
      language: 'en',
      system: 'us',
      display: 'metric',
      factor: 2,
    })
    expect(segments).toEqual([
      {
        kind: 'quantity',
        index: 0,
        text: '2',
        original: '1',
        converted: false,
        scaled: true,
      },
      { kind: 'text', text: ' (' },
      {
        kind: 'quantity',
        index: 1,
        text: '400 g',
        original: '14 ounce',
        converted: true,
        scaled: false,
      },
      { kind: 'text', text: ') ' },
      {
        kind: 'quantity',
        index: 0,
        text: 'cans',
        original: 'can',
        converted: false,
        scaled: true,
      },
      { kind: 'text', text: ' sweetened condensed milk' },
    ])
  })

  it('keeps its presentation of every corpus line', () => {
    const path = 'src/lib/quantities/__ledger__/presented.txt'
    const check = presentedLedger(path, ingredientLines, stepSentences)
    assertLedger(check, path, (message) => expect.fail(message))
  })
})

// --- Properties over the whole corpus ---

const DISPLAYS: ReadonlyArray<DisplaySystem> = ['metric', 'us']
const FACTORS = [1, 0.5, 1.5, 2, 3]

// How far a scaled amount may be from the exact one: a fraction to the
// nearest ¼, ⅓ or ½, or grams to the nearest 5, and below that the
// smallest fraction a cook writes.
const SCALED_SLACK = 0.13
const SMALLEST_STEP = 1 / 8
// Text that only joins two quantities, without words: "/", ", ", "(".
const JOINED = /^[\s,/()]*$/

type Presentation = {
  readonly line: CorpusLine
  readonly step: boolean
  readonly list: ReadonlyArray<LineQuantity>
  readonly shown: Presented
  readonly opts: PresentOptions
}

function presentAs(
  text: string,
  line: CorpusLine,
  step: boolean,
  opts: PresentOptions,
): Presented {
  return step
    ? presentStep(text, scanStep(text, line), opts)
    : presentIngredient(parseIngredient(text, line), opts)
}

// Every corpus line on both displays, ingredient lines at several
// servings. Made once, for all the properties below.
let presentations: Array<Presentation> | null = null

function eachPresentation(check: (p: Presentation) => void) {
  presentations ??= corpus.flatMap((line) => {
    const step = isStep(line.text)
    const list = step
      ? scanStep(line.text, line)
      : parseIngredient(line.text, line).quantities
    return DISPLAYS.flatMap((display) =>
      (step ? [1] : FACTORS).map((factor) => {
        const opts = {
          language: line.language,
          system: line.system,
          display,
          factor,
        }
        return {
          line,
          step,
          list,
          shown: presentAs(line.text, line, step, opts),
          opts,
        }
      }),
    )
  })
  presentations.forEach(check)
}

// Lines a property below still fails on, each with the reason. A property
// fails when a line not listed here breaks it, and also when a listed line
// no longer does, so that the list stays true.
const KNOWN: Record<string, Record<string, string>> = {
  'repeated beside it': {
    'Scoop the dough onto a parchment-lined baking sheet into heaping 2 tablespoon portions (57g, 2 ounces); a heaping jumbo cookie scoop is about right.':
      'A comma inside parentheses does not link an amount to the same amount in another unit, as a slash does.',
  },
}

// Keeps the first way a line breaks a property.
function record(broken: Map<string, string>, text: string, how: string) {
  if (!broken.has(text)) broken.set(text, how)
}

function expectOnlyKnown(property: string, broken: Map<string, string>) {
  const known = KNOWN[property] ?? {}
  const unexpected = [...broken]
    .filter(([text]) => !(text in known))
    .map(([text, how]) => `${JSON.stringify(text)}\n  ${how}`)
  const fixed = Object.keys(known).filter((text) => !broken.has(text))
  expect(unexpected.join('\n'), `${property}: new failures`).toBe('')
  expect(fixed.join('\n'), `${property}: passes now, remove from KNOWN`).toBe(
    '',
  )
}

// The system a display's own units are read in.
const shownSystem = (opts: PresentOptions): MeasuringSystem =>
  opts.display === 'us' ? 'us' : 'metric'

const top = (v: Value) => (typeof v === 'number' ? v : v.max)

// A quantity's size in millilitres, grams, millimetres or degrees Celsius,
// for comparing an amount with its conversion.
function sizeIn(q: Quantity, system: MeasuringSystem): [string, number] | null {
  if (q.type === 'temperature') {
    const v = top(q.value)
    return ['°', q.scale === 'C' ? v : ((v - 32) * 5) / 9]
  }
  const unit = q.unit
  const size = unit ? sizeOf(unit, system) : null
  if (!unit || size === null) return null
  const value = q.type === 'dimensions' ? Math.max(...q.values) : top(q.value)
  return [unit.kind, value * size]
}

// Whether a quantity is a measure or temperature that the display reads
// as written.
function readsInDisplay(q: Quantity, opts: PresentOptions): boolean {
  if (q.type === 'temperature')
    return q.scale === (opts.display === 'us' ? 'F' : 'C')
  return (
    isMeasure(q.unit) &&
    q.unit !== null &&
    readsAsWritten(q.unit, opts.system, opts.display)
  )
}

// Which quantities are written together, as a group number for each: an
// amount, the same amount in another unit, its sizes and its total, linked
// directly or through each other.
function groupsOf(list: ReadonlyArray<LineQuantity>): Array<number> {
  const group = list.map((_, i) => i)
  const find = (i: number): number =>
    group[i] === i ? i : (group[i] = find(group[i]))
  list.forEach((q, i) => {
    if (q.of !== null) group[find(i)] = find(q.of)
  })
  return list.map((_, i) => find(i))
}

// The top of what a scaled amount shows, in the amount's own unit. An
// amount written anew is read whole ("⅓ cup + 1 tbsp"); otherwise each of
// its numbers is read where the original number was.
function scaledTop(
  line: CorpusLine,
  q: LineQuantity & { readonly type: 'amount' },
  segments: ReadonlyArray<Segment & { readonly kind: 'quantity' }>,
): number | null {
  const opts = { language: line.language }
  const whole = segments.find(
    (s) => s.original === line.text.slice(q.at[0], q.at[1]),
  )
  if (whole) {
    let sum = 0
    for (const part of whole.text.split(' + ')) {
      const read =
        readQuantity(part, 0, opts) ?? readWordQuantity(part, 0, opts)
      if (!read) return null
      const from = read.unit && sizeOf(read.unit, line.system)
      const to = q.unit && sizeOf(q.unit, line.system)
      sum += top(read.value) * (from && to ? from / to : 1)
    }
    return sum
  }
  const last = q.numbers[q.numbers.length - 1]
  const shown = segments.find(
    (s) => s.original === line.text.slice(last.at[0], last.at[1]),
  )
  if (!shown) return null
  const read =
    readNumber(shown.text, 0, line.language) ??
    readNumberWord(shown.text, 0, line.language)
  return read?.value ?? null
}

describe('every presentation', () => {
  it('is made of the original text and the quantities shown', () => {
    eachPresentation(({ line, shown }) => {
      const original = shown.segments
        .map((s) => (s.kind === 'text' ? s.text : s.original))
        .join('')
      expect(original, line.text).toBe(line.text)
      expect(shown.segments.map((s) => s.text).join('')).toBe(shown.text)
    })
  })

  it('leaves the text alone when nothing converts or scales', () => {
    eachPresentation(({ line, shown }) => {
      const changed = shown.segments.some(
        (s) => s.kind === 'quantity' && (s.converted || s.scaled),
      )
      if (!changed) expect(shown.text, line.text).toBe(line.text)
    })
  })

  // What a conversion writes, the parser reads back as about the same
  // amount in the display's units.
  it('reads back as the amount it converted', () => {
    eachPresentation(({ line, list, shown, opts }) => {
      for (const s of shown.segments) {
        if (s.kind !== 'quantity' || !s.converted) continue
        const q = list[s.index]
        const before = sizeIn(q, line.system)
        if (!before) continue
        const factor = q.scales ? (opts.factor ?? 1) : 1
        const { reads } = scan(s.text, 0, {
          language: line.language,
          system: shownSystem(opts),
        })
        const sizes = reads.flatMap((r) => {
          const size = sizeIn(r, shownSystem(opts))
          return size ? [size] : []
        })
        const where = `${line.text} → ${s.text}`
        expect(sizes.length, where).toBeGreaterThan(0)
        expect(
          sizes.every(([kind]) => kind === before[0]),
          where,
        ).toBe(true)
        const after = sizes.reduce((sum, [, v]) => sum + v, 0)
        const expected = before[1] * factor
        const slack = before[0] === '°' ? 8 : CONVERSION_LIMIT * expected
        expect(Math.abs(after - expected), where).toBeLessThanOrEqual(slack)
      }
    })
  })

  // A scaled amount reads back as the amount times the factor, give or
  // take the rounding to fractions a cook writes.
  it('reads back as the amount it scaled', () => {
    const broken = new Map<string, string>()
    eachPresentation(({ line, list, shown, opts }) => {
      const factor = opts.factor ?? 1
      list.forEach((q, i) => {
        if (q.type !== 'amount' || !q.scales || factor === 1) return
        const segments = shown.segments.filter(
          (s): s is Segment & { kind: 'quantity' } =>
            s.kind === 'quantity' && s.index === i,
        )
        if (segments.some((s) => s.converted)) return
        if (!segments.some((s) => s.scaled)) return
        const expected = top(q.value) * factor
        const got = scaledTop(line, q, segments)
        const off = got === null ? Infinity : Math.abs(got - expected)
        if (off > SCALED_SLACK * expected && off > SMALLEST_STEP) {
          record(broken, line.text, `×${factor}: ${shown.text}`)
        }
      })
    })
    expectOnlyKnown('scaled', broken)
  })

  // What a device shows is already in its own units, so showing that text
  // again changes nothing.
  it('shows its own text unchanged', () => {
    const broken = new Map<string, string>()
    eachPresentation(({ line, step, shown, opts }) => {
      if (opts.factor !== 1) return
      const system = shownSystem(opts)
      const again = presentAs(shown.text, { ...line, system }, step, {
        ...opts,
        system,
      })
      if (again.text !== shown.text) {
        record(broken, line.text, `${shown.text}\n  → ${again.text}`)
      }
    })
    expectOnlyKnown('fixed point', broken)
  })

  // DESIGN.md: text that already gives the display's units stays as
  // written, together with everything written with it.
  it('converts nothing written with an amount in the display units', () => {
    const broken = new Map<string, string>()
    eachPresentation(({ line, list, shown, opts }) => {
      const group = groupsOf(list)
      for (const s of shown.segments) {
        if (s.kind !== 'quantity' || !s.converted) continue
        const given = list.some(
          (q, j) => group[j] === group[s.index] && readsInDisplay(q, opts),
        )
        if (given) record(broken, line.text, `${opts.display}: ${shown.text}`)
      }
    })
    expectOnlyKnown('given in the display units', broken)
  })

  // "(57g, 2 ounces)" on a US device must not become "(2 oz, 2 ounces)",
  // even when nothing links the two.
  it('never repeats an amount written beside it in the display units', () => {
    const broken = new Map<string, string>()
    eachPresentation(({ line, list, shown, opts }) => {
      for (const s of shown.segments) {
        if (s.kind !== 'quantity' || !s.converted) continue
        const q = list[s.index]
        const size = sizeIn(q, line.system)
        if (!size) continue
        list.forEach((other, j) => {
          if (j === s.index || !readsInDisplay(other, opts)) return
          const otherSize = sizeIn(other, line.system)
          if (otherSize?.[0] !== size[0]) return
          const [a, b] = q.at[0] < other.at[0] ? [q, other] : [other, q]
          if (!JOINED.test(line.text.slice(a.at[1], b.at[0]))) return
          const larger = Math.max(size[1], otherSize[1])
          if (Math.abs(size[1] - otherSize[1]) <= 0.1 * larger) {
            record(broken, line.text, `${opts.display}: ${shown.text}`)
          }
        })
      }
    })
    expectOnlyKnown('repeated beside it', broken)
  })
})
