'use client'

import * as React from 'react'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

import { Button } from '@/components/ui/button'

// The well holding an input or textarea with icons, units and small
// pillows beside it, or bars of text above and below it. Focus, invalid
// and disabled show on the whole well.
function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        'field',
        'group/input-group relative flex h-13 w-full min-w-0 items-center outline-none',
        'has-[[data-slot=input-group-control]:focus-visible]:bg-(--sorbet-canvas) has-[[data-slot=input-group-control]:focus-visible]:shadow-well-focus',
        'has-[[data-slot][aria-invalid=true]]:bg-(--sorbet-danger-soft) has-[[data-slot][aria-invalid=true]]:shadow-well-invalid',
        'has-[[data-slot][aria-invalid=true]]:has-[[data-slot=input-group-control]:focus-visible]:bg-(--sorbet-canvas) has-[[data-slot][aria-invalid=true]]:has-[[data-slot=input-group-control]:focus-visible]:shadow-well-invalid-focus',
        'has-[[data-slot=input-group-control]:disabled]:bg-transparent has-[[data-slot=input-group-control]:disabled]:shadow-none has-[[data-slot=input-group-control]:disabled]:outline-2 has-[[data-slot=input-group-control]:disabled]:-outline-offset-2 has-[[data-slot=input-group-control]:disabled]:outline-(--sorbet-rim)/60 has-[[data-slot=input-group-control]:disabled]:outline-dashed',
        'has-[>textarea]:h-auto has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col',
        'has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5',
        'in-data-[slot=combobox-content]:has-[[data-slot=input-group-control]:focus-visible]:shadow-well-focus',
        className,
      )}
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 text-(--sorbet-ink-muted) select-none group-has-[[data-slot=input-group-control]:disabled]/input-group:opacity-70 [&>svg:not([class*='size-'])]:size-5",
  {
    variants: {
      align: {
        'inline-start': 'order-first self-stretch pl-4.5 has-[>button]:pl-1.5',
        'inline-end': 'order-last self-stretch pr-4.5 has-[>button]:pr-1.5',
        'block-start':
          'order-first w-full justify-start px-4.5 pt-3 pb-1.5 [&.border-b]:pb-2.5 [&.border-b]:shadow-rule-bottom',
        'block-end':
          'order-last w-full justify-start px-4.5 pt-1.5 pb-2 has-[>button]:pr-2 [&.border-t]:pt-2 [&.border-t]:shadow-rule-top',
      },
    },
    defaultVariants: {
      align: 'inline-start',
    },
  },
)

function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) {
          return
        }
        e.currentTarget.parentElement?.querySelector('input')?.focus()
      }}
      {...props}
    />
  )
}

// Pillows inside the well are smaller, so they fit its height; they sit
// up out of the well.
const inputGroupButtonVariants = cva('', {
  variants: {
    size: {
      xs: "h-9 gap-1.5 rounded-xl px-3.5 text-sm has-[>svg]:px-3 [&>svg:not([class*='size-'])]:size-4",
      sm: "h-10 gap-1.5 rounded-xl px-4 text-sm [&>svg:not([class*='size-'])]:size-4.5",
      'icon-xs':
        "size-9 rounded-full p-0 [&>svg:not([class*='size-'])]:size-4.5",
      'icon-sm':
        "size-10 rounded-full p-0 pb-0.5 [&>svg:not([class*='size-'])]:size-5",
    },
  },
  defaultVariants: {
    size: 'xs',
  },
})

function InputGroupButton({
  className,
  type = 'button',
  variant = 'ghost',
  size = 'xs',
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'size' | 'type'> &
  VariantProps<typeof inputGroupButtonVariants> & {
    type?: 'button' | 'submit' | 'reset'
  }) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(
        inputGroupButtonVariants({ size }),
        variant === 'ghost' && 'hover:bg-(--sorbet-surface-strong)',
        className,
      )}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-sm font-semibold text-(--sorbet-ink-muted) [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5",
        'font-heading',
        className,
      )}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<'input'>) {
  return (
    <input
      data-slot="input-group-control"
      className={cn(
        'h-full w-full min-w-0 flex-1 rounded-2xl bg-transparent px-4.5 text-base text-(--sorbet-ink) outline-none placeholder:text-(--sorbet-ink-muted) disabled:cursor-not-allowed disabled:text-(--sorbet-ink-muted)',
        className,
      )}
      {...props}
    />
  )
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="input-group-control"
      className={cn(
        'field-sizing-content min-h-24 w-full flex-1 resize-none bg-transparent px-4.5 py-3 text-base leading-relaxed text-(--sorbet-ink) outline-none placeholder:text-(--sorbet-ink-muted) disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
}
