import { describe, expect, it } from 'vitest'
import { parseIngredient } from '@/lib/quantities/ingredient'
import { readNumber } from '@/lib/quantities/numbers'
import { scan } from '@/lib/quantities/scan'
import { canonical } from '@/lib/quantities/text'
import { inCorpus, ingredientLines } from '@/test/corpus'
import { describeIngredient } from '@/test/quantities'
import type { IngredientOptions } from '@/lib/quantities/ingredient'

// Every line here is copied from the corpus, entities decoded. The first
// test checks that, so nothing in this file is made up. Readings are
// written as described in src/test/quantities.ts, ending with the text each
// quantity covers.
const CASES: Record<string, Array<[line: string, expected: string]>> = {
  'zero amounts': [
    // https://www.valio.fi/reseptit/harkis-texmex-salaatti/
    ['0 kg nachoja', 'measured 0 kg  [0 kg]'],
  ],
  'approximate totals with around': [
    // https://www.bbcgoodfood.com/recipes/carrot-swede-mash-with-brown-butter-thyme
    [
      '1 medium swede (around 600g), peeled and roughly chopped',
      'counted 1 | total ~600 g  [1] [600g]',
    ],
  ],
  'English rates stay fixed': [
    // https://www.tasteofhome.com/recipes/tortellini-shrimp-skewers-with-sun-dried-tomato-sauce/
    [
      '1 pound peeled and deveined cooked shrimp (31-40 per pound)',
      'measured 1 lb  [1 pound]',
    ],
  ],
  'later bare-count alternatives': [
    // https://www.recipetineats.com/hot-ham-and-cheese-sliders/
    [
      '12  standard or 24 small soft white roll slab ((23 x 33cm / 9 x 13" slab) - Note 1)',
      'counted 12 | more 24 | more fixed 23x33 cm = 9x13 in  [12] [24] [23 x 33cm] [9 x 13"]',
    ],
  ],
  'later package alternatives': [
    // https://www.tasteofhome.com/recipes/crispy-oven-fried-oysters/
    [
      '1 pint shucked oysters or 2 cans (8 ounces each) whole oysters, drained',
      'measured 1 pint | more 2 can | more fixed 8 oz  [1 pint] [2 cans] [8 ounces]',
    ],
  ],
  'later alternative subtotals': [
    // https://www.kingarthurbaking.com/recipes/sourdough-chocolate-chip-cookies-recipe
    [
      '1/2 cup (113g) ripe (fed) sourdough starter or 1/2 cup plus 1 tablespoon (135g) sourdough discard',
      'measured 0.5 cup = 113 g | more 0.5 cup | more 1 tbsp | total 135 g  [1/2 cup] [113g] [1/2 cup] [1 tablespoon] [135g]',
    ],
  ],
  'counted mains beside measured alternatives': [
    // https://www.bettycrocker.com/recipes/italian-sausage-lasagna/2601a67c-438d-407a-b163-2f57ede06cb9
    [
      '1 container (15 oz) ricotta cheese or small-curd cottage cheese (2 cups)',
      'counted 1 container | total 15 oz | more 2 cup  [1 container] [15 oz] [2 cups]',
    ],
  ],
  'dimensions separate later weights': [
    // https://www.bbcgoodfood.com/recipes/lazy-summer-tomato-sourdough-traybake
    [
      '1 small aubergine cut into 3cm chunks (250g)',
      'counted 1 | more fixed 3 cm | more 250 g  [1] [3cm] [250g]',
    ],
    // https://www.recipetineats.com/lamb-tagine/
    [
      '1.6 kg/ 3.2lb  boneless lamb shoulder, trim the fat, then ( cut in 3.5cm / 1.5" cubes (1kg/2lb after trimming))',
      'measured 1.6 kg = 3.2 lb | more fixed 3.5 cm = 1.5 in | more 1 kg = 2 lb  [1.6 kg] [3.2lb] [3.5cm] [1.5"] [1kg] [2lb]',
    ],
  ],
  'nested counts and measured amounts': [
    // https://www.recipetineats.com/birria-tacos/
    [
      '45 g (1.6 oz)  ancho chillies, dried ((~2-3 pieces, 1 cup once chopped) (Note 1))',
      'measured 45 g = 1.6 oz | more ~2-3 piece | more 1 cup  [45 g] [1.6 oz] [2-3 pieces] [1 cup]',
    ],
  ],
  'less common fraction glyphs': [
    // https://www.bbc.co.uk/food/recipes/easy_onion_rings_87916
    [
      '1 large onion, sliced into rings about 1.5cm/⅝in thick',
      'counted 1 | more fixed ~1.5 cm = 0.625 in  [1] [1.5cm] [⅝in]',
    ],
  ],
  'numbers and units': [
    ['1½ dl Arla® Kevytmaitoa', 'measured 1.5 dl  [1½ dl]'],
    ['3 1/2dl Puuroriisiä', 'measured 3.5 dl  [3 1/2dl]'],
    ['0,75dl kaakaojauhetta', 'measured 0.75 dl  [0,75dl]'],
    ['1.5dl Maitoa', 'measured 1.5 dl  [1.5dl]'],
    ['0.5 cup balsamic vinegar', 'measured 0.5 cup  [0.5 cup]'],
    ['3Kpl Munaa', 'counted 3 kpl  [3Kpl]'],
    ['8kynttä valkosipulia', 'counted 8 kynsi  [8kynttä]'],
    ['1 rku korianteria', 'counted 1 rku  [1 rku]'],
    ['1 tlk creme fraichea', 'counted 1 tlk  [1 tlk]'],
    ['1 fluid ounce vodka', 'measured 1 fl-oz  [1 fluid ounce]'],
    [
      '5 centimetre piece fresh ginger, peeled, sliced thickly',
      'measured 5 cm  [5 centimetre]',
    ],
    ['1 pinch ground ginger', 'counted 1 pinch  [1 pinch]'],
    [
      '2 handfuls amaretti biscuits, smashed into small pieces ',
      'counted 2 handful  [2 handfuls]',
    ],
    ['1 clove garlic, minced', 'counted 1 clove  [1 clove]'],
    ['3 cl espressoa', 'measured 3 cl  [3 cl]'],
    ['1 maustemitta sahramia', 'measured 1 maustemitta  [1 maustemitta]'],
    // Cut short in the site's own data.
    ['1 plo (0', 'counted 1 plo  [1 plo]'],
  ],
  'ranges and approximate amounts': [
    ['2 - 4 dl hyvälaatuista kumaa kahvia', 'measured 2-4 dl  [2 - 4 dl]'],
    [
      '1/2 - 1 kpl kasvisliemikuutio TAI maun mukaan suolaa',
      'counted 0.5-1 kpl  [1/2 - 1 kpl]',
    ],
    [
      '1/2 to 1 teaspoon ground nutmeg, to taste',
      'measured 0.5-1 tsp  [1/2 to 1 teaspoon]',
    ],
    [
      '1/8 to 1/2 teaspoon extra-strong flavor, optional*',
      'measured 0.125-0.5 tsp  [1/8 to 1/2 teaspoon]',
    ],
    ['n 1tl voita', 'measured ~1 tsp  [1tl]'],
    [
      'n. 5dl Virtasalmen Viljatuotteen Vaaleaa gluteenitonta jauhoseosta',
      'measured ~5 dl  [5dl]',
    ],
    ['n.4-6cl kuohuviiniä/proseccoa', 'measured ~4-6 cl  [4-6cl]'],
    ['1-1/2 cups strong brewed coffee', 'measured 1.5 cup  [1-1/2 cups]'],
    [
      '3-1/4 to 3-3/4 cups all-purpose flour',
      'measured 3.25-3.75 cup  [3-1/4 to 3-3/4 cups]',
    ],
  ],
  'number words': [
    ['puolikas kurkkua siivutettuna', 'counted 0.5  [puolikas]'],
    ['  yksi paketti', 'counted 1 pkt  [yksi paketti]'],
  ],
  'words after the number that are not units': [
    ['2 kahvikupillista vettä ', 'counted 2  [2]'],
    // A word such as "heaped" may come between the number and a spoon or
    // cup, and makes the amount approximate.
    [
      '1/4 rounded teaspoon table salt',
      'measured ~0.25 tsp  [1/4 rounded teaspoon]',
    ],
    ['1 large tbsp tamarind paste', 'measured ~1 tbsp  [1 large tbsp]'],
    ['1 large egg', 'counted 1  [1]'],
    ['2 Little Gem lettuces quartered', 'counted 2  [2]'],
    [
      '2 pak choi, roots trimmed, leaves separated and washed',
      'counted 2  [2]',
    ],
  ],
  'percentages and notes': [
    ['4dl 77% sokerilientä', 'measured 4 dl  [4dl]'],
    ['250g.prk rahkajogurttia (Milbona 0,9%)', 'measured 250 g  [250g]'],
    [
      '1 tbsp Chinese cooking wine ((Note 4 subs))',
      'measured 1 tbsp  [1 tbsp]',
    ],
    ['Red chilli julienned ((Note 4))', 'no-amount'],
  ],
  'sizes: each': [
    ['2 pkt (à 170 g)  pekonia', 'counted 2 pkt | each 170 g  [2 pkt] [170 g]'],
    [
      '½-1 palaa (à 170 g) Valio AURA® juustoa',
      'counted 0.5-1 pala | each 170 g  [½-1 palaa] [170 g]',
    ],
    [
      '1 pkt (4 x 100 g) seitiä annospaloina',
      'counted 1 pkt | each 100 g  [1 pkt] [100 g]',
    ],
    [
      '1 (14 ounce) can sweetened condensed milk',
      'counted 1 can | each 14 oz  [1 (14 ounce) can] [14 ounce]',
    ],
    [
      '1 (15.25 ounce) package yellow cake mix',
      'counted 1 package | each 15.25 oz  [1 (15.25 ounce) package] [15.25 ounce]',
    ],
    [
      '2 (9 inch) prepared graham cracker crusts',
      'counted 2 | each 9 in  [2] [9 inch]',
    ],
    [
      '2 x 150g cartons light Greek yogurt',
      'counted 2 carton | each 150 g  [2 x 150g cartons] [150g]',
    ],
    [
      '½ x 400g/14 oz tin chopped tomatoes ',
      'counted 0.5 can | each 400 g = 14 oz  [½ x 400g/14 oz tin] [400g] [14 oz]',
    ],
    [
      '2 x 350 - 400g / 12 - 13 oz  bream or snapper fish (, gutted, scaled and cleaned (Note 1))',
      'counted 2 | each 350-400 g = 12-13 oz  [2] [350 - 400g] [12 - 13 oz]',
    ],
    [
      '2 cans (14-1/2 ounces each) chicken broth',
      'counted 2 can | each 14.5 oz  [2 cans] [14-1/2 ounces]',
    ],
    [
      '4 cod fillets (4 to 6 oz each)',
      'counted 4 | each 4-6 oz  [4] [4 to 6 oz]',
    ],
    [
      '3  large eggs (, (55g/2oz each in shell) - fridge cold is fine)',
      'counted 3 | each 55 g = 2 oz  [3] [55g] [2oz]',
    ],
    [
      '1 (8 oz.) container sour cream',
      'counted 1 container | each 8 oz  [1 (8 oz.) container] [8 oz]',
    ],
    [
      'two 1/4-ounce packages unflavored gelatin',
      'counted 2 package | each 0.25 oz  [two 1/4-ounce packages] [1/4-ounce]',
    ],
    [
      'one 13.75-ounce (390g) can artichoke hearts, drained and quartered',
      'counted 1 can | each 13.75 oz = 390 g  [one 13.75-ounce (390g) can] [13.75-ounce] [390g]',
    ],
    [
      '1 x 470g (15-ounce) packet butter cake mix',
      'counted 1 package | each 470 g = 15 oz  [1 x 470g (15-ounce) packet] [470g] [15-ounce]',
    ],
  ],
  'sizes: total': [
    [
      '1 ps (350 g) salottisipuleita (tai muita pikkusipuleita)',
      'counted 1 pss | total 350 g  [1 ps] [350 g]',
    ],
    ['4 välikyljystä (yht. n. 600 g)', 'counted 4 | total ~600 g  [4] [600 g]'],
    // Plainly written sizes count as totals, even where the site meant
    // each bottle.
    [
      '2 pulloa (0,33 l)  olutta',
      'counted 2 plo | total 0.33 l  [2 pulloa] [0,33 l]',
    ],
    ['4 (800g) chicken breast fillets', 'counted 4 | total 800 g  [4] [800g]'],
    [
      '2 (about 400g) sweet potatoes halved',
      'counted 2 | total ~400 g  [2] [400g]',
    ],
    [
      '4 thick slices ciabatta bread (120g)',
      'counted 4 | total 120 g  [4] [120g]',
    ],
    [
      '1 boneless beef chuck roast (3 to 3-1/2 pounds)',
      'counted 1 | total 3-3.5 lb  [1] [3 to 3-1/2 pounds]',
    ],
    // After a package with a size, an amount in parentheses is the whole
    // line's.
    [
      'two 8-ounce packages (452g) cream cheese, at room temperature',
      'counted 2 package | each 8 oz | total 452 g  [two 8-ounce packages] [8-ounce] [452g]',
    ],
    [
      'one 14-ounce can (397g) sweetened condensed milk',
      'counted 1 can | each 14 oz | total 397 g  [one 14-ounce can] [14-ounce] [397g]',
    ],
  ],
  'the same amount written twice': [
    ['125g/4½oz caster sugar ', 'measured 125 g = 4.5 oz  [125g] [4½oz]'],
    [
      '600g/1lb 5oz raw jumbo prawns, peeled and deveined (defrosted if frozen)',
      'measured 600 g = 1.313 lb  [600g] [1lb 5oz]',
    ],
    [
      '330ml/11fl oz sparkling water',
      'measured 330 ml = 11 fl-oz  [330ml] [11fl oz]',
    ],
    [
      '1.2 litres/2 pints chicken stock, heated with ¼ tsp saffron strands',
      'measured 1.2 l = 2 pint | more 0.25 tsp  [1.2 litres] [2 pints] [¼ tsp]',
    ],
    [
      '2 2/3 cups (320g) King Arthur Unbleached All-Purpose Flour',
      'measured 2.667 cup = 320 g  [2 2/3 cups] [320g]',
    ],
    [
      '1 1/3 to 1 1/2 cups (301g to 340g) water, lukewarm',
      'measured 1.333-1.5 cup = 301-340 g  [1 1/3 to 1 1/2 cups] [301g to 340g]',
    ],
    [
      '300 gram (9½ ounces) lean minced (ground) beef',
      'measured 300 g = 9.5 oz  [300 gram] [9½ ounces]',
    ],
    // Published with the wrong ounces; the parser reads what is written.
    [
      '800 gram (1½ ounces) canned diced tomatoes',
      'measured 800 g = 1.5 oz  [800 gram] [1½ ounces]',
    ],
    ['4 tl (2 cl) Valio glögiä', 'measured 4 tsp = 2 cl  [4 tl] [2 cl]'],
    [
      '400 g Arla® Lempi Maitorahka 0,2 % laktoositon (1 prk)',
      'measured 400 g | same 1 prk  [400 g] [1 prk]',
    ],
    [
      '250g Herkkusieniä (1 pkt)',
      'measured 250 g | same 1 pkt  [250g] [1 pkt]',
    ],
    [
      '250g / 2 sticks  unsalted butter (, softened)',
      'measured 250 g | same 2 stick  [250g] [2 sticks]',
    ],
    // The grams after the butter are the butter's, not the coconut oil's.
    [
      '1/4 cup (53g) coconut oil or 4 tablespoons (57g) butter, at room temperature',
      'measured 0.25 cup = 53 g | more 4 tbsp = 57 g  [1/4 cup] [53g] [4 tablespoons] [57g]',
    ],
  ],
  // Everything after the first amount scales with it too.
  'more amounts on the line': [
    [
      '4 rkl tuoretta tai 2 tl kuivattua timjamia',
      'measured 4 tbsp | more 2 tsp  [4 rkl] [2 tl]',
    ],
    [
      '1 tbsp olive oil, plus 1 tbsp for oiling the bowl',
      'measured 1 tbsp | more 1 tbsp  [1 tbsp] [1 tbsp]',
    ],
    [
      '2 large eggs, plus 1 egg yolk, white reserved',
      'counted 2 | more 1  [2] [1]',
    ],
    // Grams after an addition are the total of both, and belong to the
    // first amount, unless it already has its own.
    [
      '1 cup plus 2 tablespoons (134g) King Arthur Unbleached All-Purpose Flour',
      'measured 1 cup | more 2 tbsp | total 134 g  [1 cup] [2 tablespoons] [134g]',
    ],
    [
      '3/4 cup (90g) plus 1/3 cup (40g) water-milled glutinous rice flour, divided; plus more as needed*',
      'measured 0.75 cup = 90 g | more 0.333 cup = 40 g  [3/4 cup] [90g] [1/3 cup] [40g]',
    ],
    [
      '2/3 cup (152g) heavy cream, cold, plus 1 1/2 tablespoons (21g) for brushing',
      'measured 0.667 cup = 152 g | more 1.5 tbsp = 21 g  [2/3 cup] [152g] [1 1/2 tablespoons] [21g]',
    ],
    // The first amount takes the unit written after the second.
    [
      '2 + 2rkl persiljaa ja basilikaa',
      'measured 2 tbsp | more 2 tbsp  [2] [2rkl]',
    ],
    ['2 + 3 dl vettä', 'measured 2 dl | more 3 dl  [2] [3 dl]'],
    [
      '1/4 plus 1/8 teaspoon baking soda',
      'measured 0.25 tsp | more 0.125 tsp  [1/4] [1/8 teaspoon]',
    ],
    [
      '150g musta leima raastettu (120 + 30)',
      'measured 150 g | more 120 | more 30  [150g] [120] [30]',
    ],
  ],
  // Lengths, temperatures and sizes of one piece convert but don't scale.
  'more quantities that stay fixed': [
    [
      '2 boneless skinless chicken breasts, cut into slices 1cm/½in thick',
      'counted 2 | more fixed 1 cm = 0.5 in  [2] [1cm] [½in]',
    ],
    // "mm" after the first amount is millimetres.
    [
      '500g/1lb 2oz  forced rhubarb (trimmed weight), washed and cut into 5mm/¼in thick slices',
      'measured 500 g = 1.125 lb | more fixed 5 mm = 0.25 in  [500g] [1lb 2oz] [5mm] [¼in]',
    ],
    [
      '5 medium potatoes, peeled, halved lengthways, and cut into 5x4cm/2x1½in chunks',
      'counted 5 | more fixed 5x4 cm = 2x1.5 in  [5] [5x4cm] [2x1½in]',
    ],
    [
      '1 1/3 cups (303g) milk, hot (120°F to 130°F), plus more as needed*',
      'measured 1.333 cup = 303 g | more fixed 120-130 °F  [1 1/3 cups] [303g] [120°F to 130°F]',
    ],
    [
      '1/4 cup warm water (110° to 115°)',
      'measured 0.25 cup | more fixed 110-115 ?°F  [1/4 cup] [110° to 115°]',
    ],
    [
      '2 sheets butter puff pastry, FROZEN ((25cm / 10" squares, 185g/6oz each) (Note 4))',
      'counted 2 sheet | more fixed 25 cm = 10 in | more fixed 185 g = 6 oz  [2 sheets] [25cm] [10"] [185g] [6oz]',
    ],
    [
      '3 tlk tomaattimurskaa, à 400 g',
      'counted 3 tlk | more fixed 400 g  [3 tlk] [400 g]',
    ],
    [
      '1/2 cup pumpkin (not pumpkin pie mix), from 15-oz can',
      'measured 0.5 cup | more fixed 15 oz  [1/2 cup] [15-oz]',
    ],
    // A product's package size closing the line.
    [
      '½ dl vatkattua Arla® Lempi Smetana laktoositon 150 g',
      'measured 0.5 dl | more fixed 150 g  [½ dl] [150 g]',
    ],
  ],
  'amounts later in the line': [
    ['Juustoraastetta tai 2 rkl korppujauhoja', 'measured 2 tbsp  [2 rkl]'],
    [
      'keittämiseen 3 l vettä ja 2 tl suolaa',
      'measured 3 l | more 2 tsp  [3 l] [2 tl]',
    ],
    [
      'kourallinen  tuoretta persiljaa tai 1 tl kuivattua timjamia',
      'measured 1 tsp  [1 tl]',
    ],
    ['finely grated zest of 1 lemon', 'counted 1  [1]'],
    ['zest and juice of 1 medium orange', 'counted 1  [1]'],
  ],
  // A count further along the line scales when it says how much of the
  // ingredient to use. See countKept in ingredient.ts.
  'counts that scale': [
    [
      '1-3/4 pounds Yukon Gold potatoes (about 4 medium), peeled and cut into 1-inch cubes',
      'measured 1.75 lb | more ~4 | more fixed 1 in  [1-3/4 pounds] [4] [1-inch]',
    ],
    [
      '1/4 cup lime juice ((2 to 3 limes))',
      'measured 0.25 cup | more 2-3  [1/4 cup] [2 to 3]',
    ],
    ['2 tsp lemon zest ((1 lemon))', 'measured 2 tsp | more 1  [2 tsp] [1]'],
    [
      '400 g (2 rs, à 200 g) helmitomaatteja',
      'measured 400 g | more 2 rs | more fixed 200 g  [400 g] [2 rs] [200 g]',
    ],
    [
      '350g/ 12 oz   white cabbage (, thinly shredded (1/4 large head, 6 - 8 big handfuls))',
      'measured 350 g = 12 oz | more 0.25 | more ~6-8 handful  [350g] [12 oz] [1/4] [6 - 8 big handfuls]',
    ],
    [
      '2  egg whites (, at room temperature (from 2 large eggs, Note 4))',
      'counted 2 | more 2  [2] [2]',
    ],
  ],
  'counts that stay as written': [
    ['4 baby aubergines each sliced lengthways into 3', 'counted 4  [4]'],
    ['2 baking potatoes each cut into 8 wedges', 'counted 2  [2]'],
    ['40 (n. 8-15 rapua ruokailijaa kohti) elävää rapua', 'counted 40  [40]'],
    [
      '300g/10½oz white basmati rice, soaked in cold water for 30–40 minutes',
      'measured 300 g = 10.5 oz  [300g] [10½oz]',
    ],
    [
      '2 boxes (4-serving size each) Jell-O™ vanilla-flavor instant pudding & pie filling mix',
      'counted 2 box  [2 boxes]',
    ],
    [
      '800g / 24 oz (2 cans) white beans (like cannellini, navy/haricot, butter beans) (, drained (Note 1 & 3))',
      'measured 800 g = 24 oz | same 2 can  [800g] [24 oz] [2 cans]',
    ],
  ],
  // Sizes convert but have no amount to scale.
  sizes: [
    [
      '4 x 3cm / 1 x 2" piece of  ginger julienned',
      'no-amount | more fixed 4x3 cm = 1x2 in  [4 x 3cm] [1 x 2"]',
    ],
    [
      '1 package (7- or 8-oz size) almond paste',
      'counted 1 package | more fixed 7-8 oz  [1 package] [7- or 8-oz]',
    ],
  ],
  'amounts in parentheses': [
    ['Ison sitruunan mehu (90 ml)', 'measured 90 ml  [90 ml]'],
    ['Sitruunan kuori raasteena (1 rkl)', 'measured 1 tbsp  [1 rkl]'],
    ['( 2 tl suolaa )', 'measured 2 tsp  [2 tl]'],
    ['  (3-4 cl konjakkia)', 'measured 3-4 cl  [3-4 cl]'],
  ],
  'no amount': [
    ['suolaa', 'no-amount'],
    ['muutama tuoreen salvianlehteä', 'no-amount'],
    ['Iso kananmuna', 'no-amount'],
    ['salt and pepper to taste', 'no-amount'],
    ['a few tarragon sprigs finely chopped (optional)', 'no-amount'],
    ['Pinch of salt', 'no-amount'],
    ['Salt & pepper', 'no-amount'],
    // Who a product is for isn't an amount of it.
    ['kakkupohja, valmis 8-10hlö (Rainbow)', 'no-amount'],
  ],
  unrecognised: [
    ['Fetaa 1', 'unrecognised'],
    ['jaa valmistaikina 2 astiaan ja lisää', 'unrecognised'],
  ],
}

