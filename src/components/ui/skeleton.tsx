import { cn } from 'cn'

// A placeholder in the surface tint, gently pulsing; still under reduced
// motion.
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'rounded-[12px] bg-(--sorbet-surface-strong) motion-safe:animate-pulse',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
