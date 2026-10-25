import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRightIcon, CameraIcon, PencilLineIcon } from 'lucide-react'
import { createContext, use, useState } from 'react'

import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { importQuery } from '@/lib/import/import.functions'
import { findLink, siteOf } from '@/lib/import/link'
import { m } from '@/paraglide/messages'
import type { ImportError } from '@/lib/import/types'

const OpenAddRecipe = createContext<() => void>(() => {})

// Keeps the add dialog for the whole app, so the menu's Add button opens it
// over whatever page is showing.
export function AddRecipeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <OpenAddRecipe value={() => setOpen(true)}>
      {children}
      <AddRecipe open={open} onOpenChange={setOpen} />
    </OpenAddRecipe>
  )
}

export function useOpenAddRecipe() {
  return use(OpenAddRecipe)
}

// A dialog on every screen. A drawer from the bottom of a phone's screen
// reaches Safari's floating toolbar, which takes on its colour, so the
// backdrop doesn't reach under the toolbar.
function AddRecipe({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const close = () => onOpenChange(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.add_title()}</DialogTitle>
        </DialogHeader>
        <AddForm onDone={close} />
      </DialogContent>
    </Dialog>
  )
}

// Photo import needs an AI provider, which the app can't be set up with
// yet. Until then the option shows, disabled.
const PHOTO_IMPORT = false

// The import starts on the arrow button or Enter, whether the link was
// pasted or typed. Text shared with a title before the link works too: the
// link is picked out of it. The dialog stays open while the page is read,
// so a failure can be told where the link was given.
function AddForm({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [notALink, setNotALink] = useState(false)
  const importing = useMutation({
    // The page as it is now, even if it was read before.
    mutationFn: (link: string) =>
      queryClient.fetchQuery({ ...importQuery(link), staleTime: 0 }),
  })

  function read(written: string) {
    const link = findLink(written)
    setNotALink(!link)
    if (!link) return
    setText(link)
    // Callbacks given to mutate() don't run once the dialog has closed: a
    // read that ends after that leads nowhere.
    importing.mutate(link, {
      onSuccess: (result) => {
        if (!result.ok) return
        onDone()
        void navigate({ to: '/add', search: { link } })
      },
    })
  }

  const reading = importing.isPending ? siteOf(importing.variables) : null
  const failed: ImportProblem | null = notALink
    ? { code: 'not-a-link' }
    : importing.isError
      ? { code: 'failed' }
      : importing.data?.ok === false
        ? importing.data.error
        : null

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        read(text)
      }}
      className="flex flex-col gap-6"
    >
      <Field data-invalid={failed ? true : undefined}>
        {/* The placeholder says what the field is for. */}
        <FieldLabel htmlFor="add-link" className="sr-only">
          {m.add_link_label()}
        </FieldLabel>
        {/* Taller than shadcn's default, so the round button fits inside
            the field with even space around it, and easy to tap. */}
        <InputGroup className="h-12">
          <InputGroupInput
            id="add-link"
            // Text, not a url field: addresses without https:// and text
            // shared with a link in it aren't URLs to the browser. The
            // keyboard is still the one for addresses.
            type="text"
            inputMode="url"
            enterKeyHint="go"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            placeholder={m.add_link_placeholder()}
            value={text}
            disabled={reading !== null}
            aria-invalid={failed ? true : undefined}
            onChange={(event) => {
              setText(event.target.value)
              setNotALink(false)
              importing.reset()
            }}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="submit"
              variant="default"
              size="icon-sm"
              aria-label={m.add_import()}
              disabled={reading !== null || text.trim() === ''}
            >
              <ArrowRightIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {reading !== null && (
          <FieldDescription role="status" className="flex items-center gap-2">
            <Spinner />
            {m.add_reading({ site: reading })}
          </FieldDescription>
        )}
        {failed && <FieldError>{importProblemMessage(failed)}</FieldError>}
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/add"
          onClick={onDone}
          className={buttonVariants({ variant: 'outline' })}
        >
          <PencilLineIcon data-icon="inline-start" />
          {m.add_manually()}
        </Link>
        <Button type="button" variant="outline" disabled={!PHOTO_IMPORT}>
          <CameraIcon data-icon="inline-start" />
          {m.add_scan()}
        </Button>
      </div>
    </form>
  )
}

// Why an import didn't work: what was given isn't a link, the server said
// why, or it couldn't be asked.
export type ImportProblem =
  ImportError | { code: 'not-a-link' } | { code: 'failed' }

export function importProblemMessage(problem: ImportProblem): string {
  switch (problem.code) {
    case 'not-a-link':
      return m.add_error_not_a_link()
    case 'private-address':
      return m.add_error_private_address({ site: problem.site })
    case 'unreachable':
      return m.add_error_unreachable({ site: problem.site })
    case 'http-error':
      // Gone, refused, or the site failing, which trying later may fix. The
      // status is read by its standard meaning: a refusal (403) isn't
      // worth trying again, even from a site that sometimes lets the next
      // request in.
      if (problem.status === 404 || problem.status === 410) {
        return m.add_error_not_found({ site: problem.site })
      }
      if ([401, 403, 451].includes(problem.status)) {
        return m.add_error_blocked({ site: problem.site })
      }
      return m.add_error_load_failed({ site: problem.site })
    case 'blocked':
      return m.add_error_blocked({ site: problem.site })
    case 'not-a-page':
      return m.add_error_not_a_page()
    case 'too-large':
      return m.add_error_too_large({ site: problem.site })
    case 'no-recipe':
      return m.add_error_no_recipe()
    case 'failed':
      return m.add_error_failed()
  }
}
