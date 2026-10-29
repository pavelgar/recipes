import { cn } from 'cn'
import { ArrowLeftIcon, CheckIcon, RotateCcwIcon } from 'lucide-react'
import { useRef } from 'react'
import { StepText } from '@/components/recipe-view/step-text'
import { Button } from '@/components/ui/button'
import { Item, ItemContent, ItemFooter, ItemMedia } from '@/components/ui/item'
import { scrollBehavior } from '@/components/motion'
import { m } from '@/paraglide/messages'
import type { ReadSection } from '@/components/recipe-view/lines'
import type {
  CrossOff,
  StepOrder,
  Timers,
} from '@/components/recipe-view/state'
import type { RecipeLanguage } from '@/core/languages'
import type { Ref } from 'react'

// A tap on a step's text, unless it ended a text selection.
const onTap = (act: () => void) => () => {
  if (window.getSelection()?.toString()) return
  act()
}

// The steps. The first one not yet crossed off is the one to do now: it
// leads, larger, with Back and Done. A tap on a step's text or number
// crosses it off, or back on.
export function StepList({
  ref,
  titleId,
  sections,
  order,
  language,
  servingsWritten,
  forOriginal,
  cross,
  timers,
}: {
  ref?: Ref<HTMLElement>
  titleId: string
  sections: ReadonlyArray<ReadSection>
  order: StepOrder
  language: RecipeLanguage
  servingsWritten: string | null
  // Whether the servings differ from the recipe's, so the amounts in the
  // steps are marked as the recipe's.
  forOriginal: boolean
  cross: CrossOff
  timers: Timers
}) {
  const { flat, current, currentIndex } = order

  // Done and Back bring the step that's now current into view.
  const stepRefs = useRef(new Map<string, HTMLElement>())
  const reveal = (key: string | undefined) => {
    if (!key) return
    requestAnimationFrame(() =>
      stepRefs.current.get(key)?.scrollIntoView({
        block: 'center',
        behavior: scrollBehavior(),
      }),
    )
  }
  const finish = () => {
    if (current === null) return
    cross.toggle(current)
    reveal(
      flat.slice(currentIndex + 1).find((s) => !cross.has(s.line.key))?.line
        .key,
    )
  }
  const back = () => {
    const previous = flat.at(
      (currentIndex === -1 ? flat.length : currentIndex) - 1,
    )
    if (!previous) return
    cross.toggle(previous.line.key)
    reveal(previous.line.key)
  }
  // Starting over uncrosses every step and stops every timer.
  const started =
    flat.some((s) => cross.has(s.line.key)) || timers.timers.length > 0
  const startOver = () => {
    cross.clear(flat.map((s) => s.line.key))
    timers.stopAll()
  }

  return (
    <section
      ref={ref}
      aria-labelledby={titleId}
      className="mt-10 scroll-mt-20 lg:mt-0"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id={titleId} className="font-heading text-2xl font-semibold">
          {m.recipe_steps()}
        </h2>
        {started && (
          <Button variant="ghost" size="sm" onClick={startOver}>
            <RotateCcwIcon data-icon="inline-start" />
            {m.recipe_start_over()}
          </Button>
        )}
      </div>
      {forOriginal && (
        <p className="mt-1 text-sm text-muted-foreground">
          {servingsWritten
            ? m.recipe_step_amounts_for({ servings: servingsWritten })
            : m.recipe_step_amounts_as_written()}
        </p>
      )}
      {sections.map((section) => (
        <div key={section.key} className="mt-5">
          {section.heading && (
            <h3
              lang={language}
              className="mb-2 font-heading text-lg font-semibold"
            >
              {section.heading}
            </h3>
          )}
          <ol className="flex flex-col gap-1">
            {section.lines.map((line, i) => {
              const number = i + 1
              const done = cross.has(line.key)
              const text = (
                <StepText
                  pieces={line.pieces}
                  amounts={line.amounts}
                  forOriginal={forOriginal}
                  stepKey={line.key}
                  stepNumber={number}
                  timers={timers}
                />
              )
              return (
                <li
                  key={line.key}
                  ref={(el) => {
                    if (el) stepRefs.current.set(line.key, el)
                    else stepRefs.current.delete(line.key)
                  }}
                  className="scroll-my-28"
                >
                  {line.key === current ? (
                    <Item
                      variant="muted"
                      className="items-start gap-y-5 rounded-3xl bg-muted p-5 sm:p-6"
                    >
                      <ItemMedia>
                        <StepNumber number={number} current onClick={finish} />
                      </ItemMedia>
                      <ItemContent
                        onClick={onTap(finish)}
                        className="cursor-pointer"
                      >
                        <p
                          lang={language}
                          className="text-xl leading-relaxed text-pretty sm:text-2xl sm:leading-relaxed"
                        >
                          {text}
                        </p>
                      </ItemContent>
                      <ItemFooter>
                        {currentIndex > 0 && (
                          <Button
                            variant="outline"
                            size="icon-lg"
                            aria-label={m.recipe_step_back({
                              number: flat[currentIndex - 1].number,
                            })}
                            onClick={back}
                          >
                            <ArrowLeftIcon />
                          </Button>
                        )}
                        <Button size="lg" className="ml-auto" onClick={finish}>
                          <CheckIcon data-icon="inline-start" />
                          {m.recipe_step_done()}
                        </Button>
                      </ItemFooter>
                    </Item>
                  ) : (
                    <Item
                      size="sm"
                      onClick={onTap(() => cross.toggle(line.key))}
                      className="cursor-pointer flex-nowrap items-start hover:bg-muted/60"
                    >
                      <ItemMedia>
                        <StepNumber
                          number={number}
                          done={done}
                          onClick={() => cross.toggle(line.key)}
                        />
                      </ItemMedia>
                      <ItemContent>
                        <p
                          lang={language}
                          className={cn(
                            'text-base leading-relaxed text-pretty',
                            done && 'text-muted-foreground',
                          )}
                        >
                          {text}
                        </p>
                      </ItemContent>
                    </Item>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      ))}
      {current === null && flat.length > 0 && (
        <Button variant="outline" onClick={back} className="mt-4">
          <ArrowLeftIcon data-icon="inline-start" />
          {m.recipe_step_back({ number: flat[flat.length - 1].number })}
        </Button>
      )}
    </section>
  )
}

// A step's number, which crosses it off as a tap on its text does, and
// lets a keyboard do it: filled in the theme colour for the step to do
// now, a check once it's done.
function StepNumber({
  number,
  current = false,
  done = false,
  onClick,
}: {
  number: number
  current?: boolean
  done?: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant={current ? 'default' : 'outline'}
      size={current ? 'icon' : 'icon-sm'}
      aria-label={
        done
          ? m.recipe_step_mark_not_done({ number })
          : m.recipe_step_mark_done({ number })
      }
      onClick={(event) => {
        // The row's own tap would cross it off a second time.
        event.stopPropagation()
        onClick()
      }}
      className={cn(
        'font-heading font-semibold tabular-nums',
        current ? 'text-lg' : 'text-muted-foreground',
      )}
    >
      {done ? <CheckIcon /> : number}
    </Button>
  )
}
