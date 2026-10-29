// Turns a random sample of unchecked ledger entries (?) into entries to
// check (!), spread over the development ledgers and their sites, so the
// next test run asks for them to be judged like any changed reading.
// src/testing/ledger.ts describes the statuses; held-out ledgers are left
// alone.
//
//   bun run ledger:sample [count] [seed]
//
// count defaults to 20; the seed is random unless given, and printed.

import { globSync, readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import { countsLine, parseLedger } from '../src/testing/ledger.ts'
import { mulberry32 } from './random.ts'

const count = Number(process.argv[2] ?? 20)
const seed = Number(process.argv[3] ?? Math.floor(Math.random() * 2 ** 31))
if (!Number.isInteger(count) || count < 1) {
  throw new Error('The count must be a whole number above 0')
}
if (!Number.isInteger(seed)) throw new Error('The seed must be a whole number')

const random = mulberry32(seed)

const paths = globSync('src/core/*/__ledger__/*.txt')
  .filter((path) => !basename(path).startsWith('held-out-'))
  .sort()
const sources = new Map(paths.map((path) => [path, readFileSync(path, 'utf8')]))

// The unchecked entries of each ledger's sites, as the lines they start on.
const pools: Array<{ path: string; lines: Array<number> }> = []
for (const path of paths) {
  const groups = new Map<string, Array<number>>()
  for (const entry of parseLedger(path, sources.get(path)!).values()) {
    if (entry.status !== '?') continue
    groups.set(entry.group, [...(groups.get(entry.group) ?? []), entry.line])
  }
  for (const lines of groups.values()) pools.push({ path, lines })
}

// One entry from each site in turn, the sites in random order.
const picked = new Map<string, Array<number>>()
let left = count
while (left > 0 && pools.some((pool) => pool.lines.length > 0)) {
  const order = pools
    .filter((pool) => pool.lines.length > 0)
    .map((pool) => ({ pool, key: random() }))
    .sort((a, b) => a.key - b.key)
  for (const { pool } of order) {
    if (left <= 0) break
    const [line] = pool.lines.splice(
      Math.floor(random() * pool.lines.length),
      1,
    )
    picked.set(pool.path, [...(picked.get(pool.path) ?? []), line])
    left--
  }
}

for (const [path, picks] of picked) {
  const lines = sources.get(path)!.split('\n')
  for (const line of picks) lines[line] = `!${lines[line].slice(1)}`
  const statuses = [...parseLedger(path, lines.join('\n')).values()].map(
    (entry) => entry.status,
  )
  const counts = lines.findIndex((line) => /^# \d+ entries: /.test(line))
  lines[counts] = countsLine(statuses)
  writeFileSync(path, lines.join('\n'))
  console.log(`${path}: ${picks.length} to check`)
}
console.log(
  `Seed ${seed}: ${count - left} entries to check. Judge them, then run bun run test.`,
)
