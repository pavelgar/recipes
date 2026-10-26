import * as React from 'react'
import { cn } from 'cn'

import { DISPLAY } from '@/components/ui/classes'

// A flat, calm container: the apricot surface tint, big squircle corners,
// no rim and no shadow. Volume stays with what's pressed inside it.
function Card({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<'div'> & { size?: 'default' | 'sm' }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        'group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-[36px] bg-(--sorbet-surface) py-(--card-spacing) text-[16px] text-(--sorbet-ink) [corner-shape:squircle] [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:rounded-[28px] data-[size=sm]:[--card-spacing:--spacing(4.5)]',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'group/card-header @container/card-header grid auto-rows-min items-start gap-1.5 px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:border-b-2 [.border-b]:border-(--sorbet-surface-strong) [.border-b]:pb-(--card-spacing)',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        'min-w-0 text-[22px] leading-tight font-extrabold tracking-[-0.02em] text-pretty break-words group-data-[size=sm]/card:text-[18px]',
        DISPLAY,
        className,
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        'text-[16px] leading-normal text-pretty text-(--sorbet-ink-muted)',
        className,
      )}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 -mt-1.5 -mr-2 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-(--card-spacing)', className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center gap-3 px-(--card-spacing) [.border-t]:border-t-2 [.border-t]:border-(--sorbet-surface-strong) [.border-t]:pt-(--card-spacing)',
        className,
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
