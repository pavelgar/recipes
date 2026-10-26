import { normalLine } from '@/lib/text'

// Tidy steps may move line boundaries, drop step numbers and end a
// heading with a colon. Spaces inside a line still separate words and
// numbers, so they must match the source.
const STEP_NUMBER = /^\d{1,2}[.)](?!\d)\s*/

// The same cleanup as a tidy answer, for detecting an unchanged result.
export function tidiedAlready(steps: string): string {
  return steps.split('\n').map(normalLine).filter(Boolean).join('\n')
}

export function tidiedSteps(
  steps: string,
  lines: ReadonlyArray<string>,
): string | null {
  const source = normalLine(steps)
  let at = 0
  const result: Array<string> = []
  for (const written of lines) {
    const line = normalLine(written)
    if (line === '') continue
    // Whitespace can disappear at a new line boundary only.
    if (source[at] === ' ') at++
    const end = matchedEnd(source, at, line)
    if (end === null) return null
    at = end
    result.push(line)
  }
  return at === source.length ? result.join('\n') : null
}

function matchedEnd(source: string, at: number, line: string): number | null {
  const number = STEP_NUMBER.exec(source.slice(at))?.[0] ?? ''
  const texts = line.endsWith(':') ? [line, line.slice(0, -1)] : [line]
  for (const text of texts) {
    if (text !== '' && source.startsWith(text, at)) return at + text.length
    if (number === '') continue
    const afterNumber = at + number.length
    // A kept number can have a space after it even if the source forgot
    // it ("2.In a bowl"). A dropped number is allowed at this boundary too.
    const kept = STEP_NUMBER.exec(text)?.[0]
    const rest = kept?.trim() === number.trim() ? text.slice(kept.length) : text
    if (rest !== '' && source.startsWith(rest, afterNumber)) {
      return afterNumber + rest.length
    }
  }
  return null
}
