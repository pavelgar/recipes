import { m } from '@/paraglide/messages'
import type { Language, MeasuringSystem } from '@/lib/quantities'

// What the interface calls a recipe's language and measuring system.

export const LANGUAGE_NAMES: Record<Language, () => string> = {
  fi: m.language_fi,
  en: m.language_en,
}

// Beside a label: "Measures: US".
export const SYSTEM_NAMES: Record<MeasuringSystem, () => string> = {
  us: m.measures_us,
  british: m.measures_british,
  australian: m.measures_australian,
  metric: m.measures_metric,
}

// As a choice on its own, without a label beside it: "US measures".
export const SYSTEM_CHOICES: Record<MeasuringSystem, () => string> = {
  us: m.measures_choice_us,
  british: m.measures_choice_british,
  australian: m.measures_choice_australian,
  metric: m.measures_choice_metric,
}
