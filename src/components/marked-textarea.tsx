import { cn } from 'cn'

import { DISPLAY, FIELD, SQUIRCLE } from '@/components/ui/classes'
import type { Mark } from '@/lib/editor/lines'

// Text the textarea and the copy behind it share, so both wrap the same:
// font, size, line height, padding and the (transparent) border are the
// same in both layers. The left padding leaves room for the bullets or
// step numbers. Both sit in one grid cell, so the copy's height is the
// textarea's too, in every browser and at every width, and the textarea
// never scrolls away from it.
const TEXT =
  'col-start-1 row-start-1 m-0 border-0 py-3.5 pr-4.5 pl-13 font-sans text-[17px] leading-[1.65] tracking-normal break-words whitespace-pre-wrap'

// Marks only paint: a little lemon pillow under an amount, a pistachio
// one under a section heading, each with a deeper edge along its bottom.
// The spread shadow rounds their ends past the letters without moving
// them.
const MARK_STYLES: Record<Mark['kind'], string> = {
  quantity:
    'rounded-[8px] bg-(--sorbet-mark) shadow-[0_0_0_2.5px_var(--sorbet-mark),0_2px_0_2.5px_var(--sorbet-mark-deep)] box-decoration-clone',
  heading:
    'rounded-[8px] bg-(--sorbet-mark-heading) shadow-[0_0_0_2.5px_var(--sorbet-mark-heading),0_2px_0_2.5px_var(--sorbet-mark-heading-deep)] box-decoration-clone',
}

// A textarea for a list, one item per line, that reads like the list it
// writes: each line gets a watermelon bead, or a step number on a small
// pale pillow that starts again after each heading, and the parts the app
// recognised are highlighted as they're typed. Behind it sits a copy of
// the text, wrapped the same way, invisible but for those marks; editing
// stays the browser's own. When empty, the placeholder shows as such a
// list. The well's edge, focus and invalid state are on the wrapper.
export function MarkedTextarea({
  value,
  placeholder = '',
  marksOf,
  list,
  className,
  ...props
}: Omit<React.ComponentProps<'textarea'>, 'value' | 'placeholder'> & {
  value: string
  placeholder?: string
  marksOf: (line: string) => ReadonlyArray<Mark>
  list: 'bullets' | 'numbers'
}) {
  const shown = value === '' ? placeholder : value
  let number = 0

  return (
    <div
      data-slot="marked-textarea"
      className={cn(
        FIELD,
        'grid',
        'has-[textarea:focus-visible]:bg-(--sorbet-canvas) has-[textarea:focus-visible]:shadow-[inset_0_0_0_2.5px_var(--sorbet-focus),0_0_0_4px_var(--sorbet-focus-halo)]',
        'has-[textarea[aria-invalid=true]]:bg-(--sorbet-danger-soft) has-[textarea[aria-invalid=true]]:shadow-[inset_0_0_0_2.5px_var(--sorbet-danger),inset_0_3px_5px_-1px_var(--sorbet-well-shade)]',
        'has-[textarea[aria-invalid=true]]:has-[textarea:focus-visible]:bg-(--sorbet-canvas) has-[textarea[aria-invalid=true]]:has-[textarea:focus-visible]:shadow-[inset_0_0_0_2.5px_var(--sorbet-danger),0_0_0_4px_var(--sorbet-focus-halo)]',
        'has-[textarea:disabled]:bg-transparent has-[textarea:disabled]:shadow-none has-[textarea:disabled]:outline-2 has-[textarea:disabled]:-outline-offset-2 has-[textarea:disabled]:outline-(--sorbet-rim)/60 has-[textarea:disabled]:outline-dashed',
      )}
    >
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
          number = heading ? 0 : item ? number + 1 : number
          return (
            <div key={index} className="relative">
              {item &&
                (list === 'numbers' ? (
                  <span
                    className={cn(
                      'absolute top-0.5 right-full mr-2.5 flex h-6 min-w-7 items-center justify-center rounded-[9px] bg-(--sorbet-melon-soft) px-1.5 text-[15px] leading-none font-extrabold text-(--sorbet-melon-text) tabular-nums shadow-[inset_0_-2px_0_0_color-mix(in_srgb,var(--sorbet-melon-text)_22%,transparent)]',
                      SQUIRCLE,
                      DISPLAY,
                    )}
                  >
                    {number}
                  </span>
                ) : (
                  <span className="absolute top-[calc(0.5lh-5.5px)] right-full mr-4.5 size-[11px] rounded-full bg-(--sorbet-melon) shadow-[inset_0_1.5px_1px_-0.5px_var(--sorbet-melon-hi),inset_0_-2px_2px_-1px_var(--sorbet-melon-deep)]" />
                ))}
              {line === '' ? '​' : marked(line, marks)}
            </div>
          )
        })}
      </div>
      {/* Positioned, so it shows above the marks behind it. */}
      <textarea
        data-slot="textarea"
        value={value}
        placeholder={placeholder}
        className={cn(
          TEXT,
          'relative resize-none overflow-hidden rounded-[18px] bg-transparent text-(--sorbet-ink) outline-none placeholder:text-(--sorbet-ink-muted) disabled:cursor-not-allowed disabled:text-(--sorbet-ink-muted)',
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
        data-mark={run.kind}
        className={MARK_STYLES[run.kind]}
      >
        {line.slice(run.start, run.end)}
      </span>,
    )
    at = run.end
  }
  parts.push(line.slice(at))
  return parts
}
