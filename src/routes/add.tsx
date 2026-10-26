import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'

import { importProblemMessage } from '@/components/add-recipe'
import { RecipeEditor } from '@/components/recipe-editor'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { buttonVariants } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { draftFromImport, emptyDraft, loadDraft } from '@/lib/editor/draft'
import { importQuery } from '@/lib/import/import.functions'
import { linkSchema, siteOf } from '@/lib/import/link'
import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'

// The editor: a recipe typed in, one read from ?link= to check before
// saving, or one AI read from photos or pasted text (?from=photos,
// ?from=text). An unsaved draft of any comes back from the browser.
export const Route = createFileRoute('/add')({
  // A ?link= that isn't a web page's address is left out, so the page
  // doesn't ask the server to read it.
  validateSearch: z.object({
    link: linkSchema.optional().catch(undefined),
    from: z.enum(['photos', 'text']).optional().catch(undefined),
  }),
  component: AddPage,
})

function AddPage() {
  const { link, from } = Route.useSearch()
  // As tall as the window, so the editor's actions can sit at its bottom.
  // Generous room above the name, clear of the notch in the installed app.
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-[calc(4rem+env(safe-area-inset-top))] pb-6">
      {link ? (
        <Imported key={link} link={link} />
      ) : from ? (
        <ReadByAi key={from} from={from} />
      ) : (
        <Typed />
      )}
    </main>
  )
}

function Typed() {
  const origin = { kind: 'typed' } as const
  const [initial] = useState(() => loadDraft(origin) ?? emptyDraft(getLocale()))
  return <RecipeEditor origin={origin} initial={initial} />
}

// The add dialog keeps what AI read as the draft before it comes here. The
// photos and text aren't kept, so without the draft, saved or discarded,
// there's nothing to check, and the page is the empty editor's.
function ReadByAi({ from }: { from: 'photos' | 'text' }) {
  const [origin] = useState(() => ({ kind: from }))
  const [draft] = useState(() => loadDraft(origin))
  if (!draft) return <Navigate to="/add" replace />
  return <RecipeEditor origin={origin} initial={draft} />
}

// Arriving from the add dialog, the import is already read. After a reload,
// the draft comes back instead, or the page is read again.
function Imported({ link }: { link: string }) {
  const [origin] = useState(() => ({ kind: 'page', link }) as const)
  const [draft] = useState(() => loadDraft(origin))
  const { data, isPending } = useQuery({
    ...importQuery(link),
    enabled: draft === null,
  })

  if (draft) return <RecipeEditor origin={origin} initial={draft} />
  if (isPending) {
    return (
      <p
        role="status"
        className="flex items-center gap-2 text-muted-foreground"
      >
        <Spinner />
        {m.add_reading({ site: siteOf(link) })}
      </p>
    )
  }
  if (!data?.ok) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Alert variant="destructive">
          <AlertDescription>
            {importProblemMessage(data ? data.error : { code: 'failed' })}
          </AlertDescription>
        </Alert>
        <Link to="/add" className={buttonVariants({ variant: 'outline' })}>
          {m.add_manually()}
        </Link>
      </div>
    )
  }
  return <RecipeEditor origin={origin} initial={draftFromImport(data.recipe)} />
}
