import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { cn } from 'cn'

import { FOCUS } from '@/components/ui/classes'

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
        'group/radio-group-item peer relative flex size-7 shrink-0 items-center justify-center rounded-full bg-(--sorbet-well) shadow-[inset_0_0_0_2px_var(--sorbet-rim),inset_0_3px_4px_-1px_var(--sorbet-well-shade)]',
        FOCUS,
        'after:absolute after:-inset-2',
        'motion-safe:transition-[scale,background-color,box-shadow] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.34,1.5,0.5,1)] motion-safe:active:scale-x-105 motion-safe:active:scale-y-95',
        'not-data-checked:hover:bg-(--sorbet-surface-strong)',
        'data-checked:bg-(--sorbet-melon) data-checked:shadow-[inset_0_1.5px_1px_-0.5px_var(--sorbet-melon-hi),inset_0_-3px_4px_-2px_var(--sorbet-melon-deep),0_4px_8px_-4px_var(--sorbet-melon-glow)]',
        'aria-invalid:bg-(--sorbet-danger-soft) aria-invalid:shadow-[inset_0_0_0_2px_var(--sorbet-danger)] aria-invalid:data-checked:bg-(--sorbet-melon)',
        'data-disabled:cursor-not-allowed data-disabled:bg-(--sorbet-surface) data-disabled:shadow-none data-disabled:outline-2 data-disabled:-outline-offset-2 data-disabled:outline-(--sorbet-rim)/60 data-disabled:outline-dashed data-disabled:data-checked:bg-(--sorbet-surface-strong)',
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex items-center justify-center"
      >
        <span className="size-2.5 rounded-full bg-(--sorbet-canvas) shadow-[0_1px_1px_0_var(--sorbet-melon-deep)] group-data-disabled/radio-group-item:bg-(--sorbet-ink-muted) group-data-disabled/radio-group-item:shadow-none motion-safe:animate-[sorbet-pop_340ms_cubic-bezier(0.3,1.4,0.5,1)_both]" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
