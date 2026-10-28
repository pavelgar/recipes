// The times a step mentions ("3 minutes", "noin 25–30 minuuttia", "1 hr 45
// min"), for starting a timer from them, in the languages the app reads
// quantities in.

import type { Language } from '@/lib/quantities'

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

// The number, or the shorter end of a range, its unit, and minutes added
// after hours ("1 hr 45 min", "1 tunti ja 15 minuuttia").
const PATTERNS = Object.fromEntries(
  Object.entries(WORDS).map(([language, w]) => [
    language,
    new RegExp(
      String.raw`(?<![\d.,/])(?:(${NUMBER})\s*(?:${w.range})\s*)?(${NUMBER})\s*` +
        String.raw`(${w.hours}|${w.minutes}|${w.seconds})(?![\p{L}\d])` +
        String.raw`(?:\s*(?:${w.and}\s+)?(\d+)\s*(?:${w.minutes})(?![\p{L}\d]))?`,
      'giu',
    ),
  ]),
) as Record<Language, RegExp>

function unitSeconds(unit: string, language: Language): number {
  const u = unit.toLowerCase()
  if (new RegExp(`^(?:${WORDS[language].hours})$`, 'u').test(u)) return 3600
  if (new RegExp(`^(?:${WORDS[language].seconds})$`, 'u').test(u)) return 1
  return 60
}

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
  for (const match of text.matchAll(PATTERNS[language])) {
    const [whole, low, high, unit, extra] = match as unknown as [
      string,
      string | undefined,
      string,
      string,
      string | undefined,
    ]
    let seconds = toNumber(low ?? high) * unitSeconds(unit, language)
    if (extra) seconds += Number(extra) * 60
    if (!seconds) continue
    if (match.index > last) out.push(text.slice(last, match.index))
    out.push({ text: whole, seconds: Math.round(seconds) })
    last = match.index + whole.length
  }
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
