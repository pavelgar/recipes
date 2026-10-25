import { Link } from '@tanstack/react-router'

import { buttonVariants } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { m } from '@/paraglide/messages'
import type { LucideIcon } from 'lucide-react'

// What shows where an address leads nowhere: what isn't there, and the way
// on to the library. The menu stays around it.
export function NotFound({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 pt-16 pb-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
          <EmptyTitle>
            <h1>{title}</h1>
          </EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link
            to="/library"
            className={buttonVariants({ variant: 'outline' })}
          >
            {m.not_found_library()}
          </Link>
        </EmptyContent>
      </Empty>
    </div>
  )
}
