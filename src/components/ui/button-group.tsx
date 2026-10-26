import * as React from 'react'
import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

import { ButtonGroupContext } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

// Pillows packed side by side: each keeps its own shading and squashes on
// its own, with a narrow gap and tight inner corners between them.
const buttonGroupVariants = cva(
  'flex w-fit items-stretch gap-1 has-[>[data-slot=button-group]]:gap-2.5 [&>input]:flex-1',
  {
    variants: {
      orientation: {
        horizontal: 'flex-row',
        vertical: 'flex-col',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
    },
  },
)

function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof buttonGroupVariants>) {
  const group = React.useMemo(
    () => ({ orientation: orientation ?? 'horizontal' }),
    [orientation],
  )
  return (
    <ButtonGroupContext value={group}>
      <div
        role="group"
        data-slot="button-group"
        data-orientation={group.orientation}
        className={cn(buttonGroupVariants({ orientation }), className)}
        {...props}
      />
    </ButtonGroupContext>
  )
}

// A value between the pillows sits sunk in a well: read, not pressed.
function ButtonGroupText({
  className,
  render,
  ...props
}: useRender.ComponentProps<'div'>) {
  const group = React.useContext(ButtonGroupContext)
  const vertical = group?.orientation === 'vertical'
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: cn(
          "flex min-h-11 items-center gap-2 bg-(--sorbet-well) px-4 text-base font-bold text-(--sorbet-ink) shadow-shade [&_svg]:pointer-events-none [&_svg]:text-(--sorbet-ink-muted) [&_svg:not([class*='size-'])]:size-5",
          'font-heading',
          'squircle',
          group
            ? vertical
              ? 'rounded-xl first:rounded-t-3xl last:rounded-b-3xl'
              : 'rounded-xl first:rounded-l-3xl last:rounded-r-3xl'
            : 'rounded-2xl',
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'button-group-text',
    },
  })
}

// An explicit divider: a short rounded notch in the gap.
function ButtonGroupSeparator({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
        'mx-0.5 self-center rounded-full data-vertical:self-center data-horizontal:self-center bg-(--sorbet-rim)/45 data-horizontal:my-0.5 data-horizontal:h-0.75 data-horizontal:w-6 data-vertical:h-6 data-vertical:w-0.75',
        className,
      )}
      {...props}
    />
  )
}

export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
}
