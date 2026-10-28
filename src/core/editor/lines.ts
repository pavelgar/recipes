import { parseIngredient, scanStep } from '@/core/quantities'
import type { Section } from '@/server/db/schema'
import type { Language, MeasuringSystem } from '@/core/quantities'

// The editor writes ingredients and steps as text, one line each. A line
// with no amount that ends with a colon is a section heading:
// "Etikkaliemi:", as Kotiliesi publishes it. In a language the app has no
// rules for, amounts aren't read, so any line ending with a colon is one.

export type LineKind = 'ingredient' | 'step'

export type LineOptions = {
  // The rules of the recipe's language, or null without them.
  readonly language: Language | null
  readonly system: MeasuringSystem
}

export function isHeading(
  line: string,
  kind: LineKind,
  opts: LineOptions,
): boolean {
  const text = line.trim()
  if (text.length < 2 || !text.endsWith(':')) return false
  const { language, system } = opts
  if (language === null) return true
  return kind === 'ingredient'
    ? parseIngredient(text, { language, system }).result === 'no-amount'
    : scanStep(text, { language, system }).length === 0
}

// The editor's text as sections. Lines before the first heading form a
// section without one. Blank lines only space the text out, and a heading
// with no lines under it is dropped.
export function sectionsFromText(
  text: string,
  kind: LineKind,
  opts: LineOptions,
): Array<Section> {
  const sections: Array<{ heading: string | null; lines: Array<string> }> = [
    { heading: null, lines: [] },
  ]
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line === '') continue
    if (isHeading(line, kind, opts)) {
      sections.push({ heading: line.slice(0, -1).trim(), lines: [] })
    } else {
      sections[sections.length - 1].lines.push(line)
    }
  }
  return sections.filter((section) => section.lines.length > 0)
}

// Sections as the editor writes them: each heading on a line of its own,
// ending with a colon.
export function textFromSections(sections: ReadonlyArray<Section>): string {
  return sections
    .flatMap((section) => [
      ...(section.heading === null
        ? []
        : [`${section.heading.replace(/\s*:\s*$/, '')}:`]),
      ...section.lines,
    ])
    .join('\n')
}

// What the editor highlights in a line as it's typed: a heading, or the
// amounts and units the app recognised. What it couldn't place stays plain.
export type Mark = {
  readonly start: number
  readonly end: number
  readonly kind: 'quantity' | 'heading'
}

export function marksOf(
  line: string,
  kind: LineKind,
  opts: LineOptions,
): Array<Mark> {
  if (line.trim() === '') return []
  if (isHeading(line, kind, opts)) {
    const start = line.length - line.trimStart().length
    return [{ start, end: line.trimEnd().length, kind: 'heading' }]
  }
  const { language, system } = opts
  if (language === null) return []
  const quantities =
    kind === 'step'
      ? scanStep(line, { language, system })
      : parseIngredient(line, { language, system }).quantities
  return quantities.map(({ at: [start, end] }) => ({
    start,
    end,
    kind: 'quantity',
  }))
}
