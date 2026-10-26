'use client'

import * as React from 'react'
import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react'

import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { m } from '@/paraglide/messages'

// The app's own cookie, so the sidebar opens as the app left it.
const SIDEBAR_COOKIE_NAME = 'sidebar_state'
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = '16.5rem'
const SIDEBAR_WIDTH_MOBILE = '18rem'
// Room for a 48px key with 12px either side.
const SIDEBAR_WIDTH_ICON = '4.5rem'
const SIDEBAR_KEYBOARD_SHORTCUT = 'b'

type SidebarContextProps = {
  state: 'expanded' | 'collapsed'
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.')
  }

  return context
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)

  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = openProp ?? _open
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === 'function' ? value(open) : value
      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        _setOpen(openState)
      }

      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    },
    [setOpenProp, open],
  )

  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((prev) => !prev) : setOpen((prev) => !prev)
  }, [isMobile, setOpen, setOpenMobile])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar])

  const state = open ? 'expanded' : 'collapsed'

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
  )

  return (
    <SidebarContext value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            '--sidebar-width': SIDEBAR_WIDTH,
            '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties
        }
        className={cn(
          'group/sidebar-wrapper flex min-h-svh w-full bg-(--sorbet-canvas) md:has-data-[variant=inset]:bg-(--sorbet-rail)',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext>
  )
}

// An apricot sidebar the page floats on: beside an inset, the page is a
// canvas panel with big squircle corners laid on the apricot. It collapses
// to a rail of 48px pillows.
function Sidebar({
  side = 'left',
  variant = 'sidebar',
  collapsible = 'offcanvas',
  className,
  children,
  dir,
  ...props
}: React.ComponentProps<'div'> & {
  side?: 'left' | 'right'
  variant?: 'sidebar' | 'floating' | 'inset'
  collapsible?: 'offcanvas' | 'icon' | 'none'
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

  if (collapsible === 'none') {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          'flex h-full w-(--sidebar-width) flex-col bg-(--sorbet-rail) p-3 text-(--sorbet-rail-ink)',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          dir={dir}
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          showCloseButton={false}
          className="w-(--sidebar-width) max-w-[calc(100%-1.5rem)] bg-(--sorbet-rail) p-3 text-(--sorbet-rail-ink)"
          style={
            {
              '--sidebar-width': SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side={side}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      className="group peer hidden text-(--sorbet-rail-ink) md:block"
      data-state={state}
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      {/* Holds the sidebar's width in the layout. */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          'relative w-(--sidebar-width) bg-transparent motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out',
          'group-data-[collapsible=offcanvas]:w-0 group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
          'group-data-[side=right]:rotate-180',
        )}
      />
      <div
        data-slot="sidebar-container"
        data-side={side}
        className={cn(
          'fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) p-3 motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out data-[side=left]:left-0 data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] data-[side=right]:right-0 data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] md:flex',
          'group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
          variant === 'sidebar' && 'bg-(--sorbet-rail)',
          className,
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="flex size-full flex-col bg-(--sorbet-rail) group-data-[variant=floating]:rounded-4xl group-data-[variant=floating]:p-2 group-data-[variant=floating]:squircle"
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { isMobile, open, openMobile, toggleSidebar } = useSidebar()
  const isOpen = isMobile ? openMobile : open

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      className={cn(
        'shrink-0 text-(--sorbet-rail-ink) hover:bg-(--sorbet-rail-hover) active:bg-(--sorbet-rail-hover)',
        'focus-ring',
        className,
      )}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      {isOpen ? (
        <PanelLeftCloseIcon strokeWidth={2.25} />
      ) : (
        <PanelLeftOpenIcon strokeWidth={2.25} />
      )}
      <span className="sr-only">
        {isOpen ? m.sidebar_collapse() : m.sidebar_expand()}
      </span>
    </Button>
  )
}

// The sidebar's inner edge, to toggle it with the pointer: a soft line
// shows on hover.
function SidebarRail({ className, ...props }: React.ComponentProps<'button'>) {
  const { isMobile, open, openMobile, toggleSidebar } = useSidebar()
  const label = (isMobile ? openMobile : open)
    ? m.sidebar_collapse()
    : m.sidebar_expand()

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label={label}
      tabIndex={-1}
      onClick={toggleSidebar}
      title={label}
      className={cn(
        'absolute inset-y-3 z-20 hidden w-3 group-data-[side=left]:-right-3 group-data-[side=right]:left-0 after:absolute after:inset-y-6 after:left-1/2 after:w-1 after:-translate-x-1/2 after:rounded-full hover:after:bg-(--sorbet-rim) sm:flex',
        'in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize',
        '[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
        className,
      )}
      {...props}
    />
  )
}

function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        'relative flex w-full min-w-0 flex-1 flex-col bg-(--sorbet-canvas) text-(--sorbet-ink) md:peer-data-[variant=inset]:m-3 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-4xl md:peer-data-[variant=inset]:squircle md:peer-data-[variant=inset]:peer-data-[collapsible=offcanvas]:ml-3',
        className,
      )}
      {...props}
    />
  )
}

