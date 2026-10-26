'use client'

import * as React from 'react'
import { cn } from 'cn'

import { DISPLAY } from '@/components/ui/classes'

// Labels are Gabarito, semibold, above what they name.
function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-[16px] leading-snug font-semibold text-(--sorbet-ink) select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:text-(--sorbet-ink-muted) peer-disabled:cursor-not-allowed peer-disabled:text-(--sorbet-ink-muted)',
        DISPLAY,
        className,
      )}
      {...props}
    />
  )
}

export { Label }
