// Unicode in one form, with each run of whitespace made one space.
export function normalLine(text: string): string {
  return text.normalize('NFC').replace(/\s+/g, ' ').trim()
}
