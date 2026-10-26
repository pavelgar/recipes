import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { cn } from 'cn'

// Off, a 28px squircle well, sunk with an edge. Ticked, it rises as a
// watermelon pillow and its check springs in. It squashes a little under
// the finger; the touch area reaches 44px.
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer relative flex size-7 shrink-0 items-center justify-center rounded-lg bg-(--sorbet-well) text-(--sorbet-melon-ink) shadow-well-small',
        'squircle',
        'focus-ring',
        'after:absolute after:-inset-2',
        'motion-safe:transition motion-safe:duration-200 motion-safe:ease-spring motion-safe:active:scale-x-105 motion-safe:active:scale-y-95',
        'not-data-checked:hover:bg-(--sorbet-surface-strong)',
        'data-checked:bg-(--sorbet-melon) data-checked:shadow-bead-melon',
        'aria-invalid:bg-(--sorbet-danger-soft) aria-invalid:shadow-invalid aria-invalid:data-checked:bg-(--sorbet-melon)',
        'data-disabled:cursor-not-allowed data-disabled:bg-(--sorbet-surface) data-disabled:shadow-none data-disabled:outline-2 data-disabled:-outline-offset-2 data-disabled:outline-(--sorbet-rim)/60 data-disabled:outline-dashed data-disabled:data-checked:bg-(--sorbet-surface-strong) data-disabled:text-(--sorbet-ink-muted)',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center motion-safe:animate-pop"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
