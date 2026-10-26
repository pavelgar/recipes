// A step's own number, followed by a sentence, never an amount.
export function withoutStepNumber(line: string): string {
  return line.replace(/^\d{1,2}[.)]\s+(?=\p{Lu})/u, '')
}
