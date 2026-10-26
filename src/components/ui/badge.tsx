import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

// Small sorbet capsules, flat: only what you press is raised. Each fill
// carries its own dark ink.
const badgeVariants = cva(
  [
    'group/badge inline-flex h-7 w-fit shrink-0 items-center justify-center gap-1 rounded-full px-3 text-xs leading-none font-bold whitespace-nowrap has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&>svg]:pointer-events-none [&>svg]:size-3.5!',
    'font-heading',
    'focus-ring',
  ],
  {
    variants: {
      variant: {
        default:
          'bg-(--sorbet-melon) text-(--sorbet-melon-ink) [a]:hover:bg-(--sorbet-melon-hi)',
        secondary:
          'bg-(--sorbet-butter) text-(--sorbet-butter-ink) [a]:hover:bg-(--sorbet-butter-hi)',
        destructive: 'bg-(--sorbet-danger-soft) text-(--sorbet-danger)',
        outline:
          'bg-transparent text-(--sorbet-ink) shadow-rim [a]:hover:bg-(--sorbet-surface)',
        ghost:
          'bg-(--sorbet-surface) text-(--sorbet-ink) [a]:hover:bg-(--sorbet-surface-strong)',
        link: 'px-0.5 text-(--sorbet-ink) underline decoration-(--sorbet-melon) decoration-2 underline-offset-4 hover:decoration-(--sorbet-melon-deep)',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  })
}

export { Badge, badgeVariants }
