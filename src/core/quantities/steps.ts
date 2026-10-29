import { afterPlus, keepPlaced, quantityOf } from '@/core/quantities/line'
import { scan } from '@/core/quantities/scan'
import { isMeasure } from '@/core/quantities/units'
import { canonical } from '@/core/quantities/text'
import type { LineQuantity, Placed } from '@/core/quantities/line'
import type { Read, ScanOptions } from '@/core/quantities/scan'

export type StepOptions = ScanOptions

// What converts in a step: temperatures, sizes and amounts with a measure.
// Package and count units, bare numbers and times are left alone.
function converts(r: Read): boolean {
  return r.type !== 'amount' || isMeasure(r.unit)
}

const BOTH_GIVEN_GAP =
  /^\s*(?:fan(?:[- ]forced)?|kiertoilma\p{L}*)?\s*(?:[/(,]|or|tai)\s*$/iu

// Marks temperatures that sit together ("180C/160C fan/350F", "200C or
// 400F") as already giving both scales when the group has both °C and °F.
function markBothGiven(
  text: string,
  found: Array<LineQuantity>,
): Array<LineQuantity> {
  const out = [...found]
  let groupStart = 0
  for (let i = 1; i <= out.length; i++) {
    const prev = out[i - 1]
    const cur = out[i] as LineQuantity | undefined
    const joined =
      cur?.type === 'temperature' &&
      prev.type === 'temperature' &&
      BOTH_GIVEN_GAP.test(text.slice(prev.at[1], cur.at[0]))
    if (joined) continue
    const group = out.slice(groupStart, i)
    const scales = new Set(
      group.flatMap((q) => (q.type === 'temperature' ? [q.scale] : [])),
    )
    if (scales.size === 2) {
      for (let j = groupStart; j < i; j++) {
        const q = out[j]
        if (q.type === 'temperature') out[j] = { ...q, bothGiven: true }
      }
    }
    groupStart = i
  }
  return out
}

// Finds the temperatures, sizes and measured amounts in a step. A quantity
// written again in another unit ("26cm/10in", "200g (6½ ounces)") is the
// same as the one before it. Nothing in a step scales with servings.
export function scanStep(
  written: string,
  opts: StepOptions,
): Array<LineQuantity> {
  // The step is read in its canonical form, whose spans are the step's.
  const text = canonical(written)
  // Times, percentages and the like are left as written.
  const { reads } = scan(text, 0, opts)
  const placed: Array<Placed | null> = reads.map((r) => {
    if (!converts(r)) return null
    const owner = r.link ? reads[r.link.to] : null
    const plusTotal =
      r.link?.by === 'paren' && owner !== null && afterPlus(text, owner.at[0])
    return r.link && !plusTotal
      ? { read: r, role: 'same', of: r.link.to }
      : { read: r, role: 'other', of: null }
  })
  const found = keepPlaced(placed, (p, of) => ({
    ...quantityOf(p.read),
    role: p.role,
    of,
    scales: false,
  }))
  return markBothGiven(text, found)
}
