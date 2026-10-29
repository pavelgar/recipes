import type { Language, MeasuringSystem } from '@/core/quantities'

// The values a recipe's language and measuring system can take. Kept apart
// from the table definitions, so the editor can list them without bringing
// the database code into the browser.

export const LANGUAGES = ['fi', 'en'] as const satisfies ReadonlyArray<Language>

export const MEASURING_SYSTEMS = [
  'us',
  'british',
  'australian',
  'metric',
] as const satisfies ReadonlyArray<MeasuringSystem>
