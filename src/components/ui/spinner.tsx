import { cn } from 'cn'

// A thick watermelon arc on a faint track. Inside a button it takes the
// button's text colour. It holds still under reduced motion.
function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <svg
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      className={cn(
        'size-5 shrink-0 text-(--sorbet-melon) in-data-[slot=button]:text-current motion-safe:animate-spin',
        className,
      )}
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
        strokeWidth="4"
        className="stroke-(--sorbet-surface-strong) in-data-[slot=button]:stroke-current/25"
      />
      <path
        d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5"
        stroke="currentColor"
        strokeWidth="4"
      />
    </svg>
  )
}

export { Spinner }
