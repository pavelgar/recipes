import * as React from 'react'
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog'
import { cn } from 'cn'
import { XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        'fixed inset-0 z-50 min-h-dvh bg-(--sorbet-overlay) supports-[-webkit-touch-callout:none]:absolute motion-safe:transition-opacity motion-safe:duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0',
        className,
      )}
      {...props}
    />
  )
}

const SIDES = {
  right:
    'top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] bottom-[max(0.75rem,env(safe-area-inset-bottom))] w-[calc(100%-1.5rem)] max-w-sm data-ending-style:translate-x-[calc(100%+1.5rem)] data-starting-style:translate-x-[calc(100%+1.5rem)]',
  left: 'top-[max(0.75rem,env(safe-area-inset-top))] bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] w-[calc(100%-1.5rem)] max-w-sm data-ending-style:-translate-x-[calc(100%+1.5rem)] data-starting-style:-translate-x-[calc(100%+1.5rem)]',
  top: 'inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] max-h-[calc(100dvh-1.5rem)] data-ending-style:-translate-y-[calc(100%+1.5rem)] data-starting-style:-translate-y-[calc(100%+1.5rem)]',
  bottom:
    'inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] max-h-[calc(100dvh-1.5rem)] data-ending-style:translate-y-[calc(100%+1.5rem)] data-starting-style:translate-y-[calc(100%+1.5rem)]',
} as const

// A floating canvas panel with big squircle corners and a tinted shadow,
// clear of every edge, sliding in from its side.
function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: 'top' | 'right' | 'bottom' | 'left'
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          'fixed z-50 flex flex-col overflow-y-auto overscroll-contain rounded-4xl bg-(--sorbet-canvas) text-base text-(--sorbet-ink) shadow-float outline-none squircle',
          'motion-safe:transition motion-safe:duration-300 motion-safe:ease-glide motion-reduce:data-ending-style:translate-0 motion-reduce:data-ending-style:opacity-0 motion-reduce:data-starting-style:translate-0',
          SIDES[side],
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="outline"
                size="icon-sm"
                className="absolute top-4 right-4"
              />
            }
          >
            <XIcon strokeWidth={2.75} />
            <span className="sr-only">{m.dialog_close()}</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-1.5 p-6 pr-18', className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex flex-col gap-3 p-6', className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        'text-2xl leading-tight font-extrabold tracking-tight text-pretty text-(--sorbet-ink)',
        'font-heading',
        className,
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn(
        'text-base leading-normal text-pretty text-(--sorbet-ink-muted)',
        className,
      )}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
