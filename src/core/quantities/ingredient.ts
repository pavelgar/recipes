import { isMaustemitta } from '@/core/quantities/ambiguity'
import { afterPlus, keepPlaced, quantityOf } from '@/core/quantities/line'
import { FRACTION_CHARS, readApproximately } from '@/core/quantities/numbers'
import {
  MAUSTEMITTA,
  readQuantity,
  readUnitAfter,
  readWordQuantity,
  toAmount,
} from '@/core/quantities/quantity'
import {
  amountOf,
  parenReads,
  readParenSize,
  readSize,
  readSlashAlt,
  readSlashed,
  scan,
  TIMES_SIGN,
  unitOf,
} from '@/core/quantities/scan'
import {
  canonical,
  endOf,
  skipSpace,
  TIMES,
  textBefore,
} from '@/core/quantities/text'
import { isMeasure } from '@/core/quantities/units'
import type { Language } from '@/core/quantities/numbers'
import type {
  QuantityMatch,
  ReadOptions,
  Span,
} from '@/core/quantities/quantity'
import type {
  Distractor,
  Link,
  MeasuringSystem,
  Quantity,
  Read,
} from '@/core/quantities/scan'
import type { Unit } from '@/core/quantities/units'
import type { LineQuantity, Placed, Role } from '@/core/quantities/line'

export type IngredientResult =
  // An amount with a volume, weight or length unit. Scales and converts.
  | 'measured'
  // An amount with a package, count or pinch unit, or no unit. Scales.
  | 'counted'
  // No amount to scale: "suolaa". Shown as written.
  | 'no-amount'
  // A number the parser couldn't place. Shown as written, not scaled.
  | 'unrecognised'

export type ParsedIngredient = {
  readonly text: string
  readonly result: IngredientResult
  // In the order of the text. Sizes written inside the main amount ("1 (14
  // ounce) can") come right after it.
  readonly quantities: ReadonlyArray<LineQuantity>
}

export type IngredientOptions = {
  readonly language: Language
  // Gives a temperature without a scale its scale, as in steps: "(110°)".
  readonly system: MeasuringSystem
}

// --- Pass 1: the amount at the start of the line ---

// After an amount without a unit, a second amount the parser shouldn't
// guess at: "4 x 3cm / 1 x 2"", "2 + 2 eggs".
const JOINED = new RegExp(
  String.raw`\s*(?:\+|plus\b|minus\b|&|\/)\s*[\d${FRACTION_CHARS}]`,
  'iy',
)
const PLUS = /\s*(?:\+|plus\b)\s*/iy

// Reads the number (or number word) at the start of the line.
function readLeadingQuantity(
  text: string,
  pos: number,
  opts: ReadOptions,
): QuantityMatch | null {
  const q = readQuantity(text, pos, opts)
  if (q) return q
  const word = readWordQuantity(text, pos, opts)
  if (word?.article && !word.unit) return null
  return word
}

type EachSize = {
  readonly reads: Array<Read>
  readonly unit: Unit | null
  readonly unitAt: Span | null
  readonly end: number
}

// Reads the size of each item after a count: "x 150g cartons", "13.75-ounce
// (390g) can", "200 g:n pakettia". Returns the size and, if one follows,
// the package or count unit.
function readEachSize(
  text: string,
  pos: number,
  opts: ReadOptions,
): EachSize | null {
  const size = readQuantity(text, pos, opts)
  if (!size || !isMeasure(size.unit)) return null
  const reads: Array<Read> = [
    leadingRead(amountOf(size), { to: 0, by: 'size' }),
  ]
  const slashed = readSlashAlt(text, size.end, size.unit, opts)
  let end = slashed?.end ?? size.end
  if (slashed) {
    reads.push(leadingRead(amountOf(slashed), { to: 1, by: 'slash' }))
  } else {
    const paren = readParenSize(text, skipSpace(text, end), opts)
    if (
      paren &&
      !paren.mark &&
      isMeasure(paren.q.unit) &&
      paren.q.unit?.id !== size.unit?.id
    ) {
      reads.push(...parenReads(paren, { to: 1, by: 'paren' }, 2).map(asLeading))
      end = paren.at[1]
    }
  }
  const word = readUnitAfter(text, end, opts)
  const packaged = word && !isMeasure(word.unit) ? word : null
  return {
    reads,
    unit: packaged?.unit ?? null,
    unitAt: packaged ? [packaged.start, packaged.end] : null,
    end: packaged?.end ?? end,
  }
}

