// The quantities library: reads amounts, temperatures and sizes in recipe
// text without changing it, says what each one means for the recipe, and
// shows them scaled to the servings and converted to the device's unit
// system.

export { parseIngredient } from '@/core/quantities/ingredient'
export { presentIngredient, presentStep } from '@/core/quantities/present'
export { scanStep } from '@/core/quantities/steps'
export { isMeasure, UNITS } from '@/core/quantities/units'
export type {
  IngredientOptions,
  IngredientResult,
  ParsedIngredient,
} from '@/core/quantities/ingredient'
export type { LineQuantity, Role } from '@/core/quantities/line'
export type { DisplaySystem } from '@/core/quantities/measures'
export type {
  Presented,
  PresentOptions,
  Segment,
} from '@/core/quantities/present'
export type {
  Language,
  NumberForm,
  Range,
  Value,
} from '@/core/quantities/numbers'
export type { Amount, Span, WrittenNumber } from '@/core/quantities/quantity'
export type {
  Dimensions,
  MeasuringSystem,
  Quantity,
  Temperature,
} from '@/core/quantities/scan'
export type { StepOptions } from '@/core/quantities/steps'
export type { Unit, UnitId, UnitKind } from '@/core/quantities/units'
