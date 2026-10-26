import * as React from 'react'
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

import {
  DEFLATED,
  DISPLAY,
  FOCUS,
  PILLOW,
  SQUIRCLE,
  TONE,
} from '@/components/ui/classes'

// Buttons are pillows: no outline, their depth shaded from their own
// colour (a lit top, a deep bottom edge, a shadow in their tint). A press
// squashes the pillow onto the page and its shadow shrinks; it springs
// back. Ghost and link are flat. A disabled pillow has gone flat.
const buttonVariants = cva(
  [
    'group/button relative inline-flex shrink-0 items-center justify-center whitespace-nowrap select-none',
    DISPLAY,
    'font-bold tracking-[-0.005em]',
    FOCUS,
    'disabled:pointer-events-none data-disabled:pointer-events-none',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  ],
  {
    variants: {
      variant: {
        default: TONE.melon,
        secondary: TONE.butter,
        outline: TONE.plain,
        ghost:
          'bg-transparent text-(--sorbet-ink) hover:bg-(--sorbet-surface-strong) active:bg-(--sorbet-surface-strong) aria-expanded:bg-(--sorbet-butter) aria-expanded:text-(--sorbet-butter-ink) motion-safe:transition-[background-color,scale] motion-safe:duration-150 motion-safe:active:scale-95',
        destructive: TONE.danger,
        link: 'text-(--sorbet-ink) underline decoration-[color:var(--sorbet-melon)] decoration-[3px] underline-offset-[7px] hover:decoration-[color:var(--sorbet-melon-deep)]',
      },
      size: {
        default: `h-13 gap-2 rounded-full ${SQUIRCLE} px-6 pb-0.5 text-[17px] has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5`,
        xs: `h-9 gap-1.5 rounded-full ${SQUIRCLE} px-3.5 pb-px text-[15px] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-4`,
        sm: `h-11 gap-1.5 rounded-full ${SQUIRCLE} px-5 pb-0.5 text-[16px] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4 [&_svg:not([class*='size-'])]:size-[18px]`,
        lg: `h-15 gap-2.5 rounded-full ${SQUIRCLE} px-8 pb-0.5 text-[18px] has-data-[icon=inline-end]:pr-6 has-data-[icon=inline-start]:pl-6 [&_svg:not([class*='size-'])]:size-[22px]`,
        icon: 'size-13 rounded-full pb-0.5',
        'icon-xs':
          "size-9 rounded-full pb-px [&_svg:not([class*='size-'])]:size-4",
        'icon-sm':
          "size-11 rounded-full pb-0.5 [&_svg:not([class*='size-'])]:size-[18px]",
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
  'aria-expanded:shadow-[inset_0_0_0_1.5px_var(--edge),inset_0_2.5px_3px_0_var(--fill-deep),inset_0_-1px_0_0_var(--fill-hi)] aria-expanded:translate-y-px data-popup-open:shadow-[inset_0_0_0_1.5px_var(--edge),inset_0_2.5px_3px_0_var(--fill-deep),inset_0_-1px_0_0_var(--fill-hi)] data-popup-open:translate-y-px'

// Raised pillows: held down while their menu is open; invalid takes a
// danger edge.
const STANDING = cn(
  PILLOW,
  HELD_WHEN_OPEN,
  'aria-invalid:[--edge:var(--sorbet-danger)] aria-invalid:[--fill-deep:var(--sorbet-danger)] aria-invalid:[--fill:var(--sorbet-danger-soft)]',
  DEFLATED,
)

const FLAT_DISABLED =
  'disabled:text-(--sorbet-ink-muted) disabled:decoration-[color:var(--sorbet-rim)] data-disabled:text-(--sorbet-ink-muted)'

// A link is as tall as its text, with room for the underline.
const LINK = 'h-auto min-h-9 px-0.5 py-1'

// Inside a ButtonGroup the pillows pack together: a small gap, tight
// inner corners, the outer corners round.
type Group = { orientation: 'horizontal' | 'vertical' }
const ButtonGroupContext = React.createContext<Group | null>(null)

function segment({ orientation }: Group) {
  return orientation === 'horizontal'
    ? 'not-first:rounded-l-[12px] not-last:rounded-r-[12px] focus-visible:z-10'
    : 'not-first:rounded-t-[12px] not-last:rounded-b-[12px] focus-visible:z-10'
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