const leadingRead = (q: Quantity, link: Link | null = null): Read => ({
  ...q,
  link,
  mark: null,
  paren: null,
  leading: true,
})

const asLeading = (r: Read): Read => ({ ...r, leading: true })

type Leading = {
  // The line's amount first, then what the text attaches to it.
  readonly reads: Array<Read>
  readonly end: number
}

// Reads the amount at the start of a line and the sizes and other units
// written right after it: "2 pkt (à 170 g)", "1 (14 ounce) can", "2 x 150g
// cartons", "125g/4½oz", "2 + 1 rkl".
function readLeading(
  text: string,
  pos: number,
  opts: ReadOptions,
): Leading | 'unrecognised' | null {
  const approxEnd = readApproximately(text, pos)
  const start = approxEnd ?? pos
  const q = readLeadingQuantity(text, start, opts)
  if (!q) return null

  let unit: Unit | null = q.unit
  let unitAt = q.unitAt
  let end = q.end
  const attached: Array<Read> = []

  if (!unit) {
    const timesEnd = endOf(TIMES_SIGN, text, q.end)
    const sizeAt = skipSpace(text, q.end)
    // "2 x 150g cartons", "½ x 400g/14 oz tin", or with no "x": "2 14.5-ounce
    // cans", "2 200 g:n pakettia"
    const each =
      timesEnd !== null
        ? readEachSize(text, timesEnd, opts)
        : sizeAt > q.end
          ? readEachSize(text, sizeAt, opts)
          : null
    const paren =
      timesEnd === null && !each ? readParenSize(text, sizeAt, opts) : null
    if (each) {
      attached.push(...each.reads)
      end = each.end
      if (each.unit) {
        unit = each.unit
        unitAt = each.unitAt
      }
    } else if (paren) {
      // "1 (14 ounce) can" is a size of the can, "4 (800g) chicken breast
      // fillets" a size of all four.
      const word = readUnitAfter(text, paren.at[1], opts)
      const packaged =
        word?.unit.kind === 'package' || word?.unit.kind === 'count'
      const by = packaged ? 'size' : 'paren'
      attached.push(...parenReads(paren, { to: 0, by }, 1).map(asLeading))
      end = paren.at[1]
      if (word && packaged) {
        unit = word.unit
        unitAt = [word.start, word.end]
        end = word.end
      }
    }
  } else {
    const slashAlt = isMeasure(unit)
      ? readSlashAlt(text, end, unit, opts)
      : null
    const slashed = slashAlt ? null : readSlashed(text, end, opts)
    const paren =
      slashAlt || slashed
        ? null
        : readParenSize(text, skipSpace(text, end), opts)
    if (slashAlt) {
      // "125g/4½oz"
      attached.push(leadingRead(amountOf(slashAlt), { to: 0, by: 'slash' }))
      end = slashAlt.end
    } else if (slashed?.unit && isMeasure(unit)) {
      // "250g / 2 sticks"
      attached.push(leadingRead(amountOf(slashed), { to: 0, by: 'slash' }))
      end = slashed.end
    } else if (paren) {
      // "2 2/3 cups (320g)", "1 prk (400 g)", "2 pkt (à 170 g)"
      attached.push(
        ...parenReads(paren, { to: 0, by: 'paren' }, 1).map(asLeading),
      )
      end = paren.at[1]
    }
  }

  // "2 + 1 rkl", "1/4 plus 1/8 teaspoon": both amounts use the unit written
  // after the second. The second is read with the rest of the line.
  let shared = false
  if (!unit && attached.length === 0) {
    const plusEnd = endOf(PLUS, text, end)
    const next = plusEnd === null ? null : readQuantity(text, plusEnd, opts)
    if (next?.unit) {
      unit = next.unit
      unitAt = next.unitAt
      shared = true
    }
  }
  if (!unit && endOf(JOINED, text, end) !== null) return 'unrecognised'
  // "1 000 g": a number after the count that couldn't be read.
  if (
    !unit &&
    attached.length === 0 &&
    /\d/.test(text[skipSpace(text, end)] ?? '')
  ) {
    return 'unrecognised'
  }

  const main = leadingRead({
    type: 'amount',
    ...toAmount(q, approxEnd !== null),
    unit,
    unitAt,
    at: [q.start, unitAt && !shared ? Math.max(unitAt[1], q.end) : q.end],
  })
  return { reads: [main, ...attached], end }
}

