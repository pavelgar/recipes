import { omit } from 'es-toolkit'
import { textBefore } from '@/core/quantities/text'
import type { Quantity, Read } from '@/core/quantities/scan'

// What a quantity means in an ingredient line or step: pass 2's answer.

export type Role =
  // The amount an ingredient line is about, which scales with servings: "2
  // dl" in "2 dl maitoa".
  | 'main'
  // The same as the quantity it belongs to, written another way: "4½oz" in
  // "125g/4½oz", "(1 prk)" after "400 g", "(240 ml)" after "1 cup".
  | 'same'
  // The size of one of what it belongs to, which stays fixed when servings
  // change: "170 g" in "2 pkt (à 170 g)", "14 ounce" in "1 (14 ounce) can".
  | 'each'
  // The size of everything it belongs to, which scales: "400 g" in "1 prk
  // (400 g)".
  | 'total'
  // Any other quantity: alternatives and additions ("tai 2 tl", "plus 2
  // tbsp"), counts, lengths, temperatures and sizes.
  | 'other'

export type LineQuantity = Quantity & {
  readonly role: Role
  // The quantity it belongs to, as an index into the same list: the amount
  // a "same", "each" or "total" describes.
  readonly of: number | null
  // Whether it changes with servings. Nothing in a step does; in an
  // ingredient line amounts do, except the size of one piece or package,
  // lengths, temperatures and sizes.
  readonly scales: boolean
}

// A read with the role pass 2 gave it. Links are indices into the reads.
export type Placed = {
  readonly read: Read
  readonly role: Role
  readonly of: number | null
}

// The quantity a read holds, without what pass 1 noted about the text.
export function quantityOf(read: Read): Quantity {
  // Omit's type loses the union's variants; only scan metadata is removed.
  return omit(read, ['link', 'mark', 'paren', 'leading']) as Quantity
}

// Drops the reads that weren't placed and turns links into indices of the
// list that remains. build sees the quantities made so far, so a "same" can
// follow its owner's scaling.
export function keepPlaced(
  placed: ReadonlyArray<Placed | null>,
  build: (
    p: Placed,
    of: number | null,
    i: number,
    done: ReadonlyArray<LineQuantity>,
  ) => LineQuantity,
): Array<LineQuantity> {
  const index = new Map<number, number>()
  placed.forEach((p, i) => {
    if (p) index.set(i, index.size)
  })
  const out: Array<LineQuantity> = []
  placed.forEach((p, i) => {
    if (!p) return
    const of = p.of === null ? null : (index.get(p.of) ?? null)
    out.push(build(p, of, i, out))
  })
  return out
}

const PLUS_BEFORE = /(?:\bplus|\+)\s*$/i

// Whether "plus" or "+" comes right before pos. What follows it is added to
// the amount before, so an amount in parentheses after it is the total of
// both, not the same amount again: "1 cup plus 2 tablespoons (134g)".
export function afterPlus(text: string, pos: number): boolean {
  return PLUS_BEFORE.test(textBefore(text, pos))
}
