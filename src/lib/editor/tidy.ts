// Tidy steps puts each step on its own line. The model may only:
// - split a line, or join two, and add or remove spaces,
// - drop a step's own number from the start of a line ("2.", "3)"),
// - end a heading it put on its own line with the colon that makes it one.
// Anything else, a word changed, added or left out, rejects its answer.

// The text without spaces or line breaks, Unicode in one form.
function squeezed(text: string): string {
  return text.normalize('NFC').replace(/\s+/g, '')
}

// A step's own number, as it starts a step: "2." in "2.In a bowl", but not
// in "2.5 dl".
const STEP_NUMBER = /^\d{1,2}[.)](?!\d)/

// The steps as the model tidied them, one per line, or null if it changed
// more than tidying may.
export function tidiedSteps(
  steps: string,
  lines: ReadonlyArray<string>,
): string | null {
  const source = squeezed(steps)
  let at = 0
  const result: Array<string> = []
  for (const written of lines) {
    const line = written.normalize('NFC').replace(/\s+/g, ' ').trim()
    if (line === '') continue
    const length = matchedLength(source, at, squeezed(line))
    if (length === null) return null
    at += length
    result.push(line)
  }
  return at === source.length ? result.join('\n') : null
}

// How much of the source, from where it's read up to, a tidied line
// covers: the line itself, after a step number it dropped, and without a
// colon it added.
function matchedLength(source: string, at: number, line: string) {
  const number = STEP_NUMBER.exec(source.slice(at))?.[0] ?? ''
  const texts = line.endsWith(':') ? [line, line.slice(0, -1)] : [line]
  for (const text of texts) {
    for (const skip of new Set([0, number.length])) {
      if (text !== '' && source.startsWith(text, at + skip)) {
        return skip + text.length
      }
    }
  }
  return null
}
