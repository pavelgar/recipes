import { useMemo } from 'react'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { CircleAlertIcon } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { DISPLAY } from '@/components/ui/classes'

function FieldSet({ className, ...props }: React.ComponentProps<'fieldset'>) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        'flex min-w-0 flex-col gap-5 has-[>[data-slot=checkbox-group]]:gap-3.5 has-[>[data-slot=radio-group]]:gap-3.5',
        className,
      )}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  variant = 'legend',
  ...props
}: React.ComponentProps<'legend'> & { variant?: 'legend' | 'label' }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        'mb-1 text-(--sorbet-ink) data-[variant=label]:text-[16px] data-[variant=label]:font-semibold data-[variant=legend]:mb-2 data-[variant=legend]:text-[20px] data-[variant=legend]:font-extrabold data-[variant=legend]:tracking-[-0.015em]',
        DISPLAY,
        className,
      )}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        'group/field-group @container/field-group flex w-full flex-col gap-6 data-[slot=checkbox-group]:gap-3.5 *:data-[slot=field-group]:gap-4',
        className,
      )}
      {...props}
    />
  )
}

// Label above, field below; a checkbox or radio sits beside its label,
// lined up with the label's first line.
const fieldVariants = cva('group/field flex w-full min-w-0', {
  variants: {
    orientation: {
      vertical: 'flex-col gap-2 *:w-full [&>.sr-only]:w-auto',
      horizontal:
        'flex-row items-center gap-3 has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:*:data-[slot=field-content]:pt-0.5',
      responsive:
        'flex-col gap-2 *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:gap-4 @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto',
    },
  },
  defaultVariants: {
    orientation: 'vertical',
  },
})

function Field({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-content"
      className={cn(
        'group/field-content flex min-w-0 flex-1 flex-col gap-1 leading-snug',
        className,
      )}
      {...props}
    />
  )
}

// A label wrapping a whole field is a choice card: a raised white pillow
// that, chosen, stays pressed in and turns lemon.
function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:text-(--sorbet-ink-muted)',
        'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-[26px] has-[>[data-slot=field]]:[corner-shape:squircle] *:data-[slot=field]:p-4.5',
        'has-[>[data-slot=field]]:bg-(--sorbet-plain) has-[>[data-slot=field]]:shadow-[inset_0_0_0_1.5px_var(--sorbet-surface-strong),inset_0_-5px_6px_-3px_var(--sorbet-plain-deep),0_9px_16px_-9px_var(--sorbet-plain-glow),0_2px_3px_-1px_var(--sorbet-plain-glow)]',
        'has-[>[data-slot=field]]:origin-bottom has-[>[data-slot=field]]:motion-safe:transition-[scale,translate,box-shadow,background-color] has-[>[data-slot=field]]:motion-safe:duration-300 has-[>[data-slot=field]]:motion-safe:ease-[cubic-bezier(0.34,1.5,0.5,1)]',
        'has-[>[data-slot=field]]:not-has-data-checked:hover:shadow-[inset_0_0_0_1.5px_var(--sorbet-surface-strong),inset_0_-5px_6px_-3px_var(--sorbet-plain-deep),0_13px_20px_-10px_var(--sorbet-plain-glow),0_3px_5px_-1px_var(--sorbet-plain-glow)] has-[>[data-slot=field]]:motion-safe:active:scale-[0.985]',
        'has-[>[data-slot=field]]:has-data-checked:translate-y-px has-[>[data-slot=field]]:has-data-checked:bg-(--sorbet-butter) has-[>[data-slot=field]]:has-data-checked:shadow-[inset_0_3px_6px_-1px_var(--sorbet-butter-deep),inset_0_0_0_1.5px_color-mix(in_srgb,var(--sorbet-butter-deep)_45%,transparent)]',
        'has-[>[data-slot=field]]:has-data-checked:[--sorbet-ink-muted:var(--sorbet-butter-ink)] has-[>[data-slot=field]]:has-data-checked:[--sorbet-ink:var(--sorbet-butter-ink)]',
        'has-[>[data-slot=field]]:has-focus-visible:ring-4 has-[>[data-slot=field]]:has-focus-visible:ring-(color:--sorbet-focus-halo) has-[>[data-slot=field]]:has-focus-visible:ring-offset-[2.5px] has-[>[data-slot=field]]:has-focus-visible:ring-offset-(color:--sorbet-focus)',
        className,
      )}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        'flex w-fit items-center gap-2 text-[17px] leading-snug font-bold text-(--sorbet-ink) group-data-[disabled=true]/field:text-(--sorbet-ink-muted)',
        DISPLAY,
        className,
      )}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        'text-left text-[15px] leading-normal font-normal text-pretty text-(--sorbet-ink-muted) [[data-variant=legend]+&]:-mt-1.5',
        '[&>a]:font-semibold [&>a]:text-(--sorbet-ink) [&>a]:underline [&>a]:decoration-[color:var(--sorbet-melon)] [&>a]:decoration-2 [&>a]:underline-offset-3 [&>a:hover]:decoration-[color:var(--sorbet-melon-deep)]',
        className,
      )}
      {...props}
    />
  )
}

// A soft rule with its word in a small sunk pill across the middle.
function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn('relative flex h-7 items-center', className)}
      {...props}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-(--sorbet-surface-strong)"
      />
      {children && (
        <span
          className={cn(
            'relative mx-auto block w-fit rounded-full bg-(--sorbet-surface) px-3.5 py-0.5 text-[15px] font-semibold text-(--sorbet-ink-muted)',
            DISPLAY,
          )}
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  )
}

// The message under an invalid field, behind an alert icon.
function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<'div'> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const content = useMemo(() => {
    if (children) {
      return children
    }

    if (!errors?.length) {
      return null
    }

    const uniqueErrors = [
      ...new Map(errors.map((error) => [error?.message, error])).values(),
    ]

    if (uniqueErrors.length == 1) {
      return uniqueErrors[0]?.message
    }

    return (
      <ul className="flex list-disc flex-col gap-1 pl-4">
        {uniqueErrors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>,
        )}
      </ul>
    )
  }, [children, errors])

  if (!content) {
    return null
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn(
        'flex items-start gap-1.5 text-[15px] leading-snug font-semibold text-(--sorbet-danger)',
        className,
      )}
      {...props}
    >
      <CircleAlertIcon
        aria-hidden
        strokeWidth={2.5}
        className="mt-px size-[18px] shrink-0"
      />
      <div className="min-w-0">{content}</div>
    </div>
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
}
