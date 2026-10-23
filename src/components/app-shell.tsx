import { Link, linkOptions } from '@tanstack/react-router'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import {
  HouseIcon,
  LibraryBigIcon,
  ListOrderedIcon,
  PlusIcon,
  SettingsIcon,
} from 'lucide-react'

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
// bar, and a filled button at the top of the sidebar.
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
  // The insets keep the menu clear of the iPhone notch and home indicator.
  return (
    <SidebarProvider
      defaultOpen={sidebarOpen}
      className="flex-col pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] md:flex-row"
    >
      <AppSidebar />
      {/* Room for the bottom bar on phones: its height, the gap below it and
          some air above it. */}
      <SidebarInset className="pb-[calc(5rem+max(0.75rem,env(safe-area-inset-bottom)))] md:pb-0">
        {children}
      </SidebarInset>
      <BottomNav />
    </SidebarProvider>
  )
}

function AppSidebar() {
  const { isMobile } = useSidebar()

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
                  render={
                    <Link to="/add" activeProps={{ 'data-active': '' }} />
                  }
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

// Fixed, not sticky: when iOS bounces past the end of the page, a sticky bar
// rides up with it. It floats clear of the screen edges, the notch and the
// home indicator.
function BottomNav() {
  return (
    <nav
      aria-label={m.nav_label()}
      className="fixed right-[calc(0.75rem+env(safe-area-inset-right))] bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[calc(0.75rem+env(safe-area-inset-left))] z-10 mx-auto max-w-md rounded-full bg-sidebar text-sidebar-foreground shadow-[0_1px_3px_oklch(0.147_0.004_49.3/0.08),0_12px_32px_-8px_oklch(0.147_0.004_49.3/0.24)] ring-1 ring-sidebar-border md:hidden"
    >
      <ul className="grid grid-cols-5">
        {navItems.map(({ label, icon: Icon, ...link }) => (
          <li key={link.to}>
            {link.to === '/add' ? (
              <Link
                {...link}
                className="group/add flex h-16 items-center justify-center rounded-full outline-none"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/30 transition-transform group-focus-visible/add:ring-[3px] group-focus-visible/add:ring-ring/50 group-active/add:scale-95">
                  <Icon className="size-6" />
                </span>
                <span className="sr-only">{label()}</span>
              </Link>
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
