import * as React from 'react'
import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { cn } from 'cn'
import { ChevronRightIcon } from 'lucide-react'

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

// A canvas panel floating on a tinted shadow, 48px Gabarito items, a
// lemon pillow under the pointer or keyboard.
function DropdownMenuContent({
  align = 'start',
  alignOffset = 0,
  side = 'bottom',
  sideOffset = 8,
  className,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    'align' | 'alignOffset' | 'side' | 'sideOffset'
  >) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            'popup',
            'z-50 max-h-(--available-height) w-(--anchor-width) min-w-52 overflow-x-hidden overflow-y-auto p-1.5',
            'pop-in',
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        'px-3 pt-2.5 pb-1 text-xs font-semibold text-(--sorbet-ink-muted) data-inset:pl-11',
        'font-heading',
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean
  variant?: 'default' | 'destructive'
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        'option',
        'group/dropdown-menu-item data-inset:pl-11',
        'data-[variant=destructive]:text-(--sorbet-danger) data-[variant=destructive]:data-highlighted:bg-(--sorbet-danger-soft) data-[variant=destructive]:data-highlighted:text-(--sorbet-danger)',
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        'option',
        'data-inset:pl-11 data-popup-open:bg-(--sorbet-butter) data-popup-open:text-(--sorbet-butter-ink) data-popup-open:[--sorbet-ink-muted:var(--sorbet-butter-ink)]',
        className,
      )}
      {...props}
    >
      {children}
      <span className="ml-auto flex size-7 items-center justify-center rounded-full bg-(--sorbet-surface) text-(--sorbet-ink) in-data-highlighted:bg-(--sorbet-butter-ink)/10 in-data-popup-open:bg-(--sorbet-butter-ink)/10 in-data-popup-open:text-(--sorbet-butter-ink)">
        <ChevronRightIcon strokeWidth={2.75} className="size-4.5!" />
      </span>
    </MenuPrimitive.SubmenuTrigger>
  )
}

function DropdownMenuSubContent({
  align = 'start',
  alignOffset = -8,
  side = 'right',
  sideOffset = 6,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      className={cn('w-auto min-w-44', className)}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  )
}

// Checkbox and radio items show a small dimple at the end; chosen, a
// watermelon bead with its check springs up out of it.
function Mark({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute right-2.5 flex size-7 items-center justify-center rounded-full bg-(--sorbet-well) shadow-well-small"
    >
      {children}
    </span>
  )
}

function Tick() {
  return (
    <span className="flex size-7 items-center justify-center rounded-full bg-(--sorbet-melon) text-(--sorbet-melon-ink) shadow-bead-melon motion-safe:animate-pop">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4!"
      >
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      className={cn('option', 'pr-12 data-inset:pl-11', className)}
      checked={checked}
      {...props}
    >
      <Mark>
        <MenuPrimitive.CheckboxItemIndicator
          data-slot="dropdown-menu-checkbox-item-indicator"
          render={<Tick />}
        />
      </Mark>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return (
    <MenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={cn('option', 'pr-12 data-inset:pl-11', className)}
      {...props}
    >
      <Mark>
        <MenuPrimitive.RadioItemIndicator
          data-slot="dropdown-menu-radio-item-indicator"
          render={<Tick />}
        />
      </Mark>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn(
        'mx-3 my-1.5 h-0.5 rounded-full bg-(--sorbet-surface-strong)',
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        'ml-auto flex h-6 min-w-6 items-center justify-center rounded-md bg-(--sorbet-well) px-1.5 text-xs font-bold text-(--sorbet-ink-muted) shadow-key',
        'font-heading',
        className,
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