function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn('h-11 w-full text-base', className)}
      {...props}
    />
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn(
        'flex min-h-11 flex-col gap-2 pb-2 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center',
        className,
      )}
      {...props}
    />
  )
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn('flex flex-col gap-2 pt-2', className)}
      {...props}
    />
  )
}

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn('mx-3 my-1 w-auto bg-(--sorbet-rail-hover)', className)}
      {...props}
    />
  )
}

// It scrolls, which clips at its edges, so it reaches past the rows at the
// sides: focus rings and a squashed Add stay whole.
function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        'no-scrollbar -mx-2.5 flex min-h-0 flex-1 flex-col gap-1 overflow-auto px-2.5 group-data-[collapsible=icon]:overflow-hidden',
        className,
      )}
      {...props}
    />
  )
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn('relative flex w-full min-w-0 flex-col py-2', className)}
      {...props}
    />
  )
}

function SidebarGroupLabel({
  className,
  render,
  ...props
}: useRender.ComponentProps<'div'> & React.ComponentProps<'div'>) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: cn(
          'flex h-8 shrink-0 items-center rounded-lg px-3.5 text-xs font-semibold text-(--sorbet-rail-muted) motion-safe:transition-all motion-safe:duration-200 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 [&>svg]:size-4 [&>svg]:shrink-0',
          'font-heading',
          'focus-ring',
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'sidebar-group-label',
      sidebar: 'group-label',
    },
  })
}

function SidebarGroupAction({
  className,
  render,
  ...props
}: useRender.ComponentProps<'button'> & React.ComponentProps<'button'>) {
  return useRender({
    defaultTagName: 'button',
    props: mergeProps<'button'>(
      {
        className: cn(
          'absolute top-2.5 right-1.5 flex size-8 items-center justify-center rounded-full text-(--sorbet-rail-muted) group-data-[collapsible=icon]:hidden after:absolute after:-inset-1.5 hover:bg-(--sorbet-rail-hover) hover:text-(--sorbet-rail-ink) [&>svg]:size-4.5 [&>svg]:shrink-0',
          'focus-ring',
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'sidebar-group-action',
      sidebar: 'group-action',
    },
  })
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn('w-full', className)}
      {...props}
    />
  )
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn('flex w-full min-w-0 flex-col gap-1.5', className)}
      {...props}
    />
  )
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn('group/menu-item relative', className)}
      {...props}
    />
  )
}

