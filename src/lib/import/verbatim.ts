// Checks what AI read from a text against that text. The model is told to
// copy lines as written, but may still reword one, fix its spelling or
// make it up. Every line it gives is looked for in the text, ignoring
// spacing and letter case: a line found there is taken as the text writes
// it, and one that isn't is kept as the model wrote it, for the editor to
// mark.

export type Checked = {
  // The line as the source writes it, if found there, with its spacing
  // made single. Otherwise as the model wrote it.
  readonly text: string
  readonly found: boolean
}

// Unicode in one form, and any run of spaces or line breaks one space: a
// step cut across two lines of the page is one line of the recipe.
function normal(text: string): string {
  return text.normalize('NFC').replace(/\s+/g, ' ').trim()
}

export function sourceChecker(source: string): (line: string) => Checked {
  const haystack = normal(source)
  const lower = haystack.toLowerCase()
  // Lowercasing can change a text's length ("İ"), which would put a match
  // found in the lowercased text in the wrong place in the source. Then
  // letter case counts.
  const caseless = lower.length === haystack.length
  return (line) => {
    const text = normal(line)
    if (text === '') return { text, found: true }
    if (foundAt(haystack, text) !== -1) return { text, found: true }
    const needle = text.toLowerCase()
    if (caseless && needle.length === text.length) {
      const at = foundAt(lower, needle)
      if (at !== -1) {
        return { text: haystack.slice(at, at + text.length), found: true }
      }
    }
    return { text, found: false }
  }
}

const WORD = /[\p{L}\p{N}]/u

// Where the text has the needle as whole words, or -1: not inside a word
// or a number, so servings of "4" aren't found in "45 minuuttia".
function foundAt(text: string, needle: string): number {
  for (
    let at = text.indexOf(needle);
    at !== -1;
    at = text.indexOf(needle, at + 1)
  ) {
    const end = at + needle.length
    const cutsIn = (inside: string, outside: string | undefined) =>
      outside !== undefined && WORD.test(inside) && WORD.test(outside)
    if (
      !cutsIn(needle[0], text[at - 1]) &&
      !cutsIn(needle[needle.length - 1], text[end])
    ) {
      return at
    }
  }
  return -1
}