// --- Pass 2: what each quantity means for the line ---

const STRAY_NUMBER = new RegExp(`[\\d${FRACTION_CHARS}]`)

// Whether text from start to end has a number outside the spans the
// parser understood: its quantities, or the times, percentages, servings
// and note references the scan found (see Distractor in scan.ts).
function hasStrayNumber(
  text: string,
  start: number,
  end: number,
  understood: ReadonlyArray<Span>,
): boolean {
  for (let i = start; i < end; i++) {
    if (!STRAY_NUMBER.test(text[i])) continue
    if (!understood.some(([s, e]) => i >= s && i < e)) return true
  }
  return false
}

// The role of a size in parentheses next to a package, a count or a plain
// number: "(à 170 g)" each, "(400 g)" total, "(1 prk)" the same, and
// lengths always each: "2 (9 inch) pie crusts".
function sizeRole(r: Read): Role {
  const unit = unitOf(r)
  if (!isMeasure(unit)) return 'same'
  if (r.mark) return r.mark
  return unit?.kind === 'length' ? 'each' : 'total'
}

// What a link written at the start of the line means.
function linkedRole(r: Read, owner: Read): Role {
  if (!r.link) return 'other'
  switch (r.link.by) {
    case 'slash':
      return 'same'
    case 'size':
      return r.mark ?? 'each'
    case 'paren':
      if (owner.link === null) {
        return isMeasure(unitOf(owner)) ? 'same' : sizeRole(r)
      }
      return 'same'
  }
}

// Whether r gives its owner again in another measure, rather than adding a
// package size: "125g/4½oz", "2 2/3 cups (320g)".
function isAlt(r: Read, owner: Read): boolean {
  return (
    r.link !== null &&
    r.link.by !== 'size' &&
    r.mark === null &&
    isMeasure(unitOf(r)) &&
    isMeasure(unitOf(owner))
  )
}

// --- Which later quantities count, and which scale ---

const ALTERNATIVE_BEFORE =
  /(?:\b(?:or|tai|plus)|\+)\s*(?:about|noin|n\.|~)?\s*$/i
const PLUS_AFTER = /\s*\+\s*\d/y

// Words after a measure that make it the size of one piece or package:
// "185g/6oz each", "(7- or 8-oz size)".
const EACH_OR_SIZE_AFTER = /\s*(?:each|size)\b/iy
// "à 200 g", and the package an amount is taken from: "(from 15-oz can)",
// "(from two 10-oz packages)".
const EACH_BEFORE =
  /(?:(?:^|\s)[àá]|\bfrom(?:\s+(?:a|an|one|two|three|\d+))?)\s*$/i
// A product's package size closing the line, after its name: "1 dl
// Apetina® Cheddar-mozzarella -raaste 200 g". The trademark sign tells a
// product name from words like "plus 1 tbsp".
const PRODUCT_NAME = /[®™].*\p{L}\S*\s+$/u

// Whether a measured amount after the line's amount changes with servings.
// It does, except the size of one piece or package: "185g/6oz each", "à 200
// g", "(from 15-oz can)", and a product's package size at the end of the
// line ("… Smetana laktoositon 150 g"). Lengths never do.
function measureScales(text: string, q: Quantity, end: number): boolean {
  if (q.type !== 'amount' || q.unit?.kind === 'length') return false
  if (endOf(EACH_OR_SIZE_AFTER, text, end) !== null) return false
  if (EACH_BEFORE.test(textBefore(text, q.at[0]))) return false
  const productSize =
    text.slice(end).trim() === '' && PRODUCT_NAME.test(text.slice(0, q.at[0]))
  return !productSize
}

