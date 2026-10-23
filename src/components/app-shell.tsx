import { Link, linkOptions } from '@tanstack/react-router'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import {
  CirclePlusIcon,
  HouseIcon,
  LibraryBigIcon,
  ListOrderedIcon,
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
const navItems = linkOptions([
  {
    to: '/',
    activeOptions: { exact: true },
    label: m.nav_home,
    icon: HouseIcon,
  },
  { to: '/library', label: m.nav_library, icon: LibraryBigIcon },
  { to: '/add', label: m.nav_add, icon: CirclePlusIcon },
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
      {/* Room for the bottom bar on phones: its links, border and inset. */}
      <SidebarInset className="pb-[calc(4rem+1px+env(safe-area-inset-bottom))] md:pb-0">
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
              {navItems.map(({ label, icon: Icon, ...link }) => (
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
// rides up with it.
function BottomNav() {
  return (
    <nav
      aria-label={m.nav_label()}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-sidebar-border bg-sidebar pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] text-sidebar-foreground md:hidden"
    >
      <ul className="grid grid-cols-5">
        {navItems.map(({ label, icon: Icon, ...link }) => (
          <li key={link.to}>
            <Link
              {...link}
              className="flex h-16 flex-col items-center justify-center gap-1 text-xs text-muted-foreground data-[status=active]:font-medium data-[status=active]:text-sidebar-foreground"
            >
              <Icon className="size-6" />
              {label()}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
