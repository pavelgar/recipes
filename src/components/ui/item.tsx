import * as React from 'react'
import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

import { Separator } from '@/components/ui/separator'

function ItemGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role="list"
      data-slot="item-group"
      className={cn(
        'group/item-group flex w-full flex-col gap-3 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2',
        className,
      )}
      {...props}
    />
  )
}

function ItemSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="item-separator"
      orientation="horizontal"
      className={cn('my-2', className)}
      {...props}
    />
  )
}

// Rows are flat: the apricot surface tint by default, a white card with a
// soft edge for outline, a deeper tint for muted. A row that's a link
// rises into a pillow under the pointer (a shadow in its tint) and
// squashes a little when pressed.
const itemVariants = cva(
  [
    'group/item flex w-full flex-wrap items-center rounded-4xl text-left text-(--sorbet-ink) squircle',
    'focus-ring',
    '[a]:cursor-pointer [a]:origin-bottom [a]:hover:shadow-lift [a]:motion-safe:hover:-translate-y-0.5 [a]:active:shadow-edge [a]:motion-safe:active:translate-y-0 [a]:motion-safe:active:scale-y-97 [a]:motion-safe:transition [a]:motion-safe:duration-300 [a]:motion-safe:ease-spring [a]:motion-safe:active:duration-75',
  ],
  {
    variants: {
      variant: {
        default:
          'bg-(--sorbet-surface) [--edge:transparent] [a]:hover:bg-(--sorbet-plain)',
        outline:
          'bg-(--sorbet-plain) shadow-edge [--edge:var(--sorbet-surface-strong)]',
        muted: 'bg-(--sorbet-surface-strong) [--edge:transparent]',
      },
      size: {
        default: 'gap-4 px-5 py-4',
        sm: 'gap-3 px-4 py-3',
        xs: 'min-h-11 gap-2.5 rounded-2xl px-3 py-2 in-data-[slot=dropdown-menu-content]:p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Item({
  className,
  variant = 'default',
  size = 'default',
  render,
  ...props
}: useRender.ComponentProps<'div'> & VariantProps<typeof itemVariants>) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: cn(itemVariants({ variant, size, className })),
      },
      props,
    ),
    render,
    state: {
      slot: 'item',
      variant,
      size,
    },
  })
}

// An icon sits on a small sunk tile in the row.
const itemMediaVariants = cva(
  'flex shrink-0 items-center justify-center gap-2 group-has-data-[slot=item-description]/item:self-start [&_svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-transparent text-(--sorbet-ink)',
        icon: "size-11 rounded-xl bg-(--sorbet-canvas) text-(--sorbet-ink) squircle shadow-shade group-data-[variant=outline]/item:bg-(--sorbet-well) group-data-[size=xs]/item:size-8 group-data-[size=xs]/item:rounded-lg [&_svg:not([class*='size-'])]:size-5",
        image:
          'size-12 overflow-hidden rounded-2xl squircle group-data-[size=sm]/item:size-11 group-data-[size=xs]/item:size-8 group-data-[size=xs]/item:rounded-lg [&_img]:size-full [&_img]:object-cover',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function ItemMedia({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof itemMediaVariants>) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(itemMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function ItemContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-content"
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-0.5 group-data-[size=xs]/item:gap-0 [&+[data-slot=item-content]]:flex-none',
        className,
      )}
      {...props}
    />
  )
}

// Titles wrap rather than cut: Finnish names run long.
function ItemTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-title"
      className={cn(
        'flex min-w-0 items-center gap-2 text-lg leading-snug font-bold tracking-normal text-pretty break-words group-data-[size=sm]/item:text-base group-data-[size=xs]/item:text-base group-data-[size=xs]/item:font-semibold',
        'font-heading',
        className,
      )}
      {...props}
    />
  )
}

function ItemDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="item-description"
      className={cn(
        'text-left text-sm leading-normal font-normal text-pretty text-(--sorbet-ink-muted) group-data-[size=xs]/item:text-sm [&>a]:underline [&>a]:decoration-(--sorbet-melon) [&>a]:decoration-2 [&>a]:underline-offset-3 [&>a:hover]:decoration-(--sorbet-melon-deep)',
        className,
      )}
      {...props}
    />
  )
}

function ItemActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-actions"
      className={cn('flex items-center gap-2', className)}
      {...props}
    />
  )
}

function ItemHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-header"
      className={cn(
        'flex basis-full items-center justify-between gap-3',
        className,
      )}
      {...props}
    />
  )
}

function ItemFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-footer"
      className={cn(
        'flex basis-full items-center justify-end gap-2 pt-1',
        className,
      )}
      {...props}
    />
  )
}

export {
  Item,
  ItemMedia,
  ItemContent,
  ItemActions,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
  ItemDescription,
  ItemHeader,
  ItemFooter,
}
