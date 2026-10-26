'use client'

import * as React from 'react'
import { Toast as ToastPrimitive } from '@base-ui/react/toast'
import { cn } from 'cn'
import {
  CircleCheckIcon,
  InfoIcon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react'

import { DISPLAY, FOCUS, PILLOW, TONE } from '@/components/ui/classes'
import { Spinner } from '@/components/ui/spinner'
import { m } from '@/paraglide/messages'

const toast = ToastPrimitive.createToastManager()

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />
}

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />
}

// Across the top on phones, at the top right on wider screens.
function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        'pointer-events-none fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-50 mx-auto w-auto max-w-sm outline-none sm:top-[calc(1.5rem+env(safe-area-inset-top))] sm:right-[calc(2rem+env(safe-area-inset-right))] sm:left-auto sm:mx-0 sm:w-full',
        className,
      )}
      {...props}
    />
  )
}

// A white pillow floating on a tinted shadow. Toasts stack downwards from
// the top, drop in from above with a little spring and swipe away upwards
// or to the right.
function Toast({
  className,
  swipeDirection = ['up', 'right'],
  ...props
}: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      swipeDirection={swipeDirection}
      className={cn(
        'group/toast pointer-events-auto absolute top-0 right-0 z-[calc(1000-var(--toast-index))] w-full origin-top rounded-[32px] bg-(--sorbet-plain) text-(--sorbet-ink) shadow-[inset_0_0_0_1.5px_var(--sorbet-surface-strong),0_24px_40px_-16px_rgb(90_40_56/0.35),0_6px_12px_-6px_rgb(90_40_56/0.2)] will-change-transform select-none [corner-shape:squircle] dark:shadow-[inset_0_0_0_1.5px_var(--sorbet-surface-strong),0_24px_40px_-14px_rgb(0_0_0/0.8),0_6px_12px_-6px_rgb(0_0_0/0.5)]',
        FOCUS,
        '[--gap:0.625rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)+calc(var(--toast-index)*var(--gap))+var(--toast-swipe-movement-y))] [--peek:0.625rem] [--scale:calc(max(0,1-(var(--toast-index)*0.08)))] [--shrink:calc(1-var(--scale))]',
        'h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+(var(--toast-index)*var(--peek))+(var(--shrink)*var(--height))))_scale(var(--scale))]',
        'motion-safe:[transition:transform_450ms_cubic-bezier(0.34,1.3,0.64,1),opacity_400ms,height_150ms]',
        "after:absolute after:bottom-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
        'data-expanded:h-(--toast-height) data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]',
        'data-limited:opacity-0 data-starting-style:[transform:translateY(-150%)]',
        '[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(-150%)]',
        'data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]',
        'data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]',
        'data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]',
        'data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]',
        className,
      )}
      {...props}
    />
  )
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        'flex h-full min-h-15 items-center gap-3 overflow-hidden py-2.5 pr-2.5 pl-5 transition-opacity duration-250 has-data-[slot=toast-icon]:pl-2.5 data-behind:opacity-0 data-expanded:opacity-100',
        className,
      )}
      {...props}
    />
  )
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn(
        'text-[16px] leading-snug font-semibold text-pretty',
        DISPLAY,
        className,
      )}
      {...props}
    />
  )
}

function ToastDescription({
  className,
  ...props
}: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn(
        'text-[15px] leading-snug text-pretty text-(--sorbet-ink-muted)',
        className,
      )}
      {...props}
    />
  )
}

// The action is a small lemon pillow.
function ToastAction({
  className,
  render = <button type="button" />,
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      className={cn(
        'relative h-10 shrink-0 rounded-full px-4.5 pb-0.5 text-[15px] font-bold',
        TONE.butter,
        PILLOW,
        DISPLAY,
        FOCUS,
        className,
      )}
      {...props}
    />
  )
}

function ToastClose({
  className,
  children,
  render = <button type="button" />,
  ...props
}: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label={m.toast_close()}
      render={render}
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center rounded-full text-(--sorbet-ink-muted) after:absolute after:-inset-1 after:content-[''] hover:bg-(--sorbet-surface) hover:text-(--sorbet-ink) motion-safe:active:scale-90 motion-safe:transition-[scale,background-color]",
        FOCUS,
        className,
      )}
      {...props}
    >
      {children ?? (
        <XIcon aria-hidden="true" strokeWidth={2.75} className="size-5" />
      )}
    </ToastPrimitive.Close>
  )
}

// What kind of news it is, on a raised bead: pistachio for done, sky for
// news, lemon for a warning or a wait, watermelon for trouble.
const ICONS: Record<string, { icon: React.ReactNode; fill: string }> = {
  success: {
    icon: <CircleCheckIcon />,
    fill: 'bg-(--sorbet-mint) text-(--sorbet-mint-ink) shadow-[inset_0_1.5px_1px_-0.5px_rgb(255_255_255/0.6),inset_0_-3px_4px_-2px_var(--sorbet-mint-deep)]',
  },
  info: {
    icon: <InfoIcon />,
    fill: 'bg-(--sorbet-sky) text-(--sorbet-sky-ink) shadow-[inset_0_1.5px_1px_-0.5px_rgb(255_255_255/0.6),inset_0_-3px_4px_-2px_var(--sorbet-sky-deep)]',
  },
  warning: {
    icon: <TriangleAlertIcon />,
    fill: 'bg-(--sorbet-butter) text-(--sorbet-butter-ink) shadow-[inset_0_1.5px_1px_-0.5px_var(--sorbet-butter-hi),inset_0_-3px_4px_-2px_var(--sorbet-butter-deep)]',
  },
  error: {
    icon: <OctagonXIcon />,
    fill: 'bg-(--sorbet-melon) text-(--sorbet-melon-ink) shadow-[inset_0_1.5px_1px_-0.5px_var(--sorbet-melon-hi),inset_0_-3px_4px_-2px_var(--sorbet-melon-deep)]',
  },
  loading: {
    icon: <Spinner aria-hidden role="presentation" className="text-current" />,
    fill: 'bg-(--sorbet-butter) text-(--sorbet-butter-ink) shadow-[inset_0_1.5px_1px_-0.5px_var(--sorbet-butter-hi),inset_0_-3px_4px_-2px_var(--sorbet-butter-deep)]',
  },
}

function ToastIcon({ type }: { type: string | undefined }) {
  const kind = type ? ICONS[type] : undefined
  if (!kind) {
    return null
  }

  return (
    <span
      data-slot="toast-icon"
      aria-hidden="true"
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full [&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-5 [&_svg]:[stroke-width:2.5]',
        kind.fill,
      )}
    >
      {kind.icon}
    </span>
  )
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()

  return toasts.map((toastItem) => (
    <Toast key={toastItem.id} toast={toastItem}>
      <ToastContent>
        <ToastIcon type={toastItem.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <ToastTitle />
          <ToastDescription />
        </div>
        <ToastAction />
        <ToastClose />
      </ToastContent>
    </Toast>
  ))
}

function Toaster({
  children,
  toastManager = toast,
  ...props
}: ToastPrimitive.Provider.Props) {
  return (
    <ToastProvider toastManager={toastManager} {...props}>
      {children}
      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  )
}

const createToastManager = ToastPrimitive.createToastManager
const useToastManager = ToastPrimitive.useToastManager

export {
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  toast,
  useToastManager,
}
