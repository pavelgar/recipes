// A recipe, for reading and cooking from. The cover photo runs edge to edge
// at the top and holds still while the recipe slides up over it. On wide
// screens the ingredients stay in a column beside the steps. On narrower
// ones a bar at the top jumps between the two, and once the ingredients
// have scrolled away a dock brings them back in a drawer.

import { ParaglideMessage } from '@inlang/paraglide-js-react'
import { cn } from 'cn'
import { ClockIcon, ShoppingBasketIcon, TimerIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ABOVE_BOTTOM_BAR, FLOATING_BAR } from '@/components/app-shell'
import {
  IngredientCard,
  IngredientDrawer,
} from '@/components/recipe-view/ingredient-list'
import { useRecipeLines } from '@/components/recipe-view/lines'
import {
  useAlarm,
  useCrossOff,
  useSecondsLeft,
  useServings,
  useStepOrder,
  useTimers,
} from '@/components/recipe-view/state'
import { StepList } from '@/components/recipe-view/step-list'
import {
  screenReaderOnly,
  TimerClock,
} from '@/components/recipe-view/step-text'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useScrollsInside } from '@/hooks/use-scrolls-inside'
import { useWakeLock } from '@/hooks/use-wake-lock'
import { siteOf } from '@/lib/import/link'
import { rulesFor } from '@/lib/languages'
import { scrollBehavior } from '@/lib/motion'
import { photoUrl } from '@/lib/photos/photo'
import { loadProgress, saveProgress } from '@/lib/recipe-progress'
import { formatClock } from '@/lib/step-times'
import { m } from '@/paraglide/messages'
import type { Timer, Timers } from '@/components/recipe-view/state'
import type { Section } from '@/db/schema'
import type { RecipeLanguage } from '@/lib/languages'
import type { MeasuringSystem } from '@/lib/quantities'
import type { ReactNode } from 'react'

export type ViewedRecipe = {
  id: number
  title: string
  language: RecipeLanguage
  measuringSystem: MeasuringSystem
  servings: string | null
  prepMinutes: number | null
  cookMinutes: number | null
  totalMinutes: number | null
  ingredients: ReadonlyArray<Section>
  steps: ReadonlyArray<Section>
  sourceName: string | null
  sourceUrl: string | null
  photo: string | null
}

type Part = 'ingredients' | 'steps'

// "45 min", "2 h", "2 h 15 min".
function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return m.recipe_minutes({ minutes: rest })
  if (rest === 0) return m.recipe_hours({ hours })
  return m.recipe_hours_minutes({ hours, minutes: rest })
}

// The times the recipe gives, and its total: the one it gives, or prep and
// cook added up when it gives both.
function timesOf(recipe: ViewedRecipe) {
  const { prepMinutes: prep, cookMinutes: cook } = recipe
  const total =
    recipe.totalMinutes ?? (prep !== null && cook !== null ? prep + cook : null)
  const times: Array<[string, number | null]> = [
    [m.recipe_prep(), prep],
    [m.recipe_cook(), cook],
    [m.recipe_total(), total],
  ]
  return times.flatMap(([label, minutes]) =>
    minutes === null ? [] : [{ label, minutes }],
  )
}

// A count in the bar, fainter than its label, but not on the part that's
// on screen, whose shade it would be too faint on.
const BAR_COUNT =
  'text-muted-foreground tabular-nums in-data-pressed:text-foreground'

// How many there are, or how many of them are crossed off once any is.
const count = (done: number, total: number) =>
  done === 0 ? String(total) : `${done}/${total}`

// Where the recipe came from: a link to its page, or the source's name for
// a recipe typed in from a book.
function Source({ recipe }: { recipe: ViewedRecipe }) {
  const source =
    recipe.sourceName ?? (recipe.sourceUrl ? siteOf(recipe.sourceUrl) : null)
  if (!source) return null
  if (!recipe.sourceUrl) return <span>{source}</span>
  return (
    <a
      href={recipe.sourceUrl}
      target="_blank"
      rel="noreferrer"
      className="underline decoration-current/50 underline-offset-4 hover:decoration-current"
    >
      {source}
    </a>
  )
}

// A timer in the dock: its step's number and the time left. A tap stops
// it.
function DockTimer({
  timer,
  stepNumber,
  timers,
}: {
  timer: Timer
  stepNumber: number
  timers: Timers
}) {
  const left = useSecondsLeft(timer.endsAt)
  const markup = {
    hidden: screenReaderOnly,
    dot: ({ children }: { children?: ReactNode }) => (
      <span aria-hidden>{children}</span>
    ),
    left: ({ children }: { children?: ReactNode }) =>
      left > 0 ? <TimerClock seconds={timer.seconds} left={left} /> : children,
  }
  return (
    <Button
      onClick={() => timers.stop(timer)}
      className={cn('tabular-nums', left === 0 && 'motion-safe:animate-pulse')}
    >
      <TimerIcon data-icon="inline-start" />
      {left === 0 ? (
        <ParaglideMessage
          message={m.recipe_dock_timer_up}
          inputs={{ number: stepNumber }}
          markup={markup}
        />
      ) : (
        <ParaglideMessage
          message={m.recipe_dock_timer}
          inputs={{ number: stepNumber, left: formatClock(left) }}
          markup={markup}
        />
      )}
    </Button>
  )
}

