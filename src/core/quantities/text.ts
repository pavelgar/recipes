// Characters that sites use interchangeably. The readers work on a
// canonical copy of the text, in which each is replaced by one character,
// so every rule accepts the same ones. Each replacement is one character
// for one, so a position in the copy is the same position in the original,
// which is what the presenter shows.
const CANONICAL: ReadonlyArray<readonly [RegExp, string]> = [
  // Tabs and the no-break, thin and other spaces some sites use.
  [/[\t\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, ' '],
  // Hyphen, non-breaking hyphen and minus sign, which join a number to a
  // word or a whole number to a fraction: "9‑inch", "1−1/2".
  [/[\u2010\u2011\u2212]/g, '-'],
  // The fraction slash: "1⁄2".
  [/\u2044/g, '/'],
  // Inch marks: 2″, 2”.
  [/[\u2033\u201d]/g, '"'],
  // The ordinal and ring look-alikes of the degree sign: 180º, 180˚.
  [/[\u00ba\u02da]/g, '°'],
]

export function canonical(text: string): string {
  return CANONICAL.reduce((s, [re, to]) => s.replace(re, to), text)
}

// Dashes between the numbers of a range: hyphen, en dash, em dash. En and
// em dashes stay apart from hyphens, since they don't join words.
export const DASH = String.raw`[\-\u2013\u2014]`
// Signs written before a temperature below zero: "-18 °C", "–18 asteeseen".
export const MINUS = String.raw`[\-\u2013]`
// The times sign of a size or a pack: "2 x 150g", "5 × 65 g". "×" stays
// itself, because "x" is a letter, and a number glued to a letter isn't
// read: "2×150g".
export const TIMES = String.raw`[x×]`

// Runs a sticky regular expression at pos.
export function matchAt(
  re: RegExp,
  text: string,
  pos: number,
): RegExpExecArray | null {
  re.lastIndex = pos
  return re.exec(text)
}

// Where a sticky regular expression's match at pos ends, if it matches.
export function endOf(re: RegExp, text: string, pos: number): number | null {
  const m = matchAt(re, text, pos)
  return m ? pos + m[0].length : null
}

export function skipSpace(text: string, pos: number): number {
  while (pos < text.length && /\s/.test(text[pos])) pos++
  return pos
}

// The text just before pos, for rules that look back a few words. Bounded,
// so that scanning a long text stays linear.
export function textBefore(text: string, pos: number, length = 40): string {
  return text.slice(Math.max(0, pos - length), pos)
}
