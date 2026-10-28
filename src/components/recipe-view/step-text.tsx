import { ParaglideMessage } from '@inlang/paraglide-js-react'
import { cn } from 'cn'
import { TimerIcon } from 'lucide-react'
import { useSecondsLeft } from '@/components/recipe-view/state'
import { formatClock } from '@/lib/step-times'
import { m } from '@/paraglide/messages'
import type { Piece, TimePiece } from '@/components/recipe-view/lines'
import type { Timer, Timers } from '@/components/recipe-view/state'
import type { ReactNode } from 'react'

// A piece of a line's text, its quantities in bold. Where `forOriginal`
// holds, the amounts among them are dotted: they're for the servings the
// recipe was written for.
function PieceText({
  piece,
  forOriginal = false,
  amounts,
}: {
  piece: Piece
  forOriginal?: boolean
  amounts?: ReadonlySet<number>
}) {
  if (piece.kind !== 'quantity') return <span>{piece.text}</span>
  return (
    <span
      className={cn(
        'font-semibold',
        forOriginal &&
          amounts?.has(piece.index) &&
          'underline decoration-muted-foreground decoration-dotted underline-offset-4',
      )}
    >
      {piece.text}
    </span>
  )
}

// A line's text, its quantities in bold.
export function Segments({ pieces }: { pieces: ReadonlyArray<Piece> }) {
  return pieces.map((piece, i) => <PieceText key={i} piece={piece} />)
}

// A timer's time left, as wide as the clock was when it started ("10:00"
// on to "9:59"), so the timer holds still as it counts down.
export function TimerClock({
  seconds,
  left,
}: {
  seconds: number
  left: number
}) {
  return (
    <span className="inline-grid justify-items-end tabular-nums *:col-start-1 *:row-start-1">
      <span aria-hidden className="invisible">
        {formatClock(seconds)}
      </span>
      <span>{formatClock(left)}</span>
    </span>
  )
}

// Words only screen readers read. A running timer's button is named by
// them and what it shows, so its name holds the words shown, in order.
export const screenReaderOnly = ({ children }: { children?: ReactNode }) => (
  <span className="sr-only">{children}</span>
)

// A time as a step writes it, with a timer's icon.
function TimeWords({ children }: { children?: ReactNode }) {
  return (
    <span className="whitespace-nowrap">
      <TimerIcon
        aria-hidden
        className="mr-0.5 inline size-[0.9em] -translate-y-[0.08em] text-primary"
      />
      {children}
    </span>
  )
}

// A time in a step, which starts a timer, or, with the timer running,
// shows the time left after it and stops it.
function TimeButton({
  piece,
  stepKey,
  stepNumber,
  running,
  timers,
}: {
  piece: TimePiece
  stepKey: string
  stepNumber: number
  running: Timer | undefined
  timers: Timers
}) {
  const left = useSecondsLeft(running?.endsAt ?? 0)
  // The time left, or that it's up, after the time's words.
  const clock = ({ children }: { children?: ReactNode }) => (
    <span
      className={cn(
        'rounded-md bg-primary px-1 whitespace-nowrap text-primary-foreground',
        left === 0 && 'motion-safe:animate-pulse',
      )}
    >
      {running && left > 0 ? (
        <TimerClock seconds={running.seconds} left={left} />
      ) : (
        children
      )}
    </span>
  )
  const markup = { hidden: screenReaderOnly, time: TimeWords, left: clock }
  return (
    <button
      type="button"
      onClick={(event) => {
        // Starting a timer doesn't cross off its step.
        event.stopPropagation()
        if (running) timers.stop(running)
        else timers.start(stepKey, piece)
      }}
      aria-label={
        running
          ? undefined
          : m.recipe_timer_start({ number: stepNumber, time: piece.text })
      }
      // The theme's orange is too dark for text on the dark background, so
      // there the words take the text's colour, underlined in orange.
      className="inline rounded-md px-0.5 font-semibold text-primary decoration-primary/40 decoration-2 underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:text-foreground dark:underline dark:decoration-primary"
    >
      {!running ? (
        <TimeWords>{piece.text}</TimeWords>
      ) : left === 0 ? (
        <ParaglideMessage
          message={m.recipe_timer_running_up}
          inputs={{ number: stepNumber, time: piece.text }}
          markup={markup}
        />
      ) : (
        <ParaglideMessage
          message={m.recipe_timer_running}
          inputs={{
            number: stepNumber,
            time: piece.text,
            left: formatClock(left),
          }}
          markup={markup}
        />
      )}
    </button>
  )
}

// Punctuation right after a time, which stays on the time's line: a line
// can break after a button, which would leave it to start the next.
const PUNCTUATION = /^[.,;:!?)\]]+/

// A step's text, with each time in it a button that starts a timer, or
// shows the timer running and stops it.
export function StepText({
  pieces,
  amounts,
  forOriginal,
  stepKey,
  stepNumber,
  timers,
}: {
  pieces: ReadonlyArray<Piece>
  amounts: ReadonlySet<number>
  forOriginal: boolean
  stepKey: string
  stepNumber: number
  timers: Timers
}) {
  const out: Array<ReactNode> = []
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i]
    if (piece.kind !== 'time') {
      out.push(
        <PieceText
          key={i}
          piece={piece}
          forOriginal={forOriginal}
          amounts={amounts}
        />,
      )
      continue
    }
    const running = timers.find(stepKey, piece.time)
    const button = (
      // A timer started anew counts down from its own start.
      <TimeButton
        key={`${i}-${running?.id ?? 'idle'}`}
        piece={piece}
        stepKey={stepKey}
        stepNumber={stepNumber}
        running={running}
        timers={timers}
      />
    )
    const next = pieces.at(i + 1)
    const glued =
      next?.kind === 'text' ? PUNCTUATION.exec(next.text)?.[0] : undefined
    if (next?.kind !== 'text' || glued === undefined) {
      out.push(button)
      continue
    }
    out.push(
      <span key={i} className="whitespace-nowrap">
        {button}
        {glued}
      </span>,
      <span key={i + 1}>{next.text.slice(glued.length)}</span>,
    )
    i++
  }
  return out
}
