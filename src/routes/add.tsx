import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
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

// The editor: a recipe typed in, or one read from ?link= to check before
// saving. An unsaved draft of either comes back from the browser.
export const Route = createFileRoute('/add')({
  // A ?link= that isn't a web page's address is left out, so the page
  // doesn't ask the server to read it.
  validateSearch: z.object({ link: linkSchema.optional().catch(undefined) }),
  component: AddPage,
})

function AddPage() {
  const { link } = Route.useSearch()
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      {link ? <Imported key={link} link={link} /> : <Typed />}
    </main>
  )
}

function Typed() {
  const [initial] = useState(() => loadDraft(null) ?? emptyDraft(getLocale()))
  return <RecipeEditor link={null} initial={initial} />
}

// Arriving from the add drawer, the import is already read. After a reload,
// the draft comes back instead, or the page is read again.
function Imported({ link }: { link: string }) {
  const [draft] = useState(() => loadDraft(link))
  const { data, isPending } = useQuery({
    ...importQuery(link),
    enabled: draft === null,
  })

  if (draft) return <RecipeEditor link={link} initial={draft} />
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
  return <RecipeEditor link={link} initial={draftFromImport(data.recipe)} />
}
