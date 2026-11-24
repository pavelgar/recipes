import type { Section } from '@/core/recipe/section'

// A short fingerprint of a line's text (FNV-1a).
function fingerprint(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

// Each line's key, for crossing it off: its text, and which line with that
// text it is, since a recipe can give one twice ("1 tl suolaa").
export function lineKeys(
  sections: ReadonlyArray<Section>,
  kind: 'ingredient' | 'step',
): Array<Array<string>> {
  const seen = new Map<string, number>()
  return sections.map((section) =>
    section.lines.map((line) => {
      const text = fingerprint(line)
      const repeat = seen.get(text) ?? 0
      seen.set(text, repeat + 1)
      return `${kind}-${text}-${repeat}`
    }),
  )
}
