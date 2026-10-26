import * as React from 'react'
import { cn } from 'cn'

// The well, growing with its text.
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'field',
        'flex field-sizing-content min-h-28 w-full resize-none px-4.5 py-3.5 leading-relaxed break-words outline-none placeholder:text-(--sorbet-ink-muted)',
        'field-focus',
        'field-invalid',
        'field-disabled',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
