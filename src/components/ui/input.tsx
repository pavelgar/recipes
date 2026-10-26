import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'
import { cn } from 'cn'

import {
  FIELD,
  FIELD_DISABLED,
  FIELD_FOCUS,
  FIELD_INVALID,
} from '@/components/ui/classes'

// A 52px well, sunk below the page with an edge you can see. Focus brings
// it up to the page's light with a blueberry edge; invalid tints it and
// edges it in danger; disabled leaves only a dashed edge.
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        FIELD,
        'h-13 w-full min-w-0 px-4.5 outline-none placeholder:text-(--sorbet-ink-muted)',
        FIELD_FOCUS,
        FIELD_INVALID,
        FIELD_DISABLED,
        'file:mr-3 file:h-9 file:rounded-full file:bg-(--sorbet-butter) file:px-4 file:text-[15px] file:font-bold file:text-(--sorbet-butter-ink) file:shadow-[inset_0_1.5px_0_0_var(--sorbet-butter-hi),inset_0_-2.5px_0_0_var(--sorbet-butter-deep)]',
        type === 'file' &&
          'py-[7px] text-[16px] text-(--sorbet-ink-muted) file:font-heading',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
