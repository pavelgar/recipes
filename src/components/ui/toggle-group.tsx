import * as React from 'react'
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group'
import type { VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

import type { toggleVariants } from '@/components/ui/toggle'

type Context = VariantProps<typeof toggleVariants> & {
  spacing?: number
  orientation?: 'horizontal' | 'vertical'
}

const ToggleGroupContext = React.createContext<Context>({
  size: 'default',
  variant: 'default',
  spacing: 2,
  orientation: 'horizontal',
})

// Three shapes, by variant and spacing, each the inverse of the next.
// Joined default: a sunk track, the chosen segment a lemon pillow risen
// out of it. Joined outline: one raised white pillow, the chosen segment
// pressed down into it, lemon. Apart: chips, white pillows that squash
// and latch down lemon with a check.
function ToggleGroup({
  className,
  variant,
  size,
  spacing = 2,
  orientation = 'horizontal',
  children,
  ...props
}: ToggleGroupPrimitive.Props &
  VariantProps<typeof toggleVariants> & {
    spacing?: number
    orientation?: 'horizontal' | 'vertical'
  }) {
  const joined = spacing === 0
  const value = React.useMemo(
    () => ({ variant, size, spacing, orientation }),
    [variant, size, spacing, orientation],
  )
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      style={{ '--gap': spacing } as React.CSSProperties}
      className={cn(
        'group/toggle-group flex w-fit',
        orientation === 'vertical' ? 'flex-col items-stretch' : 'flex-row',
        !joined && 'flex-wrap items-center gap-[--spacing(var(--gap))]',
        joined &&
          variant === 'outline' &&
          cn(
            'gap-0.5 rounded-4xl bg-(--sorbet-plain) p-1 shadow-tray',
            'squircle',
          ),
        joined &&
          variant !== 'outline' &&
          cn(
            'gap-1 rounded-4xl bg-(--sorbet-well) p-1 shadow-well',
            'squircle',
          ),
        className,
      )}
      {...props}
    >
      <ToggleGroupContext value={value}>{children}</ToggleGroupContext>
    </ToggleGroupPrimitive>
  )
}

const HEIGHT = {
  sm: 'h-10 text-sm',
  default: 'h-12 text-base',
  lg: 'h-14 text-base',
} as const

// Inside a joined group the segments are a little shorter, so the group
// keeps the size's height.
const JOINED_HEIGHT = {
  sm: 'h-9 text-sm',
  default: 'h-11 text-base',
  lg: 'h-13 text-base',
} as const

// Latched down, lemon, shaded from above.
const LATCHED =
  'data-pressed:bg-(--sorbet-butter) data-pressed:text-(--sorbet-butter-ink) data-pressed:shadow-latched'

function ToggleGroupItem({
  className,
  children,
  variant = 'default',
  size = 'default',
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext)
  const itemVariant = context.variant || variant || 'default'
  const itemSize = context.size || size || 'default'
  const joined = context.spacing === 0
  const vertical = context.orientation === 'vertical'

  const shape = !joined
    ? cn(
        HEIGHT[itemSize],
        'rounded-full px-5 data-pressed:pl-3.5',
        'tone-plain',
        'pillow',
        itemVariant !== 'outline' &&
          '[--fill:var(--sorbet-surface)] [--fill-glow:transparent]',
        LATCHED,
        'data-pressed:translate-y-px data-pressed:hover:translate-y-px data-pressed:hover:shadow-latched',
      )
    : itemVariant === 'outline'
      ? cn(
          JOINED_HEIGHT[itemSize],
          'rounded-3xl px-5',
          vertical && 'justify-start',
          'not-data-pressed:hover:bg-(--sorbet-surface-strong)',
          LATCHED,
          'focus-ring-inside',
          'motion-safe:active:scale-97',
        )
      : cn(
          JOINED_HEIGHT[itemSize],
          'rounded-3xl px-5',
          vertical && 'justify-start',
          'not-data-pressed:hover:bg-(--sorbet-surface-strong)',
          'data-pressed:bg-(--sorbet-butter) data-pressed:text-(--sorbet-butter-ink) data-pressed:shadow-bead-butter',
          'motion-safe:active:scale-97',
        )

  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      data-variant={itemVariant}
      data-size={itemSize}
      data-spacing={context.spacing}
      className={cn(
        'group/toggle relative inline-flex shrink-0 items-center justify-center gap-1.5 font-semibold whitespace-nowrap text-(--sorbet-ink) select-none focus-visible:z-10',
        'squircle',
        'font-heading',
        'focus-ring',
        'motion-safe:transition motion-safe:duration-200 motion-safe:ease-spring',
        'disabled:pointer-events-none disabled:text-(--sorbet-ink-muted) disabled:shadow-none data-disabled:pointer-events-none',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
        shape,
        className,
      )}
      {...props}
    >
      {!joined && (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="hidden size-4.5! group-data-pressed/toggle:block motion-safe:group-data-pressed/toggle:animate-pop"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      )}
      {/* The label's bold copy holds the width, so nothing shifts as the
          chosen one turns bold. */}
      <span className="grid">
        <span className="invisible col-start-1 row-start-1 font-extrabold">
          {children}
        </span>
        <span className="col-start-1 row-start-1 group-data-pressed/toggle:font-extrabold">
          {children}
        </span>
      </span>
    </TogglePrimitive>
  )
}

export { ToggleGroup, ToggleGroupItem }
