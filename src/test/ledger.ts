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
// - ! to check: a reading the code gave since anyone last checked, waiting
//   for an agent to judge it. The test fails while any is left.
// - ? unchecked: the reading is only recorded, from before every new
//   reading was checked. bun run ledger:sample turns some into !.
//
// The test fails when any reading differs from the ledger. To accept the
// changes, run `UPDATE_LEDGER=1 bun run test` and review the diff:
//
// - A new line, and an unchecked entry whose reading changed, become to
//   check, with the new reading.
// - A checked entry whose reading changed becomes wrong, wanting its old
//   reading. If the new reading is right, mark it ✓ by hand and delete the
//   want lines.
// - A wrong entry whose new reading is what it wants becomes checked.
//
// To check an entry, change ! or ? to ✓, or to ✗ and add want lines.
//
// A held-out ledger is checked by sample (corpus/AGENTS.md), so its
// readings stay unchecked instead of to check.

export type Status = '✓' | '✗' | '!' | '?'

export type LedgerItem = {
  readonly group: string
  readonly text: string
  readonly reading: ReadonlyArray<string>
}

type Entry = {
  status: Status
  // Where its status is, counting from 0.
  line: number
  group: string
  text: string
  reading: Array<string>
  want: Array<string> | null
}

const key = (group: string, text: string) => `${group}\n${text}`

// Reads a ledger: "#" comments, then "## " headings with their entries.
// Any other line is an error, so that a mistyped status can't hand its
// reading to the entry above.
export function parseLedger(path: string, source: string): Map<string, Entry> {
  const entries = new Map<string, Entry>()
  let group = ''
  let entry: Entry | null = null
  let inWant = false
  for (const [i, line] of source.split('\n').entries()) {
    const unplaced = () =>
      new Error(
        `${path}:${i + 1}: can't place ${JSON.stringify(line)}. A ledger has "#" comments, then "## " headings, entries starting with ✓, ✗, ! or ? and the line in quotes, and readings indented two spaces.`,
      )
    const heading = /^## (\S+)/.exec(line)
    if (heading) {
      group = heading[1]
      entry = null
      continue
    }
    if (line === '') continue
    if (group === '') {
      if (/^#( |$)/.test(line)) continue
      throw unplaced()
    }
    const start = /^([✓✗!?]) (".*")$/.exec(line)
    if (start) {
      let text: string
      try {
        text = JSON.parse(start[2]) as string
      } catch {
        throw unplaced()
      }
      entry = {
        status: start[1] as Status,
        line: i,
        group,
        text,
        reading: [],
        want: null,
      }
      inWant = false
      entries.set(key(group, text), entry)
      continue
    }
    if (!entry || !line.startsWith('  ')) throw unplaced()
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

// The ledger's counts, under its title: "# 4636 entries: 521 checked, of
// which 3 wrong; 4115 unchecked."
export function countsLine(statuses: ReadonlyArray<Status>): string {
  const count = (status: Status) => statuses.filter((s) => s === status).length
  const wrong = count('✗')
  const checked = count('✓') + wrong
  const toCheck = count('!')
  return `# ${statuses.length} entries: ${checked} checked, of which ${wrong} wrong; ${count('?')} unchecked${toCheck ? `; ${toCheck} to check` : ''}.`
}

function render(
  title: ReadonlyArray<string>,
  entries: ReadonlyArray<Entry>,
  summarise: (group: string, items: ReadonlyArray<Entry>) => string,
): string {
  const out = title.map((line) => (line ? `# ${line}` : '#'))
  out.push('#', countsLine(entries.map((e) => e.status)))
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
  // How many entries of the updated ledger are to check.
  readonly toCheck: number
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
  // A held-out ledger: its readings are checked by sample, not each.
  readonly sampled?: boolean
}): LedgerCheck {
  const fresh: Status = options.sampled ? '?' : '!'
  const source = existsSync(options.path)
    ? readFileSync(options.path, 'utf8')
    : ''
  const old = parseLedger(options.path, source)
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
      entries.push({ ...item, status: fresh, line: -1, reading, want: null })
      continue
    }
    if (before.status === '✗' && before.want && same(reading, before.want)) {
      problems.push(`fixed, now checked: ${label}\n    ${show(reading)}`)
      entries.push({ ...before, status: '✓', reading, want: null })
      continue
    }
    if (same(reading, before.reading)) {
      if (before.status === '!') {
        problems.push(`to check: ${label}\n    ${show(reading)}`)
      }
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
      const status = before.status === '?' ? fresh : before.status
      entries.push({ ...before, status, reading })
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
  const toCheck = entries.filter((e) => e.status === '!').length
  return { problems, updated, toCheck }
}

// Runs a ledger check in a test: fails with the problems, or with
// UPDATE_LEDGER=1 writes the updated ledger instead, and then fails while
// any entry is left to check.
export function assertLedger(
  check: LedgerCheck,
  path: string,
  fail: (message: string) => void,
): void {
  if (check.problems.length === 0) return
  const judge = `Mark each ! entry ✓, or ✗ with want lines, by DESIGN.md and the ledger's header (src/lib/AGENTS.md).`
  if (process.env.UPDATE_LEDGER) {
    writeFileSync(path, check.updated)
    if (check.toCheck > 0) {
      fail(`${path} has ${check.toCheck} entries to check. ${judge}`)
    }
    return
  }
  const shown = check.problems.slice(0, 40).join('\n')
  const more =
    check.problems.length > 40
      ? `\n… and ${check.problems.length - 40} more`
      : ''
  fail(
    `${check.problems.length} entries of ${path} need a look. Run UPDATE_LEDGER=1 bun run test to record changed readings, then: ${judge}\n${shown}${more}`,
  )
}