// 48px rows in Gabarito, flat on the apricot. Where you are rises as a
// lemon pillow; Add is the watermelon pillow, pressed like any button.
// Collapsed, each is a 48px squircle with its name in a tooltip; links
// without an icon step out of the rail.
const sidebarMenuButtonVariants = cva(
  [
    'peer/menu-button group/menu-button relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-3.5 py-2 text-left leading-tight font-semibold text-(--sorbet-rail-ink)',
    'squircle',
    'font-heading',
    'focus-ring',
    'motion-safe:transition motion-safe:duration-200',
    'hover:bg-(--sorbet-rail-hover) active:bg-(--sorbet-rail-hover)',
    'disabled:pointer-events-none disabled:text-(--sorbet-rail-muted) aria-disabled:pointer-events-none aria-disabled:text-(--sorbet-rail-muted)',
    'data-active:bg-(--sorbet-butter) data-active:font-bold data-active:text-(--sorbet-butter-ink) data-active:shadow-bead-butter data-active:hover:bg-(--sorbet-butter)',
    'aria-[current=page]:bg-(--sorbet-butter) aria-[current=page]:font-bold aria-[current=page]:text-(--sorbet-butter-ink) aria-[current=page]:shadow-bead-butter aria-[current=page]:hover:bg-(--sorbet-butter)',
    'group-has-data-[sidebar=menu-action]/menu-item:pr-12 group-has-data-[sidebar=menu-badge]/menu-item:pr-12',
    'group-data-[collapsible=icon]:size-12! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:not-has-[>svg]:hidden group-data-[collapsible=icon]:[&>span]:sr-only',
    '[&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:stroke-2',
  ],
  {
    variants: {
      variant: {
        default: '',
        outline: 'shadow-rim hover:shadow-rim-strong',
      },
      size: {
        default: 'min-h-12 text-base',
        sm: 'min-h-10 rounded-xl px-3 text-sm',
        lg: 'min-h-15 text-base group-data-[collapsible=icon]:p-0!',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

// Add: the watermelon pillow, squashing when pressed. On the apricot its
// deep edge is drawn all round, so it stands out at 4.4:1. While its
// dialog or page is open it stays watermelon, held pressed in.
const ADD = cn(
  'tone-melon',
  '[--edge:var(--sorbet-melon-deep)]',
  'pillow',
  'font-bold hover:bg-(--fill) active:bg-(--fill) [&_svg]:stroke-3',
  'data-active:translate-y-px data-active:bg-(--fill) data-active:text-(--fill-ink) data-active:shadow-pillow-held data-active:hover:bg-(--fill)',
)

function SidebarMenuButton({
  render,
  isActive = false,
  variant = 'default',
  size = 'default',
  tooltip,
  className,
  ...props
}: useRender.ComponentProps<'button'> &
  React.ComponentProps<'button'> & {
    isActive?: boolean
    tooltip?: string | React.ComponentProps<typeof TooltipContent>
  } & VariantProps<typeof sidebarMenuButtonVariants>) {
  const { isMobile, state } = useSidebar()
  const comp = useRender({
    defaultTagName: 'button',
    props: mergeProps<'button'>(
      {
        className: cn(
          sidebarMenuButtonVariants({ variant, size }),
          (props as Record<string, unknown>)['data-nav'] === 'add' && ADD,
          className,
        ),
      },
      props,
    ),
    render: !tooltip ? render : <TooltipTrigger render={render} />,
    state: {
      slot: 'sidebar-menu-button',
      sidebar: 'menu-button',
      size,
      active: isActive,
    },
  })

  if (!tooltip) {
    return comp
  }

  if (typeof tooltip === 'string') {
    tooltip = {
      children: tooltip,
    }
  }

  return (
    <Tooltip>
      {comp}
      <TooltipContent
        side="right"
        align="center"
        sideOffset={12}
        hidden={state !== 'collapsed' || isMobile}
        {...tooltip}
      />
    </Tooltip>
  )
}

function SidebarMenuAction({
  className,
  render,
  showOnHover = false,
  ...props
}: useRender.ComponentProps<'button'> &
  React.ComponentProps<'button'> & {
    showOnHover?: boolean
  }) {
  return useRender({
    defaultTagName: 'button',
    props: mergeProps<'button'>(
      {
        className: cn(
          'absolute top-2 right-2 flex size-8 items-center justify-center rounded-full text-(--sorbet-rail-muted) group-data-[collapsible=icon]:hidden peer-data-[size=lg]/menu-button:top-3.5 peer-data-[size=sm]/menu-button:top-1 after:absolute after:-inset-1.5 hover:bg-(--sorbet-rail-hover) hover:text-(--sorbet-rail-ink) peer-data-active/menu-button:text-(--sorbet-butter-ink) peer-data-active/menu-button:hover:bg-(--sorbet-butter-ink)/10 [&>svg]:size-5 [&>svg]:shrink-0',
          'focus-ring',
          showOnHover &&
            'group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 aria-expanded:opacity-100 md:opacity-0',
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'sidebar-menu-action',
      sidebar: 'menu-action',
    },
  })
}

function SidebarMenuBadge({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        'pointer-events-none absolute top-3 right-2.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-(--sorbet-rail-hover) px-2 text-xs font-bold text-(--sorbet-rail-ink) tabular-nums select-none group-data-[collapsible=icon]:hidden peer-data-[size=lg]/menu-button:top-4.5 peer-data-[size=sm]/menu-button:top-2 peer-data-active/menu-button:bg-(--sorbet-butter-ink)/12 peer-data-active/menu-button:text-(--sorbet-butter-ink)',
        'font-heading',
        className,
      )}
      {...props}
    />
  )
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<'div'> & {
  showIcon?: boolean
}) {
  // Random width between 50 to 90%.
  const [width] = React.useState(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`
  })

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn(
        'flex h-12 items-center gap-3 rounded-xl px-3.5',
        className,
      )}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-5 rounded-sm bg-(--sorbet-rail-hover)"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1 rounded-full bg-(--sorbet-rail-hover)"
        data-sidebar="menu-skeleton-text"
        style={
          {
            '--skeleton-width': width,
          } as React.CSSProperties
        }
      />
    </div>
  )
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        'mt-1 ml-6 flex min-w-0 flex-col gap-1 border-l-2 border-(--sorbet-rail-hover) py-0.5 pl-2.5 group-data-[collapsible=icon]:hidden',
        className,
      )}
      {...props}
    />
  )
}

function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn('group/menu-sub-item relative', className)}
      {...props}
    />
  )
}

function SidebarMenuSubButton({
  render,
  size = 'md',
  isActive = false,
  className,
  ...props
}: useRender.ComponentProps<'a'> &
  React.ComponentProps<'a'> & {
    size?: 'sm' | 'md'
    isActive?: boolean
  }) {
  return useRender({
    defaultTagName: 'a',
    props: mergeProps<'a'>(
      {
        className: cn(
          'flex min-h-10 min-w-0 items-center gap-2 overflow-hidden rounded-xl px-3 py-1.5 leading-tight font-medium text-(--sorbet-rail-muted) group-data-[collapsible=icon]:hidden hover:bg-(--sorbet-rail-hover) hover:text-(--sorbet-rail-ink) active:bg-(--sorbet-rail-hover) disabled:pointer-events-none aria-disabled:pointer-events-none data-active:bg-(--sorbet-butter) data-active:font-bold data-active:text-(--sorbet-butter-ink) data-active:shadow-bead-butter-flat data-[size=md]:text-sm data-[size=sm]:text-sm [&>svg]:size-4 [&>svg]:shrink-0',
          'font-heading',
          'focus-ring',
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'sidebar-menu-sub-button',
      sidebar: 'menu-sub-button',
      size,
      active: isActive,
    },
  })
}

export {
  SIDEBAR_COOKIE_NAME,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
}
