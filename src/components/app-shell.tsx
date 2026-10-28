import { Link, linkOptions, useLocation } from '@tanstack/react-router'
import { createIsomorphicFn } from '@tanstack/react-start'
import { cn } from 'cn'
import { getCookie } from '@tanstack/react-start/server'
import {
  HouseIcon,
  LibraryBigIcon,
  ListOrderedIcon,
  PlusIcon,
  SettingsIcon,
} from 'lucide-react'

import { createContext, use, useEffect, useState } from 'react'

import {
  AddRecipeProvider,
  useOpenAddRecipe,
} from '@/components/add-recipe/add-recipe'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  SIDEBAR_COOKIE_NAME,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { m } from '@/paraglide/messages'

// Home is active only on itself; the others also on the pages under them.
// Add stands out from the rest: a round button in the middle of the bottom
// bar, and a filled button at the top of the sidebar. It opens the add
// dialog rather than a page.
const navItems = linkOptions([
  {
    to: '/',
    activeOptions: { exact: true },
    label: m.nav_home,
    icon: HouseIcon,
  },
  { to: '/library', label: m.nav_library, icon: LibraryBigIcon },
  { to: '/add', label: m.nav_add, icon: PlusIcon },
  { to: '/queue', label: m.nav_queue, icon: ListOrderedIcon },
  { to: '/settings', label: m.nav_settings, icon: SettingsIcon },
])

// Where the bottom bar floats and how it looks. It keeps clear of the
// screen edges, the notch and the home indicator. A screen with a bar of its
// own puts it here too. Safari 26 on iPhone cuts off fixed layers 0.75rem
// below it, at its own floating toolbar, so there the shadow stays within
// that. There a backdrop, which is part of the page (dialog.tsx), also
// draws under every fixed layer, so the bar fades out while one is up.
export const FLOATING_BAR =
  'fixed transition-[opacity,visibility] backdrop-up:invisible backdrop-up:opacity-0 right-[calc(0.75rem+env(safe-area-inset-right))] bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[calc(0.75rem+env(safe-area-inset-left))] z-10 mx-auto max-w-md rounded-full bg-sidebar text-sidebar-foreground shadow-[0_1px_3px_oklch(0.147_0.004_49.3/0.08),0_12px_32px_-8px_oklch(0.147_0.004_49.3/0.24)] ring-1 ring-sidebar-border supports-[-webkit-touch-callout:none]:[@media(display-mode:browser)]:shadow-[0_1px_3px_oklch(0.147_0.004_49.3/0.08),0_4px_12px_-4px_oklch(0.147_0.004_49.3/0.24)]'

// The element each screen scrolls in, for the router to restore and reset.
export const MAIN_SCROLL_AREA = '[data-scroll-restoration-id="main"]'

const HideMenu = createContext<(hidden: boolean) => void>(() => {})

// Takes the menu's place at the bottom of a phone's screen for as long as
// the calling screen shows: the editor puts its Discard and Save there.
export function useHideMenu() {
  const hide = use(HideMenu)
  useEffect(() => {
    hide(true)
    return () => hide(false)
  }, [hide])
}

// Read on the server too, so a collapsed sidebar doesn't flash open on load.
export const getSidebarOpen = createIsomorphicFn()
  .server(() => getCookie(SIDEBAR_COOKIE_NAME) !== 'false')
  .client(
    () => !document.cookie.split('; ').includes(`${SIDEBAR_COOKIE_NAME}=false`),
  )

export function AppShell({
  sidebarOpen,
  children,
}: {
  sidebarOpen: boolean
  children: React.ReactNode
}) {
  const [menuHidden, setMenuHidden] = useState(false)
  // The insets keep the menu clear of the iPhone notch and home indicator.
  return (
    <HideMenu value={setMenuHidden}>
      <AddRecipeProvider>
        <SidebarProvider
          defaultOpen={sidebarOpen}
          className="flex-col pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] scroll-inside:h-full scroll-inside:min-h-0 md:flex-row"
        >
          <AppSidebar />
          {/* Each screen scrolls here on wider screens, inside the inset,
              and in the installed app. In a phone's browser nothing holds
              its height, so it grows with the screen and the page scrolls
              instead (src/routes/__root.tsx). */}
          <SidebarInset className="scroll-inside:min-h-0 scroll-inside:overflow-hidden">
            <ScrollArea
              className="scroll-inside:min-h-0 scroll-inside:flex-1"
              viewportProps={{
                'data-scroll-restoration-id': 'main',
                // Scrolling stays inside only where it scrolls here. In a
                // phone's browser it has nothing to scroll, but Chrome and
                // Firefox would still keep a scroll from carrying on into
                // the page, so nothing would scroll.
                className: 'overscroll-auto scroll-inside:overscroll-contain',
              }}
            >
              {/* Room for the bottom bar on phones: its height, the gap
                  below it and some air above it. */}
              <div className="flex min-h-full flex-col pb-[calc(5rem+max(0.75rem,env(safe-area-inset-bottom)))] md:pb-0">
                {children}
              </div>
            </ScrollArea>
          </SidebarInset>
          {!menuHidden && <BottomNav />}
        </SidebarProvider>
      </AddRecipeProvider>
    </HideMenu>
  )
}

function AppSidebar() {
  const { isMobile } = useSidebar()
  const openAddRecipe = useOpenAddRecipe()
  const adding = useLocation({
    select: (location) => location.pathname === '/add',
  })

  // Phones get the bottom bar instead, not the sidebar as a sheet.
  if (isMobile) return null

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="data-[side=left]:left-[env(safe-area-inset-left)]"
    >
      <SidebarHeader className="flex-row items-center justify-between">
        <span className="truncate px-2 font-heading text-lg font-semibold group-data-[collapsible=icon]:hidden">
          {m.app_name()}
        </span>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label={m.nav_label()}>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={openAddRecipe}
                  isActive={adding}
                  tooltip={m.nav_add()}
                  className="rounded-full bg-primary font-medium text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground active:bg-primary/80 active:text-primary-foreground data-active:bg-primary data-active:text-primary-foreground"
                >
                  <PlusIcon />
                  <span>{m.nav_add()}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarMenu>
              {navItems
                .filter((link) => link.to !== '/add')
                .map(({ label, icon: Icon, ...link }) => (
                  <SidebarMenuItem key={link.to}>
                    <SidebarMenuButton
                      // The preset styles the current item by data-active.
                      render={
                        <Link {...link} activeProps={{ 'data-active': '' }} />
                      }
                      tooltip={label()}
                    >
                      <Icon />
                      <span>{label()}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroup>
        </nav>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

// The menu on phones, floating at the bottom.
function BottomNav() {
  const openAddRecipe = useOpenAddRecipe()
  return (
    <nav aria-label={m.nav_label()} className={cn(FLOATING_BAR, 'md:hidden')}>
      <ul className="grid grid-cols-5">
        {navItems.map(({ label, icon: Icon, ...link }) => (
          <li key={link.to}>
            {link.to === '/add' ? (
              <button
                type="button"
                onClick={openAddRecipe}
                className="group/add flex h-16 w-full items-center justify-center rounded-full outline-none"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/30 transition-transform group-focus-visible/add:ring-[3px] group-focus-visible/add:ring-ring/50 group-active/add:scale-95">
                  <Icon className="size-6" />
                </span>
                <span className="sr-only">{label()}</span>
              </button>
            ) : (
              <Link
                {...link}
                className="flex h-16 flex-col items-center justify-center gap-1 rounded-full text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[status=active]:font-medium data-[status=active]:text-primary"
              >
                <Icon className="size-6" />
                {label()}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
