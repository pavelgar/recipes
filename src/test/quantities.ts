import type { ParsedIngredient } from '@/lib/quantities/ingredient'
import type { Value } from '@/lib/quantities/numbers'
import type { Amount } from '@/lib/quantities/quantity'
import type { StepQuantity } from '@/lib/quantities/steps'

// Short descriptions of parse results, so tests read as a table:
// "counted 1 pss | total 350 g", "measured ~1 tsp", "125 g = 4.5 oz".

const round = (n: number) => String(Math.round(n * 1000) / 1000)

export function describeValue(value: Value): string {
  return typeof value === 'number'
    ? round(value)
    : `${round(value.min)}-${round(value.max)}`
}

export function describeAmount(amount: Amount): string {
  const approx = amount.approximate ? '~' : ''
  const unit = amount.unit ? ` ${amount.unit.id}` : ''
  const alt = amount.alt ? ` = ${describeAmount(amount.alt)}` : ''
  return `${approx}${describeValue(amount.value)}${unit}${alt}`
}

export function describeIngredient(parsed: ParsedIngredient): string {
  const amount = parsed.amount ? ` ${describeAmount(parsed.amount)}` : ''
  const extra = parsed.extra
    ? ` | ${parsed.extra.role} ${describeAmount(parsed.extra)}`
    : ''
  return `${parsed.result}${amount}${extra}`
}

export function describeStepQuantity(q: StepQuantity): string {
  switch (q.type) {
    case 'temperature':
      return `${describeValue(q.value)} ${q.scaleWritten ? '' : '?'}°${q.scale}${q.bothGiven ? ' both' : ''}`
    case 'dimensions': {
      const alt = q.alt
        ? ` = ${q.alt.values.map(round).join('x')} ${q.alt.unit.id}`
        : ''
      return `${q.values.map(round).join('x')} ${q.unit.id}${alt}`
    }
    case 'amount':
      return describeAmount(q)
  }
}
