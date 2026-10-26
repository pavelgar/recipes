import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'
import { cn } from 'cn'

// A 52px well, sunk below the page with an edge you can see. Focus brings
// it up to the page's light with a blueberry edge; invalid tints it and
// edges it in danger; disabled leaves only a dashed edge.
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'field',
        'h-13 w-full min-w-0 px-4.5 outline-none placeholder:text-(--sorbet-ink-muted)',
        'field-focus',
        'field-invalid',
        'field-disabled',
        'file:mr-3 file:h-9 file:rounded-full file:bg-(--sorbet-butter) file:px-4 file:text-sm file:font-bold file:text-(--sorbet-butter-ink) file:shadow-bead-butter-flat',
        type === 'file' &&
          'py-1.75 text-base text-(--sorbet-ink-muted) file:font-heading',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
