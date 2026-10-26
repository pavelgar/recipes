'use client'

import * as React from 'react'
import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'
import { cn } from 'cn'

import { DISPLAY } from '@/components/ui/classes'

type Direction = NonNullable<DrawerPrimitive.Root.Props['swipeDirection']>

type DrawerContextProps = {
  hasSnapPoints: boolean
  modal: DrawerPrimitive.Root.Props['modal']
  showSwipeHandle: boolean
  swipeDirection: Direction
}

const DrawerContext = React.createContext<DrawerContextProps | null>(null)

function useDrawer() {
  const context = React.useContext(DrawerContext)

  if (!context) {
    throw new Error('useDrawer must be used within a Drawer.')
  }

  return context
}

function Drawer({
  modal = true,
  showSwipeHandle = false,
  snapPoints,
  swipeDirection = 'down',
  ...props
}: DrawerPrimitive.Root.Props & {
  showSwipeHandle?: boolean
}) {
  const hasSnapPoints = snapPoints != null && snapPoints.length > 0
  const contextValue = React.useMemo(
    () => ({ hasSnapPoints, modal, showSwipeHandle, swipeDirection }),
    [hasSnapPoints, modal, showSwipeHandle, swipeDirection],
  )

  return (
    <DrawerContext value={contextValue}>
      <DrawerPrimitive.Root
        data-slot="drawer"
        modal={modal}
        snapPoints={snapPoints}
        swipeDirection={swipeDirection}
        {...props}
      />
    </DrawerContext>
  )
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn(
        'fixed inset-0 z-50 min-h-dvh bg-(--sorbet-overlay) opacity-[calc(1-var(--drawer-swipe-progress,0))] select-none supports-[-webkit-touch-callout:none]:absolute data-ending-style:pointer-events-none data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0 motion-safe:transition-opacity motion-safe:duration-300',
        className,
      )}
      {...props}
    />
  )
}

// A sunk grabber across the top of a bottom sheet, or down the inner edge
// of a side one.
function DrawerSwipeHandle({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const { swipeDirection } = useDrawer()
  const vertical = swipeDirection === 'down' || swipeDirection === 'up'
  return (
    <div
      data-slot="drawer-swipe-handle"
      aria-hidden="true"
      className={cn(
        'flex shrink-0 cursor-grab items-center justify-center active:cursor-grabbing',
        vertical ? 'h-7 w-full' : 'h-full w-7',
        swipeDirection === 'up' && 'order-last',
        swipeDirection === 'left' && 'order-last',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'rounded-full bg-(--sorbet-surface-strong) shadow-[inset_0_1px_2px_0_var(--sorbet-well-shade)]',
          vertical ? 'mt-1.5 h-2 w-16' : 'h-16 w-2',
        )}
      />
    </div>
  )
}

// Where each kind of drawer sits, and the transform that follows the
// swipe and hides it when closed.
const PLACES: Record<Direction, string> = {
  down: 'inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] mx-auto max-h-[calc(100dvh-5rem)] max-w-lg flex-col [transform:translate3d(0,calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y,0px)),0)] data-ending-style:[transform:translate3d(0,calc(100%+1rem),0)] data-starting-style:[transform:translate3d(0,calc(100%+1rem),0)]',
  up: 'inset-x-2 top-[max(0.5rem,env(safe-area-inset-top))] mx-auto max-h-[calc(100dvh-5rem)] max-w-lg flex-col [transform:translate3d(0,calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y,0px)),0)] data-ending-style:[transform:translate3d(0,calc(-100%-1rem),0)] data-starting-style:[transform:translate3d(0,calc(-100%-1rem),0)]',
  right:
    'top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] bottom-[max(0.75rem,env(safe-area-inset-bottom))] w-[calc(100%-1.5rem)] max-w-sm flex-row [transform:translate3d(var(--drawer-swipe-movement-x,0px),0,0)] data-ending-style:[transform:translate3d(calc(100%+1.5rem),0,0)] data-starting-style:[transform:translate3d(calc(100%+1.5rem),0,0)]',
  left: 'top-[max(0.75rem,env(safe-area-inset-top))] bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] w-[calc(100%-1.5rem)] max-w-sm flex-row [transform:translate3d(var(--drawer-swipe-movement-x,0px),0,0)] data-ending-style:[transform:translate3d(calc(-100%-1.5rem),0,0)] data-starting-style:[transform:translate3d(calc(-100%-1.5rem),0,0)]',
}

// A floating bottom sheet with big squircle corners on a tinted shadow,
// swiped down to close; a side drawer floats like the sheet.
function DrawerContent({
  className,
  children,
  ...props
}: DrawerPrimitive.Popup.Props) {
  const { hasSnapPoints, modal, showSwipeHandle, swipeDirection } = useDrawer()
  const swipeAxis =
    swipeDirection === 'down' || swipeDirection === 'up' ? 'y' : 'x'

  return (
    <DrawerPortal>
      {modal === true && (
        <DrawerOverlay data-snap-points={hasSnapPoints ? '' : undefined} />
      )}
      <DrawerPrimitive.Viewport
        data-slot="drawer-viewport"
        data-modal={modal}
        className="pointer-events-none fixed inset-0 z-50 select-none data-[modal=true]:pointer-events-auto"
      >
        <DrawerPrimitive.Popup
          data-slot="drawer-popup"
          data-swipe-axis={swipeAxis}
          data-snap-points={hasSnapPoints ? '' : undefined}
          className={cn(
            'group/drawer-popup pointer-events-auto fixed z-50 flex min-h-0 bg-(--sorbet-canvas) text-[16px] text-(--sorbet-ink) shadow-(--sorbet-float) outline-none select-none [corner-shape:squircle]',
            swipeAxis === 'y' ? 'rounded-[40px]' : 'rounded-[36px]',
            'will-change-transform data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*400ms)] data-swiping:duration-0 motion-safe:transition-transform motion-safe:duration-450 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]',
            PLACES[swipeDirection],
            className,
          )}
          {...props}
        >
          {showSwipeHandle && <DrawerSwipeHandle />}
          <DrawerPrimitive.Content
            data-slot="drawer-content"
            className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain rounded-[inherit] select-text group-data-swiping/drawer-popup:select-none"
          >
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        'flex shrink-0 flex-col gap-1.5 px-6 pt-6 pb-0 group-has-data-[slot=drawer-swipe-handle]/drawer-popup:pt-3 group-data-[swipe-axis=y]/drawer-popup:items-center group-data-[swipe-axis=y]/drawer-popup:text-center',
        className,
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(
        'mt-auto flex shrink-0 flex-col gap-3 p-6 pt-2 group-data-[swipe-axis=y]/drawer-popup:pb-[max(1.5rem,env(safe-area-inset-bottom))]',
        className,
      )}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        'text-[24px] leading-tight font-extrabold tracking-[-0.02em] text-pretty text-(--sorbet-ink)',
        DISPLAY,
        className,
      )}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn(
        'text-[16px] leading-normal text-balance text-(--sorbet-ink-muted)',
        className,
      )}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerSwipeHandle,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
