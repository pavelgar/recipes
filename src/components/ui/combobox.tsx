import * as React from 'react'
import { Combobox as ComboboxPrimitive } from '@base-ui/react'
import { cn } from 'cn'
import { ChevronDownIcon, XIcon } from 'lucide-react'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
} from '@/components/ui/input-group'
import { CheckDot } from '@/components/ui/select'

const Combobox = ComboboxPrimitive.Root

function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />
}

function ComboboxTrigger({
  className,
  children,
  ...props
}: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn('group/combobox-trigger', className)}
      {...props}
    >
      {children}
      <ChevronDownIcon
        strokeWidth={2.75}
        className="pointer-events-none size-4.5! motion-safe:transition motion-safe:duration-150 group-data-popup-open/combobox-trigger:rotate-180"
      />
    </ComboboxPrimitive.Trigger>
  )
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      render={<InputGroupButton variant="ghost" size="icon-xs" />}
      className={cn(className)}
      {...props}
    >
      <XIcon strokeWidth={2.75} className="pointer-events-none" />
    </ComboboxPrimitive.Clear>
  )
}

// The well with a raised chevron bead at its end, or a clear key once
// something is chosen.
function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: ComboboxPrimitive.Input.Props & {
  showTrigger?: boolean
  showClear?: boolean
}) {
  return (
    <InputGroup className={cn('w-auto', className)}>
      <ComboboxPrimitive.Input
        data-slot="input-group-control"
        disabled={disabled}
        className="h-full w-full min-w-0 flex-1 rounded-2xl bg-transparent px-4.5 text-base text-(--sorbet-ink) outline-none placeholder:text-(--sorbet-ink-muted) disabled:cursor-not-allowed"
        {...props}
      />
      <InputGroupAddon align="inline-end">
        {showTrigger && (
          <InputGroupButton
            size="icon-xs"
            variant="outline"
            render={<ComboboxTrigger />}
            data-slot="input-group-button"
            className="group-has-data-[slot=combobox-clear]/input-group:hidden data-popup-open:bg-(--sorbet-butter) data-popup-open:text-(--sorbet-butter-ink) data-popup-open:shadow-dent"
            disabled={disabled}
          />
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
      </InputGroupAddon>
      {children}
    </InputGroup>
  )
}

function ComboboxContent({
  className,
  side = 'bottom',
  sideOffset = 8,
  align = 'start',
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    'side' | 'align' | 'sideOffset' | 'alignOffset' | 'anchor'
  >) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-chips={!!anchor}
          className={cn(
            'popup',
            'group/combobox-content relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-[max(var(--anchor-width),14rem)] overflow-hidden',
            'pop-in',
            className,
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        'no-scrollbar max-h-[min(22rem,var(--available-height))] scroll-py-1.5 overflow-y-auto overscroll-contain p-1.5 data-empty:p-0',
        className,
      )}
      {...props}
    />
  )
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn('option', 'pr-12', className)}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        render={<CheckDot className="absolute right-2.5" />}
      />
    </ComboboxPrimitive.Item>
  )
}

function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={cn(className)}
      {...props}
    />
  )
}

function ComboboxLabel({
  className,
  ...props
}: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn(
        'px-3 pt-2.5 pb-1 text-xs font-semibold text-(--sorbet-ink-muted)',
        'font-heading',
        className,
      )}
      {...props}
    />
  )
}

function ComboboxCollection({ ...props }: ComboboxPrimitive.Collection.Props) {
  return (
    <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />
  )
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        'hidden w-full justify-center px-4 py-5 text-center text-base font-semibold text-(--sorbet-ink-muted) group-data-empty/combobox-content:flex',
        'font-heading',
        className,
      )}
      {...props}
    />
  )
}

function ComboboxSeparator({
  className,
  ...props
}: ComboboxPrimitive.Separator.Props) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn(
        'mx-3 my-1.5 h-0.5 rounded-full bg-(--sorbet-surface-strong)',
        className,
      )}
      {...props}
    />
  )
}

// The well holding lemon pills, typed into after the last one.
function ComboboxChips({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
  ComboboxPrimitive.Chips.Props) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={cn(
        'field',
        'flex min-h-13 flex-wrap items-center gap-1.5 px-2 py-2',
        'focus-within:bg-(--sorbet-canvas) focus-within:shadow-well-focus',
        'has-aria-invalid:bg-(--sorbet-danger-soft) has-aria-invalid:shadow-well-invalid',
        'has-aria-invalid:focus-within:bg-(--sorbet-canvas) has-aria-invalid:focus-within:shadow-well-invalid-focus',
        className,
      )}
      {...props}
    />
  )
}

// A chosen value: a small lemon pillow, its remove key a dimple in it.
function ComboboxChip({
  className,
  children,
  showRemove = true,
  ...props
}: ComboboxPrimitive.Chip.Props & {
  showRemove?: boolean
}) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={cn(
        'flex h-9 w-fit items-center justify-center gap-1 rounded-full bg-(--sorbet-butter) pb-px pl-3.5 text-sm font-bold whitespace-nowrap text-(--sorbet-butter-ink) shadow-bead-butter has-disabled:pointer-events-none has-disabled:opacity-60 has-data-[slot=combobox-chip-remove]:pr-1 motion-safe:animate-pop',
        'font-heading',
        !showRemove && 'pr-3.5',
        className,
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          data-slot="combobox-chip-remove"
          className="relative flex size-7 shrink-0 items-center justify-center rounded-full text-(--sorbet-butter-ink) outline-none after:absolute after:-inset-1.5 hover:bg-(--sorbet-butter-ink)/12 hover:shadow-dent focus-visible:ring-4 focus-visible:ring-(color:--sorbet-focus-halo) focus-visible:ring-offset-2 focus-visible:ring-offset-(color:--sorbet-focus) motion-safe:active:scale-90"
        >
          <XIcon strokeWidth={3} className="pointer-events-none size-4" />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  )
}

function ComboboxChipsInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      className={cn(
        'h-9 min-w-24 flex-1 bg-transparent px-2 text-base text-(--sorbet-ink) outline-none placeholder:text-(--sorbet-ink-muted)',
        className,
      )}
      {...props}
    />
  )
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null)
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
}
