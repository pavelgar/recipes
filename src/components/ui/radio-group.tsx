import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { cn } from 'cn'

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn('grid w-full gap-3', className)}
      {...props}
    />
  )
}

// Off, a round 28px dimple, sunk with an edge. Chosen, it rises as a
// watermelon ball with a pale bead springing into its middle.
function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        'group/radio-group-item peer relative flex size-7 shrink-0 items-center justify-center rounded-full bg-(--sorbet-well) shadow-well-small',
        'focus-ring',
        'after:absolute after:-inset-2',
        'motion-safe:transition motion-safe:duration-200 motion-safe:ease-spring motion-safe:active:scale-x-105 motion-safe:active:scale-y-95',
        'not-data-checked:hover:bg-(--sorbet-surface-strong)',
        'data-checked:bg-(--sorbet-melon) data-checked:shadow-bead-melon',
        'aria-invalid:bg-(--sorbet-danger-soft) aria-invalid:shadow-invalid aria-invalid:data-checked:bg-(--sorbet-melon)',
        'data-disabled:cursor-not-allowed data-disabled:bg-(--sorbet-surface) data-disabled:shadow-none data-disabled:outline-2 data-disabled:-outline-offset-2 data-disabled:outline-(--sorbet-rim)/60 data-disabled:outline-dashed data-disabled:data-checked:bg-(--sorbet-surface-strong)',
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex items-center justify-center"
      >
        <span className="size-2.5 rounded-full bg-(--sorbet-canvas) shadow-dot group-data-disabled/radio-group-item:bg-(--sorbet-ink-muted) group-data-disabled/radio-group-item:shadow-none motion-safe:animate-pop" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
