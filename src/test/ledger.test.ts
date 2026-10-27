import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkLedger, parseLedger } from '@/test/ledger'
import type { LedgerItem } from '@/test/ledger'

const ledger = (source: string, items: Array<LedgerItem>, sampled = false) => {
  const path = join(mkdtempSync(join(tmpdir(), 'ledger-')), 'ledger.txt')
  writeFileSync(path, source)
  return checkLedger({
    path,
    title: ['Test ledger.'],
    items,
    summarise: (_, entries) => `${entries.length}`,
    sampled,
  })
}

const file = (body: string, counts: string) =>
  `# Test ledger.\n#\n# ${counts}\n\n## site 1\n\n${body}`

describe('checkLedger', () => {
  const item = (reading: string): LedgerItem => ({
    group: 'site',
    text: 'line',
    reading: [reading],
  })

  it('passes when every reading matches', () => {
    const source = file(
      '✓ "line"\n  a\n',
      '1 entries: 1 checked, of which 0 wrong; 0 unchecked.',
    )
    expect(ledger(source, [item('a')]).problems).toEqual([])
  })

  it('records new lines to check', () => {
    const check = ledger('', [item('a')])
    expect(check.problems).toEqual(['new: site "line"\n    a'])
    expect(check.updated).toContain('! "line"\n  a\n')
    expect(check.updated).toContain(
      '# 1 entries: 0 checked, of which 0 wrong; 0 unchecked; 1 to check.',
    )
    expect(check.toCheck).toBe(1)
  })

  it('records new lines of a held-out ledger as unchecked', () => {
    const check = ledger('', [item('a')], true)
    expect(check.updated).toContain('? "line"\n  a\n')
    expect(check.toCheck).toBe(0)
  })

  it('turns an unchecked entry whose reading changed into one to check', () => {
    const source = file(
      '? "line"\n  a\n',
      '1 entries: 0 checked, of which 0 wrong; 1 unchecked.',
    )
    const check = ledger(source, [item('b')])
    expect(check.problems[0]).toMatch(/^changed/)
    expect(check.updated).toContain('! "line"\n  b\n')
  })

  it('keeps an unchecked entry whose reading stays the same', () => {
    const source = file(
      '? "line"\n  a\n',
      '1 entries: 0 checked, of which 0 wrong; 1 unchecked.',
    )
    expect(ledger(source, [item('a')]).problems).toEqual([])
  })

  it('fails while an entry is left to check', () => {
    const source = file(
      '! "line"\n  a\n',
      '1 entries: 0 checked, of which 0 wrong; 0 unchecked; 1 to check.',
    )
    const check = ledger(source, [item('a')])
    expect(check.problems).toEqual(['to check: site "line"\n    a'])
    expect(check.toCheck).toBe(1)
  })

  it('turns a changed checked reading into a wrong one wanting the old', () => {
    const source = file(
      '✓ "line"\n  a\n',
      '1 entries: 1 checked, of which 0 wrong; 0 unchecked.',
    )
    const check = ledger(source, [item('b')])
    expect(check.problems[0]).toMatch(/^checked reading changed/)
    expect(check.updated).toContain('✗ "line"\n  b\n  want: a\n')
  })

  it('turns a wrong reading that now matches its want into a checked one', () => {
    const source = file(
      '✗ "line"\n  b\n  want: a\n',
      '1 entries: 1 checked, of which 1 wrong; 0 unchecked.',
    )
    const check = ledger(source, [item('a')])
    expect(check.problems[0]).toMatch(/^fixed, now checked/)
    expect(check.updated).toContain('✓ "line"\n  a\n')
  })

  it('reads multi-line readings and wants', () => {
    const source = file(
      '✗ "line"\n  b\n  c\n  want:\n  a\n  c\n',
      '1 entries: 1 checked, of which 1 wrong; 0 unchecked.',
    )
    const check = ledger(source, [
      { group: 'site', text: 'line', reading: ['a', 'c'] },
    ])
    expect(check.updated).toContain('✓ "line"\n  a\n  c\n')
  })

  it('reports lines that left the corpus and stale counts', () => {
    const source = file('? "gone"\n  a\n', 'wrong counts')
    expect(ledger(source, []).problems).toEqual(['removed: site "gone"'])
    const stale = file('? "line"\n  a\n', 'wrong counts')
    expect(ledger(stale, [item('a')]).problems[0]).toMatch(/out of date/)
  })

  // The line number is where the misplaced line lands in file().
  it.each([
    ['a mistyped status', '? "line"\n  a\n✔ "other"\n  b\n', 9],
    ['a line out of quotes', '? line\n  a\n', 7],
    ['a line that is not a JSON string', '? "li"ne"\n  a\n', 7],
    ['a reading indented with a tab', '? "line"\n\ta\n', 8],
    ['a reading under no entry', '  a\n', 7],
    ['a comment after a heading', '? "line"\n  a\n# note\n', 9],
  ])('rejects %s', (_, body, line) => {
    expect(() => ledger(file(body, 'counts'), [])).toThrow(
      `:${line}: can't place`,
    )
  })

  it('rejects a header line without "#"', () => {
    expect(() => ledger('Test ledger.\n', [])).toThrow(`:1: can't place`)
  })

  it('knows the line of each entry', () => {
    const entries = parseLedger(
      'ledger.txt',
      file('? "a"\n  x\n✓ "b"\n  y\n', ''),
    )
    expect([...entries.values()].map((e) => [e.text, e.line])).toEqual([
      ['a', 6],
      ['b', 8],
    ])
  })
})
