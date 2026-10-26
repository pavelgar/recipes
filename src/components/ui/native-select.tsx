import * as React from 'react'
import { cn } from 'cn'
import { ChevronDownIcon } from 'lucide-react'

import { ChevronBead } from '@/components/ui/select'

type NativeSelectProps = Omit<React.ComponentProps<'select'>, 'size'> & {
  size?: 'sm' | 'default'
}

// The system's own picker in the well, its chevron on a raised bead at
// the end.
function NativeSelect({
  className,
  size = 'default',
  ...props
}: NativeSelectProps) {
  return (
    <div
      className={cn(
        'group/native-select relative w-fit min-w-0 has-[select:disabled]:text-(--sorbet-ink-muted)',
        className,
      )}
      data-slot="native-select-wrapper"
      data-size={size}
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          'field',
          'h-13 w-full min-w-0 cursor-pointer appearance-none py-0 pr-13 pl-4.5 outline-none not-disabled:hover:bg-(--sorbet-surface-strong) data-[size=sm]:h-11 data-[size=sm]:pr-11 data-[size=sm]:text-base',
          'field-focus',
          'field-invalid',
          'field-disabled',
        )}
        {...props}
      />
      <ChevronBead
        aria-hidden="true"
        data-slot="native-select-icon"
        className="absolute top-1/2 right-2 -translate-y-1/2 group-data-[size=sm]/native-select:right-1.5"
      >
        <ChevronDownIcon strokeWidth={2.75} className="size-4.5" />
      </ChevronBead>
    </div>
  )
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<'option'>) {
  return (
    <option
      data-slot="native-select-option"
      className={cn('bg-[Canvas] text-[CanvasText]', className)}
      {...props}
    />
  )
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<'optgroup'>) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn('bg-[Canvas] text-[CanvasText]', className)}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
