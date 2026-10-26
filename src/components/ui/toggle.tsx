import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

// A toggle is a pillow that latches. On, it stays pressed in: lemon,
// shaded from above instead of below, with no shadow under it. The
// outline one stands raised and white while off; the default one lies
// flat until it's on.
const toggleVariants = cva(
  [
    'group/toggle inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap select-none',
    'squircle',
    'font-heading',
    'focus-ring',
    'data-pressed:bg-(--sorbet-butter) data-pressed:text-(--sorbet-butter-ink) data-pressed:shadow-latched data-pressed:hover:shadow-latched data-pressed:translate-y-px data-pressed:hover:translate-y-px',
    'disabled:pointer-events-none disabled:bg-(--sorbet-surface-strong) disabled:text-(--sorbet-ink-muted) disabled:shadow-none data-disabled:pointer-events-none data-disabled:bg-(--sorbet-surface-strong) data-disabled:text-(--sorbet-ink-muted) data-disabled:shadow-none',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-transparent text-(--sorbet-ink) [--edge:transparent] not-data-pressed:hover:bg-(--sorbet-surface-strong)',
          'motion-safe:transition motion-safe:duration-150 motion-safe:active:scale-95',
        ].join(' '),
        outline: [
          'tone-plain',
          'pillow',
          'data-pressed:[--edge:var(--sorbet-butter-deep)]',
        ].join(' '),
      },
      size: {
        default:
          'h-12 min-w-12 px-5 pb-0.5 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        sm: "h-10 min-w-10 px-4 pb-px text-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-4.5",
        lg: 'h-14 min-w-14 px-6 pb-0.5 text-base has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Toggle({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      data-variant={variant}
      data-size={size}
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
