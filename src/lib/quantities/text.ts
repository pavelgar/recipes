// Characters that sites use interchangeably, kept in one place so every
// reader accepts the same ones.

// Spaces that may sit inside an amount, including the no-break and thin
// spaces some sites use.
export const SPACE = String.raw`[ \t\u00a0\u2009\u202f]`
// Hyphens that join a number to a word or a whole number to a fraction:
// "9-inch", "1-1/2". Hyphen-minus, hyphen, non-breaking hyphen.
export const HYPHEN = String.raw`[\-\u2010\u2011]`
// Dashes between the numbers of a range: the hyphens, en dash, em dash and
// minus sign.
export const DASH = String.raw`[\-\u2010\u2011\u2013\u2014\u2212]`
// Signs written before a temperature below zero: "-18 °C", "–18 asteeseen".
export const MINUS = String.raw`[\-\u2212\u2013]`
// The slash of a fraction: "1/2", "1⁄2".
export const FRACTION_SLASH = String.raw`[/\u2044]`
// Inch marks: 2", 2″, 2”.
export const INCH_MARK = String.raw`["\u2033\u201d]`
// Degree signs, including the ordinal and ring look-alikes: °, º, ˚.
export const DEGREE = String.raw`[°º˚]`
// The times sign of a size or a pack: "2 x 150g", "5 × 65 g".
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
