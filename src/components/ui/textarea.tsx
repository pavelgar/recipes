import * as React from 'react'
import { cn } from 'cn'

import {
  FIELD,
  FIELD_DISABLED,
  FIELD_FOCUS,
  FIELD_INVALID,
} from '@/components/ui/classes'

// The well, growing with its text.
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        FIELD,
        'flex field-sizing-content min-h-28 w-full resize-none px-4.5 py-3.5 leading-relaxed break-words outline-none placeholder:text-(--sorbet-ink-muted)',
        FIELD_FOCUS,
        FIELD_INVALID,
        FIELD_DISABLED,
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
