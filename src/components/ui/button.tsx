import * as React from 'react'
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

// Buttons are pillows: no outline, their depth shaded from their own
// colour (a lit top, a deep bottom edge, a shadow in their tint). A press
// squashes the pillow onto the page and its shadow shrinks; it springs
// back. Ghost and link are flat. A disabled pillow has gone flat.
const buttonVariants = cva(
  [
    'group/button relative inline-flex shrink-0 items-center justify-center whitespace-nowrap select-none',
    'font-heading',
    'font-bold tracking-normal',
    'focus-ring',
    'disabled:pointer-events-none data-disabled:pointer-events-none',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  ],
  {
    variants: {
      variant: {
        default: 'tone-melon',
        secondary: 'tone-butter',
        outline: 'tone-plain',
        ghost:
          'bg-transparent text-(--sorbet-ink) hover:bg-(--sorbet-surface-strong) active:bg-(--sorbet-surface-strong) aria-expanded:bg-(--sorbet-butter) aria-expanded:text-(--sorbet-butter-ink) motion-safe:transition motion-safe:duration-150 motion-safe:active:scale-95',
        destructive: 'tone-danger',
        link: 'text-(--sorbet-ink) underline decoration-(--sorbet-melon) decoration-3 underline-offset-7 hover:decoration-(--sorbet-melon-deep)',
      },
      size: {
        default: `h-13 gap-2 rounded-full squircle px-6 pb-0.5 text-base has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5`,
        xs: `h-9 gap-1.5 rounded-full squircle px-3.5 pb-px text-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-4`,
        sm: `h-11 gap-1.5 rounded-full squircle px-5 pb-0.5 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4 [&_svg:not([class*='size-'])]:size-4.5`,
        lg: `h-15 gap-2.5 rounded-full squircle px-8 pb-0.5 text-lg has-data-[icon=inline-end]:pr-6 has-data-[icon=inline-start]:pl-6 [&_svg:not([class*='size-'])]:size-5.5`,
        icon: 'size-13 rounded-full pb-0.5',
        'icon-xs':
          "size-9 rounded-full pb-px [&_svg:not([class*='size-'])]:size-4",
        'icon-sm':
          "size-11 rounded-full pb-0.5 [&_svg:not([class*='size-'])]:size-4.5",
        'icon-lg':
          "size-15 rounded-full pb-0.5 [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type Variant = NonNullable<VariantProps<typeof buttonVariants>['variant']>
type Size = NonNullable<VariantProps<typeof buttonVariants>['size']>

const RAISED: ReadonlyArray<Variant> = [
  'default',
  'secondary',
  'outline',
  'destructive',
]

const HELD_WHEN_OPEN =
  'aria-expanded:shadow-pillow-held aria-expanded:translate-y-px data-popup-open:shadow-pillow-held data-popup-open:translate-y-px'

// Raised pillows: held down while their menu is open; invalid takes a
// danger edge.
const STANDING = cn(
  'pillow',
  HELD_WHEN_OPEN,
  'aria-invalid:[--edge:var(--sorbet-danger)] aria-invalid:[--fill-deep:var(--sorbet-danger)] aria-invalid:[--fill:var(--sorbet-danger-soft)]',
  'deflated',
)

const FLAT_DISABLED =
  'disabled:text-(--sorbet-ink-muted) disabled:decoration-(--sorbet-rim) data-disabled:text-(--sorbet-ink-muted)'

// A link is as tall as its text, with room for the underline.
const LINK = 'h-auto min-h-9 px-0.5 py-1'

// Inside a ButtonGroup the pillows pack together: a small gap, tight
// inner corners, the outer corners round.
type Group = { orientation: 'horizontal' | 'vertical' }
const ButtonGroupContext = React.createContext<Group | null>(null)

function segment({ orientation }: Group) {
  return orientation === 'horizontal'
    ? 'not-first:rounded-l-xl not-last:rounded-r-xl focus-visible:z-10'
    : 'not-first:rounded-t-xl not-last:rounded-b-xl focus-visible:z-10'
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  const group = React.useContext(ButtonGroupContext)
  const v: Variant = variant ?? 'default'
  const s: Size = size ?? 'default'
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={v}
      data-size={s}
      className={cn(
        buttonVariants({ variant: v, size: s }),
        RAISED.includes(v) ? STANDING : FLAT_DISABLED,
        group && segment(group),
        v === 'link' && LINK,
        className,
      )}
      {...props}
    />
  )
}

export { Button, ButtonGroupContext, buttonVariants }
