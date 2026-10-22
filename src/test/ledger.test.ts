import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkLedger } from '@/test/ledger'
import type { LedgerItem } from '@/test/ledger'

const ledger = (source: string, items: Array<LedgerItem>) => {
  const path = join(mkdtempSync(join(tmpdir(), 'ledger-')), 'ledger.txt')
  writeFileSync(path, source)
  return checkLedger({
    path,
    title: ['Test ledger.'],
    items,
    summarise: (_, entries) => `${entries.length}`,
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

  it('records new lines as unchecked', () => {
    const check = ledger('', [item('a')])
    expect(check.problems).toEqual(['new: site "line"\n    a'])
    expect(check.updated).toContain('? "line"\n  a\n')
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
})
