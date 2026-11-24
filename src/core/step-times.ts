// The times a step mentions ("3 minutes", "noin 25–30 minuuttia", "1 hr 45
// min"), for starting a timer from them, in the languages the app reads
// quantities in.

import type { Language } from '@/core/quantities'

// A number as steps write times: "3", "1,5", "1 1/2", "1/2", "1½", "½".
const NUMBER = String.raw`(?:\d+\s+\d\/\d|\d\/\d|\d+(?:[.,]\d+)?\s?½?|½)`

const WORDS = {
  en: {
    hours: String.raw`hours?|hrs?|h`,
    minutes: String.raw`minutes?|mins?|min`,
    seconds: String.raw`seconds?|secs?`,
    range: String.raw`–|-|to`,
    and: 'and',
  },
  fi: {
    hours: String.raw`tunt[a-zäö]*|tunn[a-zäö]*|h`,
    minutes: String.raw`minuut[a-zäö]*|min`,
    seconds: String.raw`sekunt[a-zäö]*|s`,
    range: String.raw`–|-|tai`,
    and: 'ja',
  },
} satisfies Record<Language, Record<string, string>>

// Each part of a duration has a number or range and its unit.
const PATTERNS = Object.fromEntries(
  Object.entries(WORDS).map(([language, w]) => [
    language,
    new RegExp(
      String.raw`(?<![\d.,/])(?:(${NUMBER})\s*(?:${w.range})\s*)?(${NUMBER})\s*` +
        String.raw`(?:(?<hours>${w.hours})|(?<minutes>${w.minutes})|(?<seconds>${w.seconds}))(?![\p{L}\d])`,
      'giu',
    ),
  ]),
) as Record<Language, RegExp>

// "1 1/2" → 1.5, "1½" → 1.5, "½" → 0.5, "1,5" → 1.5.
function toNumber(written: string): number {
  let n = 0
  let text = written.trim()
  if (text.includes('½')) {
    n += 0.5
    text = text.replace('½', '').trim()
  }
  for (const part of text.split(/\s+/)) {
    if (!part) continue
    const [top, bottom] = part.split('/')
    n += bottom ? Number(top) / Number(bottom) : Number(top.replace(',', '.'))
  }
  return n
}

export type StepTime = {
  // The time as the step writes it.
  readonly text: string
  readonly seconds: number
}

// Splits a step's text into plain text and the times in it. A range
// starts its timer at the shorter end, so nothing overcooks.
export function splitTimes(
  text: string,
  language: Language,
): Array<string | StepTime> {
  const out: Array<string | StepTime> = []
  let last = 0
  let duration:
    { start: number; end: number; seconds: number; unit: number } | undefined
  const emit = () => {
    if (!duration) return
    const seconds = Math.round(duration.seconds)
    if (!Number.isSafeInteger(seconds) || seconds <= 0) return
    if (duration.start > last) out.push(text.slice(last, duration.start))
    out.push({ text: text.slice(duration.start, duration.end), seconds })
    last = duration.end
  }
  const join = new RegExp(String.raw`^\s*(?:${WORDS[language].and}\s+)?$`, 'iu')
  for (const match of text.matchAll(PATTERNS[language])) {
    const [whole, low, high] = match
    const unit = match.groups?.hours ? 3600 : match.groups?.minutes ? 60 : 1
    const count = low ? Math.min(toNumber(low), toNumber(high)) : toNumber(high)
    const start = match.index
    const end = start + whole.length
    const seconds = count * unit
    if (
      duration &&
      unit < duration.unit &&
      join.test(text.slice(duration.end, start))
    ) {
      duration = {
        start: duration.start,
        end,
        seconds: duration.seconds + seconds,
        unit,
      }
    } else {
      emit()
      duration = { start, end, seconds, unit }
    }
  }
  emit()
  if (last < text.length) out.push(text.slice(last))
  return out
}

// Time left on a timer, as a clock: "4:05", "1:02:30".
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}
