import * as React from 'react'
import { Select as SelectPrimitive } from '@base-ui/react/select'
import { cn } from 'cn'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

import { DISPLAY, FIELD, OPTION, POPUP, POP_IN } from '@/components/ui/classes'

const Select = SelectPrimitive.Root

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn('scroll-my-1.5', className)}
      {...props}
    />
  )
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn('flex min-w-0 flex-1 truncate text-left', className)}
      {...props}
    />
  )
}

// The well, its chevron on a small raised bead at the end: the one part
// that looks pressable. While open the field rises to the page's light and
// the bead latches down, lemon, its chevron flipped.
function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: 'sm' | 'default'
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        FIELD,
        'group/select-trigger flex w-fit cursor-default items-center justify-between gap-2 pr-2 pl-4.5 text-left whitespace-nowrap outline-none select-none data-[size=default]:h-13 data-[size=sm]:h-11 data-[size=sm]:pr-1.5 data-[size=sm]:text-[16px]',
        'data-placeholder:text-(--sorbet-ink-muted)',
        'not-data-disabled:hover:bg-(--sorbet-surface-strong)',
        'focus-visible:bg-(--sorbet-canvas) focus-visible:shadow-[inset_0_0_0_2.5px_var(--sorbet-focus),0_0_0_4px_var(--sorbet-focus-halo)] data-popup-open:bg-(--sorbet-canvas) data-popup-open:hover:bg-(--sorbet-canvas)',
        'aria-invalid:bg-(--sorbet-danger-soft) aria-invalid:shadow-[inset_0_0_0_2.5px_var(--sorbet-danger),inset_0_3px_5px_-1px_var(--sorbet-well-shade)] aria-invalid:focus-visible:shadow-[inset_0_0_0_2.5px_var(--sorbet-danger),0_0_0_4px_var(--sorbet-focus-halo)]',
        'data-disabled:cursor-not-allowed data-disabled:bg-transparent data-disabled:text-(--sorbet-ink-muted) data-disabled:shadow-none data-disabled:outline-2 data-disabled:-outline-offset-2 data-disabled:outline-(--sorbet-rim)/60 data-disabled:outline-dashed',
        "*:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon render={<ChevronBead />}>
        <ChevronDownIcon
          strokeWidth={2.75}
          className="size-[18px]! motion-safe:transition-[rotate] motion-safe:duration-200 group-data-popup-open/select-trigger:rotate-180"
        />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

// A small white bead with a chevron, raised out of a well.
function ChevronBead({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'pointer-events-none flex size-9 shrink-0 items-center justify-center rounded-full bg-(--sorbet-plain) text-(--sorbet-ink) shadow-[inset_0_0_0_1.5px_var(--sorbet-rim),inset_0_-3px_4px_-2px_var(--sorbet-rim),0_3px_5px_-2px_var(--sorbet-plain-glow)]',
        'group-data-[size=sm]/select-trigger:size-8 group-data-[size=sm]/native-select:size-8',
        'group-data-popup-open/select-trigger:bg-(--sorbet-butter) group-data-popup-open/select-trigger:text-(--sorbet-butter-ink) group-data-popup-open/select-trigger:shadow-[inset_0_2px_4px_-1px_var(--sorbet-butter-deep)]',
        'group-data-disabled/select-trigger:bg-transparent group-data-disabled/select-trigger:shadow-none group-has-[select:disabled]/native-select:bg-transparent group-has-[select:disabled]/native-select:text-(--sorbet-ink-muted) group-has-[select:disabled]/native-select:shadow-none',
        className,
      )}
      {...props}
    />
  )
}

function SelectContent({
  className,
  children,
  side = 'bottom',
  sideOffset = 6,
  align = 'center',
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    'align' | 'alignOffset' | 'side' | 'sideOffset' | 'alignItemWithTrigger'
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            POPUP,
            'relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-44 overflow-x-hidden overflow-y-auto p-1.5',
            POP_IN,
            'data-[align-trigger=true]:data-starting-style:scale-100',
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn(
        'px-3 pt-2.5 pb-1 text-[13px] font-semibold text-(--sorbet-ink-muted)',
        DISPLAY,
        className,
      )}
      {...props}
    />
  )
}

// The chosen option carries a check on a watermelon bead.
function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(OPTION, 'pr-12', className)}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex min-w-0 flex-1 gap-2">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={<CheckDot className="absolute right-2.5" />}
      />
    </SelectPrimitive.Item>
  )
}

// A check on a watermelon bead, springing in.
function CheckDot({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'pointer-events-none flex size-7 items-center justify-center rounded-full bg-(--sorbet-melon) text-(--sorbet-melon-ink) shadow-[inset_0_1.5px_1px_-0.5px_var(--sorbet-melon-hi),inset_0_-3px_4px_-2px_var(--sorbet-melon-deep),0_3px_6px_-3px_var(--sorbet-melon-glow)] motion-safe:animate-[sorbet-pop_320ms_cubic-bezier(0.3,1.4,0.5,1)_both]',
        className,
      )}
      {...props}
    >
      <svg
        aria-hidden
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

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        'pointer-events-none mx-3 my-1.5 h-0.5 rounded-full bg-(--sorbet-surface-strong)',
        className,
      )}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        'top-0 z-10 flex h-8 w-full cursor-default items-center justify-center rounded-[12px] bg-(--sorbet-surface) text-(--sorbet-ink)',
        className,
      )}
      {...props}
    >
      <ChevronUpIcon strokeWidth={2.75} className="size-[18px]" />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        'bottom-0 z-10 flex h-8 w-full cursor-default items-center justify-center rounded-[12px] bg-(--sorbet-surface) text-(--sorbet-ink)',
        className,
      )}
      {...props}
    >
      <ChevronDownIcon strokeWidth={2.75} className="size-[18px]" />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  CheckDot,
  ChevronBead,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
