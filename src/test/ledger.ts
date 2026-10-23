import { existsSync, readFileSync, writeFileSync } from 'node:fs'

// A ledger records how the code reads every corpus line, and which of
// those readings an agent has checked against the rules: DESIGN.md and the
// ledger's header. src/lib/AGENTS.md describes the checking. A ledger
// replaces a plain snapshot, which only shows that a reading changed, not
// whether anyone ever confirmed it.
//
// Each entry starts with a status and the line, then the reading, indented:
//
//   ✓ "2 pkt (à 170 g)  pekonia"
//     counted 2 pkt | each 170 g  [2 pkt] [170 g]
//
// - ✓ checked: the reading is right.
// - ✗ wrong: the reading is wrong. "want:" lines below it give the right
//   one.
// - ? unchecked: the reading is only recorded.
//
// The test fails when any reading differs from the ledger. To accept the
// changes, run `UPDATE_LEDGER=1 bun run test` and review the diff:
//
// - Unchecked entries take the new reading.
// - A checked entry whose reading changed becomes wrong, wanting its old
//   reading. If the new reading is right, mark it ✓ by hand and delete the
//   want lines.
// - A wrong entry whose new reading is what it wants becomes checked.
//
// To check an entry, change ? to ✓, or to ✗ and add want lines.

export type Status = '✓' | '✗' | '?'

export type LedgerItem = {
  readonly group: string
  readonly text: string
  readonly reading: ReadonlyArray<string>
}

type Entry = {
  status: Status
  group: string
  text: string
  reading: Array<string>
  want: Array<string> | null
}

const key = (group: string, text: string) => `${group}\n${text}`

function parse(source: string): Map<string, Entry> {
  const entries = new Map<string, Entry>()
  let group = ''
  let entry: Entry | null = null
  let inWant = false
  for (const line of source.split('\n')) {
    const heading = /^## (\S+)/.exec(line)
    if (heading) {
      group = heading[1]
      entry = null
      continue
    }
    const start = /^([✓✗?]) (".*")$/.exec(line)
    if (start) {
      const text = JSON.parse(start[2]) as string
      entry = {
        status: start[1] as Status,
        group,
        text,
        reading: [],
        want: null,
      }
      inWant = false
      entries.set(key(group, text), entry)
      continue
    }
    if (!entry || !line.startsWith('  ')) continue
    const body = line.slice(2)
    const want = /^want:(?: (.*))?$/.exec(body)
    if (want) {
      inWant = true
      const first = want.at(1)
      entry.want = first === undefined ? [] : [first]
    } else if (inWant) {
      entry.want?.push(body)
    } else {
      entry.reading.push(body)
    }
  }
  return entries
}

const same = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) =>
  a.length === b.length && a.every((line, i) => line === b[i])

function render(
  title: ReadonlyArray<string>,
  entries: ReadonlyArray<Entry>,
  summarise: (group: string, items: ReadonlyArray<Entry>) => string,
): string {
  const out = title.map((line) => (line ? `# ${line}` : '#'))
  const checked = entries.filter((e) => e.status !== '?').length
  const wrong = entries.filter((e) => e.status === '✗').length
  out.push(
    '#',
    `# ${entries.length} entries: ${checked} checked, of which ${wrong} wrong; ${entries.length - checked} unchecked.`,
  )
  const groups = [...new Set(entries.map((e) => e.group))]
  for (const group of groups) {
    const items = entries.filter((e) => e.group === group)
    out.push('', `## ${group} ${summarise(group, items)}`, '')
    for (const e of items) {
      out.push(`${e.status} ${JSON.stringify(e.text)}`)
      out.push(...e.reading.map((line) => `  ${line}`))
      if (e.want) {
        if (e.want.length === 1) out.push(`  want: ${e.want[0]}`)
        else out.push('  want:', ...e.want.map((line) => `  ${line}`))
      }
    }
  }
  return `${out.join('\n')}\n`
}

export type LedgerCheck = {
  // What differs from the ledger on disk, one line each. Empty when the
  // ledger matches.
  readonly problems: ReadonlyArray<string>
  // The ledger with the current readings and statuses updated as described
  // above.
  readonly updated: string
}

export function checkLedger(options: {
  readonly path: string
  readonly title: ReadonlyArray<string>
  readonly items: ReadonlyArray<LedgerItem>
  // A short summary after each group's heading, from its entries' readings.
  readonly summarise: (
    group: string,
    readings: ReadonlyArray<{ readonly reading: ReadonlyArray<string> }>,
  ) => string
}): LedgerCheck {
  const source = existsSync(options.path)
    ? readFileSync(options.path, 'utf8')
    : ''
  const old = parse(source)
  const problems: Array<string> = []
  const entries: Array<Entry> = []
  const seen = new Set<string>()
  for (const item of options.items) {
    const k = key(item.group, item.text)
    if (seen.has(k)) continue
    seen.add(k)
    const reading = [...item.reading]
    const before = old.get(k)
    const label = `${item.group} ${JSON.stringify(item.text)}`
    const show = (lines: ReadonlyArray<string>) => lines.join(' / ') || '(none)'
    if (!before) {
      problems.push(`new: ${label}\n    ${show(reading)}`)
      entries.push({ ...item, status: '?', reading, want: null })
      continue
    }
    if (before.status === '✗' && before.want && same(reading, before.want)) {
      problems.push(`fixed, now checked: ${label}\n    ${show(reading)}`)
      entries.push({ ...before, status: '✓', reading, want: null })
      continue
    }
    if (same(reading, before.reading)) {
      entries.push(before)
      continue
    }
    const change = `${show(before.reading)}\n  → ${show(reading)}`
    if (before.status === '✓') {
      problems.push(`checked reading changed: ${label}\n    ${change}`)
      entries.push({
        ...before,
        status: '✗',
        reading,
        want: before.reading,
      })
    } else {
      const what = before.status === '✗' ? 'still wrong, changed' : 'changed'
      problems.push(`${what}: ${label}\n    ${change}`)
      entries.push({ ...before, reading })
    }
  }
  for (const [k, e] of old) {
    if (!seen.has(k))
      problems.push(`removed: ${e.group} ${JSON.stringify(e.text)}`)
  }
  const updated = render(options.title, entries, options.summarise)
  if (problems.length === 0 && updated !== source) {
    problems.push(`${options.path} is out of date in its counts or layout`)
  }
  return { problems, updated }
}

// Runs a ledger check in a test: fails with the problems, or with
// UPDATE_LEDGER=1 writes the updated ledger instead.
export function assertLedger(
  check: LedgerCheck,
  path: string,
  fail: (message: string) => void,
): void {
  if (check.problems.length === 0) return
  if (process.env.UPDATE_LEDGER) {
    writeFileSync(path, check.updated)
    return
  }
  const shown = check.problems.slice(0, 40).join('\n')
  const more =
    check.problems.length > 40
      ? `\n… and ${check.problems.length - 40} more`
      : ''
  fail(
    `${check.problems.length} readings differ from ${path}. Review them, then run UPDATE_LEDGER=1 bun run test.\n${shown}${more}`,
  )
}
