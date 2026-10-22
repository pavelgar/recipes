// The quantities library: reads amounts, temperatures and sizes in recipe
// text without changing it, and says what each one means for the recipe.

export { parseIngredient } from '@/lib/quantities/ingredient'
export { scanStep } from '@/lib/quantities/steps'
export { isMeasure, UNITS } from '@/lib/quantities/units'
export type {
  IngredientOptions,
  IngredientResult,
  ParsedIngredient,
} from '@/lib/quantities/ingredient'
export type { LineQuantity, Role } from '@/lib/quantities/line'
export type {
  Language,
  NumberForm,
  Range,
  Value,
} from '@/lib/quantities/numbers'
export type { Amount, Span, WrittenNumber } from '@/lib/quantities/quantity'
export type {
  Dimensions,
  MeasuringSystem,
  Quantity,
  Temperature,
} from '@/lib/quantities/scan'
export type { StepOptions } from '@/lib/quantities/steps'
export type { Unit, UnitId, UnitKind } from '@/lib/quantities/units'
