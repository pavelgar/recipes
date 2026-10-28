import { cn } from 'cn'

import { Textarea } from '@/components/ui/textarea'
import type { Mark } from '@/core/editor/lines'

// Text the textarea and the copy behind it share, so both wrap the same.
// The left padding leaves room for the bullets or step numbers. Both sit in
// one grid cell, so the copy's height is the textarea's too, in every
// browser and at every width, and the textarea never scrolls away from it.
const TEXT =
  'col-start-1 row-start-1 border border-transparent py-3 pr-3 pl-9 text-base break-words whitespace-pre-wrap md:text-sm'

const MARK_STYLES: Record<Mark['kind'], string> = {
  quantity: 'bg-primary/20',
  heading: 'bg-foreground/10',
}

// A textarea for a list, one item per line, that reads like the list it
// writes: each line gets a bullet, or a step number that starts again after
// each heading, and the parts the app recognised are highlighted as they're
// typed. Behind it sits a copy of the text, wrapped the same way, invisible
// but for those marks; editing stays the browser's own. When empty, the
// placeholder shows as such a list. A line to check, such as one AI wrote
// differently from its source, is underlined in amber, its bullet or
// number too, over the marks in it.
export function MarkedTextarea({
  value,
  placeholder = '',
  marksOf,
  flagged,
  list,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Textarea>, 'value' | 'placeholder'> & {
  value: string
  placeholder?: string
  marksOf: (line: string) => ReadonlyArray<Mark>
  flagged?: (line: string) => boolean
  list: 'bullets' | 'numbers'
}) {
  const shown = value === '' ? placeholder : value
  let number = 0

  return (
    <div className="grid rounded-xl bg-input/30">
      <div
        aria-hidden
        className={cn(
          TEXT,
          'pointer-events-none text-transparent',
          value === '' && 'opacity-50',
        )}
      >
        {shown.split('\n').map((line, index) => {
          const marks = marksOf(line)
          const heading = marks.some((mark) => mark.kind === 'heading')
          const item = line.trim() !== '' && !heading
          const check = value !== '' && line.trim() !== '' && flagged?.(line)
          number = heading ? 0 : item ? number + 1 : number
          return (
            <div
              key={index}
              className={cn(
                'relative',
                check &&
                  'underline decoration-warning decoration-wavy decoration-from-font underline-offset-4',
              )}
            >
              {item && (
                <span
                  className={cn(
                    'absolute right-full mr-2.5 text-muted-foreground tabular-nums',
                    check && 'text-warning',
                  )}
                >
                  {list === 'numbers' ? `${number}.` : '•'}
                </span>
              )}
              {line === '' ? '​' : marked(line, marks)}
            </div>
          )
        })}
      </div>
      {/* Positioned, so it shows above the marks behind it. */}
      <Textarea
        value={value}
        placeholder={placeholder}
        className={cn(
          TEXT,
          'relative overflow-hidden bg-transparent',
          className,
        )}
        {...props}
      />
    </div>
  )
}

// A line cut into plain and marked runs. Overlapping marks merge: an
// amount's span can hold the size written inside it ("1 (14 ounce) can").
function marked(line: string, marks: ReadonlyArray<Mark>) {
  const runs: Array<Mark> = []
  for (const mark of [...marks].sort((a, b) => a.start - b.start)) {
    const last = runs.at(-1)
    if (last && mark.start <= last.end && mark.kind === last.kind) {
      runs[runs.length - 1] = { ...last, end: Math.max(last.end, mark.end) }
    } else if (!last || mark.start >= last.end) {
      runs.push(mark)
    }
  }
  const parts: Array<React.ReactNode> = []
  let at = 0
  for (const run of runs) {
    parts.push(line.slice(at, run.start))
    parts.push(
      <span
        key={run.start}
        className={cn('rounded-sm box-decoration-clone', MARK_STYLES[run.kind])}
      >
        {line.slice(run.start, run.end)}
      </span>,
    )
    at = run.end
  }
  parts.push(line.slice(at))
  return parts
}
