const USER_AGENT = 'Recipes'

type Robots = { allows: (path: string) => boolean; delayMs: number }

// All matching groups for our user agent, or all wildcard groups when none
// names it. The longest rule wins, with Allow winning a tie; * matches
// anything and $ ends. RFC 9309, sections 2.2.1 and 2.2.2.
export async function robotsOf(origin: string): Promise<Robots> {
  const response = await fetch(`${origin}/robots.txt`, {
    headers: { 'user-agent': USER_AGENT },
  })
  // An unreachable robots.txt means complete disallow, unlike a missing
  // one (RFC 9309, section 2.3.1.4). Stop before collecting any pages.
  if (response.status >= 500) {
    throw new Error(
      `Couldn't read ${origin}/robots.txt: HTTP ${response.status}`,
    )
  }
  const text = response.ok ? await response.text() : ''
  const groups: Array<{
    agents: Array<string>
    lines: Array<[string, string]>
  }> = []
  let current: (typeof groups)[number] | null = null
  let lastWasAgent = false
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim()
    const match = /^([\w-]+)\s*:\s*(.*)$/.exec(line)
    if (!match) continue
    const [, field, value] = match
    if (field.toLowerCase() === 'user-agent') {
      if (!lastWasAgent || !current) {
        current = { agents: [], lines: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
    } else {
      lastWasAgent = false
      current?.lines.push([field.toLowerCase(), value])
    }
  }
  const matching = groups.filter((g) =>
    g.agents.includes(USER_AGENT.toLowerCase()),
  )
  const lines = (
    matching.length > 0
      ? matching
      : groups.filter((g) => g.agents.includes('*'))
  ).flatMap((g) => g.lines)
  const rules = lines.filter(
    ([field, value]) => (field === 'allow' || field === 'disallow') && value,
  )
  // Honour the longest delay across the matching groups, and none when
  // they set none. An invalid value, such as "10s", is ignored.
  const delayMs = lines.reduce((wait, [field, value]) => {
    if (field !== 'crawl-delay') return wait
    const seconds = Number(value)
    return Number.isFinite(seconds) ? Math.max(wait, seconds * 1000) : wait
  }, 0)
  const pattern = (value: string) =>
    new RegExp(
      `^${value.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}`,
    )
  return {
    allows: (path) => {
      let best: [string, string] | null = null
      for (const rule of rules) {
        if (
          pattern(rule[1]).test(path) &&
          (rule[1].length > (best?.[1].length ?? -1) ||
            (rule[1].length === best?.[1].length && rule[0] === 'allow'))
        ) {
          best = rule
        }
      }
      return best === null || best[0] === 'allow'
    },
    delayMs,
  }
}