// Each line is read with its own site's language and measuring system.
const optionsOf = (line: string): IngredientOptions =>
  ingredientLines.find((l) => l.text === line) ?? {
    language: 'en',
    system: 'us',
  }

const parse = (line: string) => parseIngredient(line, optionsOf(line))

// Intended readings of the three known failures in the retired ingredient
// ledger. These remain red-capable: fixing one makes its fails test report
// an unexpected pass, so the known-failure marker can be removed.
const KNOWN_FAILURES = [
  // https://www.arla.fi/reseptit/paasiaisen-rahkajalkiruoka/
  // Currently the second 200g scales with the main amount.
  [
    'a product’s package size stays fixed',
    '200 g Arla® Lempi Rahka Vanilja 200g, laktoositon',
    'measured 200 g | more fixed 200 g  [200 g] [200g]',
  ],
  // https://www.kingarthurbaking.com/recipes/gluten-free-pumpkin-cake-recipe
  // Currently the alternative loses its can count and treats 15 oz as scalable.
  [
    'an alternative can keeps its count and each size',
    '2 scant cups (425g) or one 15-ounce can pumpkin purée',
    'measured ~2 cup = 425 g | more 1 can | each 15 oz  [2 scant cups] [425g] [one 15-ounce can] [15-ounce]',
  ],
  // https://www.valio.fi/reseptit/halloween-porkkanakakku/
  // Currently the amount is a bare count, without the tlk unit.
  [
    'a Finnish size adjective can precede a package unit',
    '1 pieni tlk ananasmurskaa',
    'counted 1 tlk  [1 pieni tlk]',
  ],
] as const