// Counts later in the line: which say how much of the ingredient to use,
// and so scale, and which don't. See DESIGN.md, "Units".
//
// A count scales when "or", "tai", "plus" or "+" joins it to another amount
// ("12 standard or 24 small rolls", "(120 + 30)"), when it has a package or
// count unit ("(2 rs, à 200 g)", "6 - 8 big handfuls"), when it sits in
// parentheses ("(about 4 medium)", "((2 to 3 limes))", "(from 2 large
// eggs)") or when it follows "of" ("zest of 1 lemon"). Unless it is one of
// these, which never count:
// - pieces to cut into: "cut into 8 wedges", "sliced lengthways into 3"
// - what one package holds: "1 pkt (4 x 100 g)", "repeat x2"
// - a rate: "(n. 8-15 rapua ruokailijaa kohti)", "2 per person"
// - half of a pair the parser can't read: "(380/230 g)", net and drained
// Times, servings and note references ("for 30–40 minutes", "valmis
// 8-10hlö", "(Note 1 & 3)") aren't read as amounts at all.
const INTO_BEFORE = /\b(?:into|in)\s*$/i
const TIMES_AROUND = new RegExp(String.raw`(?<![\p{L}])${TIMES}\s*$`, 'u')
const TIMES_AFTER = new RegExp(
  String.raw`\s*${TIMES}\s*[\d${FRACTION_CHARS}]`,
  'y',
)
const RATE_AFTER = /[^,;()]*?\b(?:kohti|per)\b/iy
// A number glued to a word that isn't a unit: "2-layer".
const GLUED_WORD = /-?\p{L}/uy
const OF_BEFORE = /\bof\s*$/i
const SLASH_NUMBER_AFTER = /\/\s*\d/y

// How deep in parentheses each position of text is, so that "is this
// count in parentheses" is a lookup.
function parenDepths(text: string): Uint16Array {
  const depths = new Uint16Array(text.length + 1)
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    depths[i] = depth
    if (text[i] === '(') depth++
    else if (text[i] === ')' && depth > 0) depth--
  }
  depths[text.length] = depth
  return depths
}

function countKept(text: string, r: Read, depths: Uint16Array): boolean {
  // "1 plo (0": cut short, not an amount.
  if (r.type !== 'amount' || r.value === 0) return false
  const before = textBefore(text, r.at[0])
  const end = r.at[1]
  if (
    ALTERNATIVE_BEFORE.test(before) ||
    endOf(PLUS_AFTER, text, end) !== null
  ) {
    return true
  }
  if (
    INTO_BEFORE.test(before) ||
    TIMES_AROUND.test(before) ||
    endOf(TIMES_AFTER, text, end) !== null ||
    endOf(RATE_AFTER, text, end) !== null ||
    endOf(SLASH_NUMBER_AFTER, text, end) !== null ||
    (!r.unit && endOf(GLUED_WORD, text, end) !== null)
  ) {
    return false
  }
  return r.unit !== null || depths[r.at[0]] > 0 || OF_BEFORE.test(before)
}

// Whether a read after the line's amount belongs in the result: everything
// that converts, and the counts that scale.
function kept(text: string, r: Read, depths: Uint16Array): boolean {
  if (r.type !== 'amount' || isMeasure(r.unit)) return true
  return countKept(text, r, depths)
}

function laterScales(text: string, q: Quantity, end: number): boolean {
  return q.type === 'amount' && !isMeasure(q.unit)
    ? true
    : measureScales(text, q, end)
}