export function RecipeView({ recipe }: { recipe: ViewedRecipe }) {
  const rules = rulesFor(recipe.language)
  // Progress kept on this device, read before the first paint, so the
  // recipe opens where it was left.
  const [kept] = useState(() => loadProgress(recipe.id, recipe))
  const servings = useServings(
    recipe.servings,
    rules,
    kept?.servings?.count ?? null,
  )
  const lines = useRecipeLines(recipe, servings.factor)
  const cross = useCrossOff(kept?.crossed ?? [])
  const timers = useTimers(kept?.timers ?? [])
  const order = useStepOrder(lines.steps, cross)
  useEffect(() => {
    saveProgress(recipe.id, {
      servings:
        servings.kept === null
          ? null
          : { written: recipe.servings, count: servings.kept },
      crossed: [...cross.done],
      timers: timers.timers.map(({ id: _, ...timer }) => timer),
    })
  }, [recipe.id, recipe.servings, servings.kept, cross.done, timers.timers])
  useWakeLock()
  // Timers show with the number of their step, while the recipe has it.
  const stepNumbers = new Map(order.flat.map((s) => [s.line.key, s.number]))
  const shownTimers = timers.timers.filter((t) => stepNumbers.has(t.stepKey))
  useAlarm(shownTimers.map((t) => t.endsAt))
  // Tailwind's lg, where the ingredients get their own column.
  const wide = useMediaQuery('(min-width: 64rem)')
  const scrollsInside = useScrollsInside()
  const [photoFailed, setPhotoFailed] = useState(false)
  const hasPhoto = recipe.photo !== null && !photoFailed

  // The bar follows whichever part is at the top of the screen.
  const ingredientsRef = useRef<HTMLElement>(null)
  const stepsRef = useRef<HTMLElement>(null)
  const [part, setPart] = useState<Part>('ingredients')
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting)
            setPart(entry.target === stepsRef.current ? 'steps' : 'ingredients')
        }
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    for (const el of [ingredientsRef.current, stepsRef.current]) {
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])
  const jump = (to: Part) => {
    setPart(to)
    const el = to === 'steps' ? stepsRef.current : ingredientsRef.current
    el?.scrollIntoView({ block: 'start', behavior: scrollBehavior() })
  }

  // Where the page itself scrolls, as in a phone's browser, sticky doesn't
  // hold, so the bar is pinned to the top once its place scrolls past, and
  // a space as tall as the bar keeps its place.
  const barPlace = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const [pinnedHeight, setPinnedHeight] = useState<number | null>(null)
  useEffect(() => {
    const el = barPlace.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      const pin = !entry.isIntersecting && entry.boundingClientRect.top < 0
      const height = bar.current?.offsetHeight ?? 0
      setPinnedHeight((pinned) => (pin ? (pinned ?? height) : null))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const barPinned = pinnedHeight !== null && !scrollsInside

  // The dock offers the ingredients once their card has scrolled away, and
  // shows the timers running. The card counts as away once less than a
  // tenth of it shows below the bar: a short recipe's page can't scroll its
  // last lines out of view.
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardInView, setCardInView] = useState(true)
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setCardInView(entry.intersectionRatio > 0.1),
      { rootMargin: '-72px 0px 0px 0px', threshold: [0, 0.1] },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const [drawerOpen, setDrawerOpen] = useState(false)
  // A screen widened to show the card beside the steps closes the drawer.
  if (wide && drawerOpen) setDrawerOpen(false)
  const offerIngredients = !cardInView && !wide

  const ingredientKeys = lines.ingredients.flatMap((s) =>
    s.lines.map((l) => l.key),
  )
  const checked = ingredientKeys.filter(cross.has).length
  const times = timesOf(recipe)
  // The note on step amounts only matters where a step has one.
  const forOriginal =
    servings.changed &&
    lines.steps.some((s) => s.lines.some((l) => l.amounts.size > 0))
  const ingredientProps = {
    sections: lines.ingredients,
    language: recipe.language,
    cross,
    servings,
  }

  return (
    <article
      className={cn(
        // Its own stacking context, so the recipe sliding over the cover
        // doesn't draw over the app's scroll bar.
        'relative isolate w-full',
        hasPhoto
          ? '[--cover:min(64svh,32rem)] md:[--cover:min(52svh,28rem)]'
          : '[--cover:min(42svh,19rem)] md:[--cover:min(36svh,18rem)]',
      )}
    >
      {/* The photo holds still while the recipe slides over it: fixed to
          the window where the page itself scrolls, sticky where the screen
          scrolls inside the app. */}
      <div className="fixed inset-x-0 top-0 h-(--cover) overflow-hidden bg-muted scroll-inside:sticky">
        {hasPhoto && (
          // The title names the recipe, so the photo isn't announced.
          <img
            src={photoUrl(recipe.photo!)}
            alt=""
            onError={() => setPhotoFailed(true)}
            className="size-full object-cover"
          />
        )}
      </div>
      {/* The title scrolls with the page, over the photo, and takes its
          place in the page's flow where the photo is fixed. */}
      <header
        className={cn(
          'relative z-1 flex h-(--cover) flex-col justify-end scroll-inside:-mt-(--cover)',
          hasPhoto
            ? 'bg-linear-to-t from-black/75 via-black/20 via-45% to-transparent text-white'
            : 'text-foreground',
        )}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pt-16 pb-12 sm:px-6 md:pb-8 lg:max-w-6xl lg:px-10">
          <h1
            lang={recipe.language}
            className="max-w-3xl font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl"
          >
            {recipe.title}
          </h1>
          <div
            className={cn(
              'flex flex-wrap items-center gap-x-5 gap-y-1 text-sm',
              hasPhoto ? 'opacity-90' : 'text-muted-foreground',
            )}
          >
            <Source recipe={recipe} />
            {times.length > 0 && (
              <div className="flex items-start gap-1.5">
                <ClockIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                <dl className="flex flex-wrap gap-x-4 gap-y-1">
                  {times.map(({ label, minutes }) => (
                    <div key={label} className="flex gap-1">
                      <dt>{label}</dt>
                      <dd
                        className={cn(
                          'font-medium',
                          !hasPhoto && 'text-foreground',
                        )}
                      >
                        {formatDuration(minutes)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* The recipe, over the cover: a sheet with rounded corners on
          phones, square on wider screens. */}
      <div className="relative z-1 -mt-7 min-h-[calc(100svh-var(--cover)+1.75rem)] rounded-t-[1.75rem] bg-background md:mt-0 md:min-h-[calc(100svh-var(--cover))] md:rounded-none">
        <div ref={barPlace} aria-hidden className="h-px" />
        <div
          ref={bar}
          className={cn(
            'sticky top-0 z-10 -mt-px rounded-t-[1.75rem] bg-background/90 py-3 backdrop-blur-md md:rounded-none md:pt-5 lg:hidden',
            barPinned &&
              'fixed inset-x-0 rounded-none pt-[max(0.75rem,env(safe-area-inset-top))] shadow-[0_1px_0_var(--color-border)]',
          )}
        >
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <ToggleGroup
              value={[part]}
              onValueChange={(value) => {
                const next = value.at(0) as Part | undefined
                if (next) jump(next)
              }}
              variant="outline"
              spacing={0}
              aria-label={m.recipe_jump_to()}
              className="w-full"
            >
              <ToggleGroupItem value="ingredients" className="flex-1">
                {m.recipe_ingredients()}{' '}
                <span className={BAR_COUNT}>
                  {count(checked, ingredientKeys.length)}
                </span>
              </ToggleGroupItem>
              <ToggleGroupItem value="steps" className="flex-1">
                {m.recipe_steps()}{' '}
                <span className={BAR_COUNT}>
                  {count(order.done, order.flat.length)}
                </span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        {barPinned && <div aria-hidden style={{ height: pinnedHeight }} />}

        <div className="mx-auto max-w-2xl px-4 pb-6 sm:px-6 lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-x-12 lg:px-10 lg:pt-10">
          {/* On wide screens the card holds still beside the steps. */}
          <section
            ref={ingredientsRef}
            aria-labelledby="recipe-ingredients"
            className="scroll-mt-20 pt-3 lg:sticky lg:top-8 lg:pt-0"
          >
            <IngredientCard
              ref={cardRef}
              titleId="recipe-ingredients"
              scrolls={wide}
              className="lg:max-h-[calc(100svh-4rem)]"
              {...ingredientProps}
            />
          </section>

          <StepList
            ref={stepsRef}
            titleId="recipe-steps"
            sections={lines.steps}
            order={order}
            language={recipe.language}
            servingsWritten={recipe.servings}
            forOriginal={forOriginal}
            cross={cross}
            timers={timers}
          />

          {/* The dock: fixed above the menu on phones, held at the bottom
              of the steps on wider screens. Timers that don't fit wrap. */}
          {(offerIngredients || shownTimers.length > 0) && (
            <div
              className={cn(
                FLOATING_BAR,
                ABOVE_BOTTOM_BAR,
                'flex w-fit max-w-[calc(100%-1.5rem)] flex-wrap justify-center gap-1 rounded-3xl p-1 md:sticky md:bottom-6 md:mt-8 lg:col-start-2',
              )}
            >
              {offerIngredients && (
                <Button
                  variant="ghost"
                  onClick={() => setDrawerOpen(true)}
                  aria-label={m.recipe_ingredients_checked({
                    checked,
                    total: ingredientKeys.length,
                  })}
                >
                  <ShoppingBasketIcon data-icon="inline-start" />
                  {m.recipe_ingredients()}
                  <span className="text-muted-foreground tabular-nums">
                    {count(checked, ingredientKeys.length)}
                  </span>
                </Button>
              )}
              {shownTimers.map((timer) => (
                <DockTimer
                  key={timer.id}
                  timer={timer}
                  stepNumber={stepNumbers.get(timer.stepKey)!}
                  timers={timers}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <IngredientDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        {...ingredientProps}
      />
    </article>
  )
}
