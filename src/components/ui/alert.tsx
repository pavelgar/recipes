import * as React from 'react'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

import { DISPLAY } from '@/components/ui/classes'

// A flat tinted panel with big squircle corners: sky for news, the danger
// tint for trouble. Its icon sits on a raised bead in the panel's colour;
// an action goes under the text, so long titles keep the full width on
// phones.
const alertVariants = cva(
  [
    'group/alert relative grid w-full gap-x-3.5 gap-y-1 rounded-[26px] px-4.5 py-4.5 text-left text-[16px] text-(--sorbet-ink) [corner-shape:squircle] has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:pl-4',
    '*:[svg]:row-span-3 *:[svg]:size-10! *:[svg]:rounded-full *:[svg]:bg-current *:[svg]:p-2.5 *:[svg]:[stroke-width:2.5]',
  ],
  {
    variants: {
      variant: {
        default:
          'bg-(--sorbet-sky-soft) *:[svg]:stroke-(--sorbet-sky-ink) *:[svg]:text-(--sorbet-sky) *:[svg]:shadow-[inset_0_1.5px_1px_-0.5px_rgb(255_255_255/0.6),inset_0_-3px_4px_-2px_var(--sorbet-sky-deep),0_4px_8px_-4px_var(--sorbet-sky-deep)]',
        destructive:
          'bg-(--sorbet-danger-soft) *:[svg]:stroke-(--sorbet-melon-ink) *:[svg]:text-(--sorbet-melon) *:[svg]:shadow-[inset_0_1.5px_1px_-0.5px_var(--sorbet-melon-hi),inset_0_-3px_4px_-2px_var(--sorbet-melon-deep),0_4px_8px_-4px_var(--sorbet-melon-glow)] *:data-[slot=alert-title]:text-(--sorbet-danger)',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        'self-center text-[17px] leading-snug font-bold text-pretty group-has-[>svg]/alert:col-start-2 group-has-data-[slot=alert-description]/alert:self-end [&_a]:underline [&_a]:decoration-2 [&_a]:underline-offset-3',
        DISPLAY,
        className,
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'text-[16px] leading-normal text-pretty text-(--sorbet-ink)/85 group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:decoration-2 [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-3',
        className,
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        'mt-2 flex flex-wrap gap-2 group-has-[>svg]/alert:col-start-2',
        className,
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