describe('parseIngredient', () => {
  it('only uses lines from the corpus', () => {
    const lines = [
      ...Object.values(CASES).flatMap((cases) => cases.map(([l]) => l)),
      ...KNOWN_FAILURES.map(([, line]) => line),
    ]
    expect(lines.filter((line) => !inCorpus(ingredientLines, line))).toEqual([])
  })

  for (const [group, cases] of Object.entries(CASES)) {
    describe(group, () => {
      it.each(cases)('%j', (line, expected) => {
        expect(describeIngredient(parse(line))).toBe(expected)
      })
    })
  }

  it.fails.each(KNOWN_FAILURES)('%s (known failure)', (_, text, expected) => {
    expect(describeIngredient(parse(text))).toBe(expected)
  })

  it('keeps a later alternative’s subtotal attached to that alternative', () => {
    const text = CASES['later alternative subtotals'][0][0]
    expect(parse(text).quantities[4]).toMatchObject({
      role: 'total',
      of: 2,
      scales: true,
    })
  })

  it('keeps weights after dimensions separate from the main amount', () => {
    const [aubergine, lamb] = CASES['dimensions separate later weights'].map(
      ([text]) =>
        parse(text).quantities.map(({ role, of, scales }) => ({
          role,
          of,
          scales,
        })),
    )
    expect(aubergine).toEqual([
      { role: 'main', of: null, scales: true },
      { role: 'other', of: null, scales: false },
      { role: 'other', of: null, scales: true },
    ])
    expect(lamb).toEqual([
      { role: 'main', of: null, scales: true },
      { role: 'same', of: 0, scales: true },
      { role: 'other', of: null, scales: false },
      { role: 'same', of: 2, scales: false },
      { role: 'other', of: null, scales: true },
      { role: 'same', of: 4, scales: true },
    ])
  })

  it('keeps the correct scant amount beside its known-failing alternative', () => {
    const parsed = parse(KNOWN_FAILURES[1][1])
    expect(parsed.quantities[0]).toMatchObject({
      value: 2,
      unit: { id: 'cup' },
      approximate: true,
      role: 'main',
    })
    expect(parsed.quantities[1]).toMatchObject({
      value: 425,
      unit: { id: 'g' },
      role: 'same',
      of: 0,
      scales: true,
    })
  })

  it('says where each number and unit is, and how the number was written', () => {
    const numbers = (line: string) =>
      parse(line).quantities.map((q) => ({
        numbers: q.numbers.map(
          (n) => `${line.slice(n.at[0], n.at[1])} ${n.form}`,
        ),
        unit: q.type === 'amount' && q.unitAt ? line.slice(...q.unitAt) : null,
      }))
    expect(numbers('2 - 4 dl hyvälaatuista kumaa kahvia')).toEqual([
      { numbers: ['2 integer', '4 integer'], unit: 'dl' },
    ])
    // The first unit of "301g to 340g" sits between the numbers.
    expect(
      numbers('1 1/3 to 1 1/2 cups (301g to 340g) water, lukewarm'),
    ).toEqual([
      { numbers: ['1 1/3 fraction', '1 1/2 fraction'], unit: 'cups' },
      { numbers: ['301 integer', '340 integer'], unit: 'g' },
    ])
    expect(numbers('0,75dl kaakaojauhetta')).toEqual([
      { numbers: ['0,75 decimal'], unit: 'dl' },
    ])
    expect(numbers('puolikas kurkkua siivutettuna')).toEqual([
      { numbers: ['puolikas word'], unit: null },
    ])
    // The ounces of "1lb 5oz" are part of the unit.
    expect(
      numbers(
        '600g/1lb 5oz raw jumbo prawns, peeled and deveined (defrosted if frozen)',
      ),
    ).toEqual([
      { numbers: ['600 integer'], unit: 'g' },
      { numbers: ['1 integer'], unit: 'lb 5oz' },
    ])
    // A shared unit sits after the second amount.
    expect(numbers('2 + 3 dl vettä')).toEqual([
      { numbers: ['2 integer'], unit: 'dl' },
      { numbers: ['3 integer'], unit: 'dl' },
    ])
  })

  it('links each quantity to the one it describes', () => {
    const links = (line: string) =>
      parse(line).quantities.map(
        (q) =>
          `${q.role}${q.of === null ? '' : ` of ${q.of}`}${q.scales ? '' : ' fixed'}`,
      )
    expect(
      links(
        'one 13.75-ounce (390g) can artichoke hearts, drained and quartered',
      ),
    ).toEqual(['main', 'each of 0 fixed', 'same of 1 fixed'])
    expect(
      links('1 ps (350 g) salottisipuleita (tai muita pikkusipuleita)'),
    ).toEqual(['main', 'total of 0'])
    expect(
      links(
        '1/4 cup (53g) coconut oil or 4 tablespoons (57g) butter, at room temperature',
      ),
    ).toEqual(['main', 'same of 0', 'other', 'same of 2'])
  })

  it('reads times, percentages, servings and note references as no amount', () => {
    const distractors = (line: string) => {
      const text = canonical(line)
      return scan(text, 0, optionsOf(line)).distractors.map(
        (d) => `${d.type} ${text.slice(d.at[0], d.at[1])}`,
      )
    }
    expect(
      distractors(
        '300g/10½oz white basmati rice, soaked in cold water for 30–40 minutes',
      ),
    ).toEqual(['duration 30–40 minutes'])
    expect(distractors('250g.prk rahkajogurttia (Milbona 0,9%)')).toEqual([
      'percentage 0,9%',
    ])
    expect(distractors('kakkupohja, valmis 8-10hlö (Rainbow)')).toEqual([
      'servings 8-10hlö',
    ])
    expect(
      distractors(
        '800g / 24 oz (2 cans) white beans (like cannellini, navy/haricot, butter beans) (, drained (Note 1 & 3))',
      ),
    ).toEqual(['reference Note 1 & 3'])
  })

  it('keeps every number span readable as its value', () => {
    for (const line of ingredientLines) {
      for (const q of parseIngredient(line.text, line).quantities) {
        for (const n of q.numbers) {
          if (n.form === 'word') continue
          const text = canonical(line.text)
          expect(readNumber(text, n.at[0], line.language)?.value).toBe(n.value)
        }
      }
    }
  })
})
