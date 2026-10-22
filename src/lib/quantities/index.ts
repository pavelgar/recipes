// The quantities library: reads amounts, temperatures and sizes in recipe
// text without changing it, says what each one means for the recipe, and
// shows them scaled to the servings and converted to the device's unit
// system.

export { parseIngredient } from '@/lib/quantities/ingredient'
export { presentIngredient, presentStep } from '@/lib/quantities/present'
export { scanStep } from '@/lib/quantities/steps'
export { isMeasure, UNITS } from '@/lib/quantities/units'
export type {
  IngredientOptions,
  IngredientResult,
  ParsedIngredient,
} from '@/lib/quantities/ingredient'
export type { LineQuantity, Role } from '@/lib/quantities/line'
export type { DisplaySystem } from '@/lib/quantities/measures'
export type {
  Presented,
  PresentOptions,
  Segment,
} from '@/lib/quantities/present'
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