// "X plus Y (Z)": Z is usually the total of both, and belongs to X as its
// total: "1 cup plus 2 tablespoons (134g)". But when X already has its own
// amount in another unit, Z is Y's: "3/4 cup (90g) plus 1/3 cup (40g)".
// Returns X, or null when Z is Y's.
function plusTotalOf(
  text: string,
  reads: ReadonlyArray<Read>,
  placed: ReadonlyArray<Placed | null>,
  r: Read,
): number | null {
  if (r.link?.by !== 'paren') return null
  const owner = r.link.to
  if (!afterPlus(text, reads[owner].at[0])) return null
  let x = owner - 1
  while (x >= 0 && (placed[x]?.role === 'same' || !placed[x])) x--
  if (x < 0) return null
  const ownSame = placed.some(
    (p) => p?.role === 'same' && p.of === x && isMeasure(unitOf(p.read)),
  )
  return ownSame ? null : x
}

// Picks the amount in parentheses that belongs to the whole line: "Ison
// sitruunan mehu (90 ml)", "4 thick slices ciabatta bread (120g)". A number
// before it means the parentheses belong to something else: "… or 4
// tablespoons (57g) butter".
function lineParen(
  text: string,
  reads: ReadonlyArray<Read>,
  from: number,
  after: number,
  understood: ReadonlyArray<Span>,
): number | null {
  let best: number | null = null
  for (let i = from; i < reads.length; i++) {
    const r = reads[i]
    if (r.type !== 'amount' || !r.paren || !r.unit) continue
    if (r.link?.by === 'slash' || r.at[0] < after) continue
    if (best === null || r.paren[0] < (reads[best].paren?.[0] ?? Infinity)) {
      best = i
    }
  }
  if (best === null) return null
  const paren = reads[best].paren
  if (!paren || hasStrayNumber(text, after, paren[0], understood)) return null
  return best
}

// Picks the line's amount when none starts the line: the first amount that
// scales, unless a number the parser couldn't place comes before it.
// "Juustoraastetta tai 2 rkl korppujauhoja", "finely grated zest of 1
// lemon", "Ison sitruunan mehu (90 ml)".
function laterMain(
  text: string,
  reads: ReadonlyArray<Read>,
  depths: Uint16Array,
  understood: ReadonlyArray<Span>,
): number | null {
  for (let i = 0; i < reads.length; i++) {
    const r = reads[i]
    if (r.type !== 'amount' || r.link) continue
    if (!kept(text, r, depths) || !laterScales(text, r, r.at[1])) continue
    return hasStrayNumber(text, 0, r.at[0], understood) ? null : i
  }
  return null
}

function relate(
  text: string,
  reads: ReadonlyArray<Read>,
  leading: Leading | null,
  distractors: ReadonlyArray<Distractor>,
  opts: IngredientOptions,
): ParsedIngredient {
  const understood = distractors.map((d) => d.at)
  const placed: Array<Placed | null> = reads.map(() => null)
  const leadingCount = leading?.reads.length ?? 0
  const depths = parenDepths(text)
  let main: number | null = null

  if (leading) {
    main = 0
    placed[0] = { read: reads[0], role: 'main', of: null }
    for (let i = 1; i < leadingCount; i++) {
      const r = reads[i]
      const to = r.link?.to ?? 0
      placed[i] = { read: r, role: linkedRole(r, reads[to]), of: to }
    }
  } else {
    main = laterMain(text, reads, depths, understood)
    if (main !== null) {
      placed[main] = { read: reads[main], role: 'main', of: null }
    }
  }

  // An amount in parentheses later in the line belongs to the line's
  // amount, unless something already gives its size. Right after a package
  // with a size, it is the total: "two 8-ounce packages (452g)".
  let lineParenAt: Span | null = null
  if (main !== null) {
    const extras = reads.filter(
      (r, i) =>
        i !== main &&
        placed[i] &&
        r.link?.to === main &&
        !isAlt(r, reads[main]),
    )
    const after = leading?.end ?? reads[main].at[1]
    const p = lineParen(text, reads, main + 1, after, understood)
    const right = p !== null && reads[p].paren?.[0] === skipSpace(text, after)
    const onlySizes = extras.every((r) => r.link?.by === 'size')
    if (p !== null && (extras.length === 0 || (onlySizes && right))) {
      const r = reads[p]
      const role =
        extras.length > 0
          ? 'total'
          : isMeasure(unitOf(reads[main]))
            ? 'same'
            : sizeRole(r)
      placed[p] = { read: r, role, of: main }
      for (let i = p + 1; i < reads.length; i++) {
        if (reads[i].link?.to === p && reads[i].link?.by === 'slash') {
          placed[i] = { read: reads[i], role: 'same', of: p }
        }
      }
      lineParenAt = r.paren
    }
  }

  for (let i = leadingCount; i < reads.length; i++) {
    const r = reads[i]
    if (placed[i]) continue
    // What the line's parentheses hold besides their amount: "(4 x 100 g)".
    if (lineParenAt && r.at[0] >= lineParenAt[0] && r.at[1] <= lineParenAt[1]) {
      continue
    }
    const owner = r.link ? placed[r.link.to] : null
    const total = plusTotalOf(text, reads, placed, r)
    if (total !== null) {
      placed[i] = { read: { ...r, link: null }, role: 'total', of: total }
    } else if (r.link && owner) {
      placed[i] = { read: r, role: 'same', of: r.link.to }
    } else if (kept(text, r, depths)) {
      placed[i] = { read: { ...r, link: null }, role: 'other', of: null }
    }
  }

  if (main === null) {
    // "4 x 3cm / 1 x 2" piece of ginger" has sizes but no amount.
    const placedAt = placed.flatMap((p) => (p ? [p.read.at] : []))
    const stray = hasStrayNumber(text, 0, text.length, [
      ...understood,
      ...placedAt,
    ])
    return stray
      ? { text, result: 'unrecognised', quantities: [] }
      : { text, result: 'no-amount', quantities: finish(text, placed, opts) }
  }
  return {
    text,
    result: resultOf(reads[main]),
    quantities: finish(text, placed, opts),
  }
}

