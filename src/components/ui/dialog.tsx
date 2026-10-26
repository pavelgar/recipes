import * as React from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { cn } from 'cn'
import { XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DISPLAY } from '@/components/ui/classes'
import { m } from '@/paraglide/messages'

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

// A plum veil over the page. On iOS it's part of the page rather than
// fixed, covering all of it: Safari 26 draws no fixed layer behind its
// floating toolbar, but it does draw the page there.
function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 isolate z-50 min-h-dvh bg-(--sorbet-overlay) supports-[-webkit-touch-callout:none]:absolute motion-safe:transition-opacity motion-safe:duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0',
        className,
      )}
      {...props}
    />
  )
}

// On phones a sheet that rises from the bottom, with big squircle top
// corners and a grabber; on wider screens a canvas card floating on a
// tinted shadow, swelling in with a little spring. No rim: it floats.
// Either way a modal dialog with its close pillow.
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          'fixed z-50 flex flex-col gap-6 overflow-y-auto overscroll-contain bg-(--sorbet-canvas) text-[16px] text-(--sorbet-ink) shadow-(--sorbet-float) outline-none [corner-shape:squircle]',
          // Phones: a bottom sheet.
          'inset-x-0 bottom-0 max-h-[calc(100dvh-2.5rem)] rounded-t-[40px] px-5 pt-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))]',
          'motion-safe:transition-[translate,scale,opacity] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:translate-y-full data-starting-style:translate-y-full motion-reduce:data-ending-style:translate-y-0 motion-reduce:data-starting-style:translate-y-0',
          // Wider screens: a card in the middle, popping in.
          'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[calc(100dvh-4rem)] sm:w-[calc(100%-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[40px] sm:p-8',
          'sm:motion-safe:ease-[cubic-bezier(0.34,1.56,0.64,1)] sm:data-ending-style:-translate-y-1/2 sm:data-ending-style:scale-95 sm:data-ending-style:opacity-0 sm:data-ending-style:duration-150 sm:data-ending-style:ease-in sm:data-starting-style:-translate-y-1/2 sm:data-starting-style:scale-[0.88] sm:data-starting-style:opacity-0',
          className,
        )}
        {...props}
      >
        <span
          aria-hidden
          className="absolute top-3 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-(--sorbet-surface-strong) shadow-[inset_0_1px_2px_0_var(--sorbet-well-shade)] sm:hidden"
        />
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="outline"
                size="icon-sm"
                className="absolute top-4 right-4 sm:top-6 sm:right-6"
              />
            }
          >
            <XIcon strokeWidth={2.75} />
            <span className="sr-only">{m.dialog_close()}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1.5 pr-14', className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-3 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          {m.dialog_close()}
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        'text-[26px] leading-tight font-extrabold tracking-[-0.02em] text-pretty',
        DISPLAY,
        className,
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        'text-[16px] leading-normal text-pretty text-(--sorbet-ink-muted) *:[a]:underline *:[a]:decoration-2 *:[a]:underline-offset-3',
        className,
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