function resultOf(main: Read): IngredientResult {
  return isMeasure(unitOf(main)) ? 'measured' : 'counted'
}

// Works out which quantities scale, and gives the first amount of a
// Finnish line written "mm" its meaning, maustemitta.
function finish(
  text: string,
  placed: ReadonlyArray<Placed | null>,
  opts: IngredientOptions,
): Array<LineQuantity> {
  // Where a quantity ends when the same amount follows it: "each" in
  // "185g/6oz each" comes after the ounces.
  const ends = new Map<number, number>()
  for (const p of placed) {
    if (p?.role === 'same' && p.of !== null) {
      ends.set(p.of, Math.max(ends.get(p.of) ?? 0, p.read.at[1]))
    }
  }
  return keepPlaced(placed, (p, of, i, done) => {
    let q = quantityOf(p.read)
    if (
      q.type === 'amount' &&
      isMaustemitta(text, q.unitAt, opts.language, p.read.leading)
    ) {
      q = { ...q, unit: MAUSTEMITTA }
    }
    const scales =
      p.role === 'main' || p.role === 'total'
        ? true
        : p.role === 'each'
          ? false
          : p.role === 'same'
            ? of === null || done[of].scales
            : laterScales(text, q, ends.get(i) ?? q.at[1])
    return { ...q, role: p.role, of, scales }
  })
}

export function parseIngredient(
  text: string,
  opts: IngredientOptions,
): ParsedIngredient {
  // The line is read in its canonical form, whose spans are the line's.
  const seen = canonical(text)
  const read: ReadOptions = { language: opts.language }
  let start = skipSpace(seen, 0)
  // Optional ingredients come wrapped in parentheses: "(3-4 cl konjakkia)".
  if (seen[start] === '(' && seen.trimEnd().endsWith(')')) {
    start = skipSpace(seen, start + 1)
  }
  // A line that starts with a size has no amount to scale: "4 x 3cm / 1 x
  // 2" piece of ginger".
  const leading = readSize(seen, start, opts)
    ? null
    : readLeading(seen, start, read)
  if (leading === 'unrecognised') {
    return { text, result: 'unrecognised', quantities: [] }
  }
  const reads = leading ? [...leading.reads] : []
  const { distractors } = scan(seen, leading?.end ?? 0, opts, reads)
  return { ...relate(seen, reads, leading, distractors, opts), text }
}
