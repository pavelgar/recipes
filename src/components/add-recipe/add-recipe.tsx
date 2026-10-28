import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MAX_TEXT } from '@/core/ai/limits'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CameraIcon,
  ClipboardPasteIcon,
  PencilLineIcon,
  WandSparklesIcon,
} from 'lucide-react'
import { cn } from 'cn'
import { createContext, use, useRef, useState } from 'react'

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
import { Textarea } from '@/components/ui/textarea'
import {
  aiStatusQuery,
  readPageWithAi,
  readPastedText,
  readPhotos,
} from '@/server/ai/ai.functions'
import {
  addSearch,
  draftFromImport,
  saveDraft,
} from '@/components/editor/draft'
import { importQuery } from '@/server/import/import.functions'
import { findLink, siteOf } from '@/core/import/link'
import { MAX_PHOTOS, shrinkPhoto } from '@/components/add-recipe/photos'
import { m } from '@/paraglide/messages'
import type { DraftOrigin } from '@/components/editor/draft'
import type {
  AiReadError,
  AiReadResult,
  ImportError,
} from '@/core/import/types'

const OpenAddRecipe = createContext<() => void>(() => {})

// Keeps the add dialog for the whole app, so the menu's Add button opens it
// over whatever page is showing.
export function AddRecipeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  // Asked as the app starts, so the dialog opens knowing whether there's
  // an AI model to read photos and text with.
  const ai = useQuery(aiStatusQuery).data?.available ?? false
  return (
    <OpenAddRecipe value={() => setOpen(true)}>
      {children}
      <AddRecipe open={open} onOpenChange={setOpen} ai={ai} />
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
  ai,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ai: boolean
}) {
  const close = () => onOpenChange(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.add_title()}</DialogTitle>
        </DialogHeader>
        <AddForm ai={ai} onDone={close} />
      </DialogContent>
    </Dialog>
  )
}

// What AI is asked to read: a page without Recipe data, photos, or text
// pasted in.
type AiRead =
  | { from: 'page'; link: string }
  | { from: 'photos'; photos: ReadonlyArray<File> }
  | { from: 'text'; text: string }

// The dialog starts with the link field. Paste text swaps it for a text box
// for the recipe, and Back brings it back. Whatever AI reads is kept as the
// import's draft and opens in the editor. Callbacks given to mutate() don't
// run once the dialog has closed: a read that ends after that leads
// nowhere.
function AddForm({ ai, onDone }: { ai: boolean; onDone: () => void }) {
  const navigate = useNavigate()
  const [view, setView] = useState<'link' | 'text'>('link')
  const [pasted, setPasted] = useState('')
  const [stopping, setStopping] = useState(false)
  const request = useRef<AbortController | null>(null)
  const keepReading = useRef<HTMLButtonElement>(null)
  const reading = useMutation({
    mutationFn: async (read: AiRead) => {
      const controller = new AbortController()
      request.current = controller
      const result = await readWithAi(read, controller.signal)
      controller.signal.throwIfAborted()
      return result
    },
  })

  function readByAi(read: AiRead) {
    reading.mutate(read, {
      onSuccess: (result) => {
        if (!result.ok) return
        const origin: DraftOrigin =
          read.from === 'page'
            ? { kind: 'page', link: read.link }
            : { kind: read.from }
        saveDraft(
          origin,
          draftFromImport(result.recipe, { reworded: result.reworded }),
        )
        onDone()
        void navigate({
          to: '/add',
          search: addSearch(origin),
          // Plain HTTP too: no secure-context-only randomUUID dependency.
          state: { aiRead: `${Date.now()}-${Math.random()}` },
        })
      },
    })
  }

  function back() {
    reading.reset()
    setStopping(false)
    setView('link')
  }

  return (
    <>
      {view === 'link' ? (
        <LinkForm
          ai={ai}
          reading={reading}
          readByAi={readByAi}
          onDone={onDone}
          onPaste={() => {
            reading.reset()
            setView('text')
          }}
        />
      ) : (
        <TextForm
          text={pasted}
          onTextChange={(text) => {
            setPasted(text)
            reading.reset()
          }}
          reading={reading}
          readByAi={readByAi}
          onBack={() => (reading.isPending ? setStopping(true) : back())}
        />
      )}
      <AlertDialog open={stopping} onOpenChange={setStopping}>
        <AlertDialogContent initialFocus={keepReading}>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.add_stop_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.add_stop_description()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel ref={keepReading}>
              {m.add_keep_reading()}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                request.current?.abort()
                back()
              }}
            >
              {m.add_stop_reading()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

type Reading = UseMutationResult<AiReadResult | ClientProblem, Error, AiRead>

// Why reading photos failed before the server had them.
type ClientProblem = {
  ok: false
  error: { code: 'photo-unreadable' } | { code: 'too-many-photos' }
}

// Photos are shrunk in the browser before they're sent.
async function readWithAi(
  read: AiRead,
  signal: AbortSignal,
): Promise<AiReadResult | ClientProblem> {
  switch (read.from) {
    case 'page':
      return readPageWithAi({ data: { link: read.link }, signal })
    case 'text':
      if (read.text.trim().length > MAX_TEXT)
        return { ok: false, error: { code: 'text-too-long' } }
      return readPastedText({ data: { text: read.text }, signal })
    case 'photos': {
      if (read.photos.length > MAX_PHOTOS) {
        return { ok: false, error: { code: 'too-many-photos' } }
      }
      const photos: Array<Blob> = []
      try {
        for (const photo of read.photos) {
          signal.throwIfAborted()
          photos.push(await shrinkPhoto(photo))
        }
      } catch {
        return { ok: false, error: { code: 'photo-unreadable' } }
      }
      const form = new FormData()
      photos.forEach((photo, index) => {
        form.append('photo', photo, `photo-${index + 1}.jpg`)
      })
      signal.throwIfAborted()
      return readPhotos({ data: form, signal })
    }
  }
}

// What went wrong with an AI read of this kind, if one did.
function readProblem(reading: Reading, from: AiRead['from']) {
  if (reading.variables?.from !== from) return null
  if (reading.isError) return { code: 'failed' } as const
  return reading.data?.ok === false ? reading.data.error : null
}

// The import starts on the arrow button or Enter, whether the link was
// pasted or typed. Text shared with a title before the link works too: the
// link is picked out of it. The dialog stays open while the page is read,
// so a failure can be told where the link was given.
function LinkForm({
  ai,
  reading,
  readByAi,
  onDone,
  onPaste,
}: {
  ai: boolean
  reading: Reading
  readByAi: (read: AiRead) => void
  onDone: () => void
  onPaste: () => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const photoInput = useRef<HTMLInputElement>(null)
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
    reading.reset()
    if (!link) return
    setText(link)
    importing.mutate(link, {
      onSuccess: (result) => {
        if (!result.ok) return
        onDone()
        void navigate({ to: '/add', search: { link } })
      },
    })
  }

  // One read at a time: a page, a page with AI, or photos.
  const busy = importing.isPending || reading.isPending
  const readingPage =
    reading.isPending && reading.variables.from === 'page'
      ? siteOf(reading.variables.link)
      : null
  const importingPage = importing.isPending ? siteOf(importing.variables) : null
  const readingPhotos =
    reading.isPending && reading.variables.from === 'photos'
      ? reading.variables.photos.length
      : null

  const failed: AddProblem | null = notALink
    ? { code: 'not-a-link' }
    : (readProblem(reading, 'page') ??
      (importing.isError
        ? { code: 'failed' }
        : importing.data?.ok === false
          ? importing.data.error
          : null))
  // A page without Recipe data can still be read with AI, after a tap.
  const noRecipe =
    failed?.code === 'no-recipe' && ai ? (importing.variables ?? null) : null
  const photosFailed = readProblem(reading, 'photos')

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
            disabled={busy}
            aria-invalid={failed ? true : undefined}
            onChange={(event) => {
              setText(event.target.value)
              setNotALink(false)
              importing.reset()
              reading.reset()
            }}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="submit"
              variant="default"
              size="icon-sm"
              aria-label={m.add_import()}
              disabled={busy || text.trim() === ''}
            >
              <ArrowRightIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {(importingPage ?? readingPage) !== null && (
          <FieldDescription role="status" className="flex items-center gap-2">
            <Spinner />
            {importingPage !== null
              ? m.add_reading({ site: importingPage })
              : m.add_reading_with_ai({ site: readingPage ?? '' })}
          </FieldDescription>
        )}
        {noRecipe !== null ? (
          <div className="flex flex-col items-start gap-3">
            <FieldError>{m.add_error_no_recipe_data()}</FieldError>
            {/* Not in the field's error red: it's a way on, not the
                error. */}
            <Button
              type="button"
              variant="outline"
              className="text-foreground"
              onClick={() => {
                importing.reset()
                readByAi({ from: 'page', link: noRecipe })
              }}
            >
              <WandSparklesIcon data-icon="inline-start" />
              {m.add_read_with_ai()}
            </Button>
          </div>
        ) : (
          failed && <FieldError>{addProblemMessage(failed)}</FieldError>
        )}
      </Field>
      {/* Photos and text need the AI model; without one they show,
          disabled. */}
      <div className="flex flex-col gap-2">
        <Link
          to="/add"
          onClick={onDone}
          // Through cn, as Button does, so the outline's border wins over
          // the base's transparent one.
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          <PencilLineIcon data-icon="inline-start" />
          {m.add_manually()}
        </Link>
        <Button
          type="button"
          variant="outline"
          disabled={!ai || busy}
          onClick={() => photoInput.current?.click()}
        >
          {readingPhotos !== null ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <CameraIcon data-icon="inline-start" />
          )}
          {m.add_scan()}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!ai || busy}
          onClick={onPaste}
        >
          <ClipboardPasteIcon data-icon="inline-start" />
          {m.add_paste()}
        </Button>
        {/* Any image: a phone offers its camera and its photos, so a
            screenshot can be scanned too. Several are pages of one
            recipe, in the order chosen. */}
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            const photos = Array.from(event.target.files ?? [])
            // So choosing the same photos again reads them again.
            event.target.value = ''
            if (photos.length === 0) return
            setNotALink(false)
            importing.reset()
            readByAi({ from: 'photos', photos })
          }}
        />
        {readingPhotos !== null && (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Spinner />
            {readingPhotos === 1
              ? m.add_scan_reading()
              : m.add_scan_reading_many()}
          </p>
        )}
        {photosFailed && (
          <FieldError>{addProblemMessage(photosFailed)}</FieldError>
        )}
      </div>
    </form>
  )
}

// A recipe written out as text, such as one sent in a message, for AI to
// read.
function TextForm({
  text,
  onTextChange,
  reading,
  readByAi,
  onBack,
}: {
  text: string
  onTextChange: (text: string) => void
  reading: Reading
  readByAi: (read: AiRead) => void
  onBack: () => void
}) {
  const tooLong = text.trim().length > MAX_TEXT
  const failed = tooLong
    ? ({ code: 'text-too-long' } as const)
    : readProblem(reading, 'text')
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (!tooLong && text.trim() !== '') readByAi({ from: 'text', text })
      }}
      className="flex flex-col gap-6"
    >
      <Field data-invalid={failed ? true : undefined}>
        <FieldLabel htmlFor="add-text" className="sr-only">
          {m.add_text_label()}
        </FieldLabel>
        {/* Grows with what's pasted, up to half the window, then
            scrolls. */}
        <Textarea
          id="add-text"
          autoFocus
          rows={8}
          placeholder={m.add_text_placeholder()}
          value={text}
          disabled={reading.isPending}
          aria-invalid={failed ? true : undefined}
          onChange={(event) => onTextChange(event.target.value)}
          className="max-h-[50dvh] min-h-40"
        />
        {reading.isPending && (
          <FieldDescription role="status" className="flex items-center gap-2">
            <Spinner />
            {m.add_text_reading()}
          </FieldDescription>
        )}
        {failed && <FieldError>{addProblemMessage(failed)}</FieldError>}
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeftIcon data-icon="inline-start" />
          {m.add_back()}
        </Button>
        <Button
          type="submit"
          disabled={reading.isPending || tooLong || text.trim() === ''}
        >
          {m.add_text_read()}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </form>
  )
}

// Why an import didn't work: what was given isn't a link, the server said
// why, or it couldn't be asked.
export type ImportProblem =
  ImportError | { code: 'not-a-link' } | { code: 'failed' }

// Why adding a recipe didn't work, AI's reads included.
type AddProblem = ImportProblem | AiReadError | ClientProblem['error']

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

const NOTHING_READ = {
  page: m.add_error_nothing_on_page,
  photos: m.add_error_nothing_in_photos,
  text: m.add_error_nothing_in_text,
}

function addProblemMessage(problem: AddProblem): string {
  switch (problem.code) {
    case 'text-too-long':
      return m.ai_text_too_long({ count: MAX_TEXT })
    case 'ai-unavailable':
      return m.add_error_ai_unavailable()
    case 'ai-failed':
      return m.add_error_ai_failed()
    case 'photos-refused':
      return m.add_error_photos_refused()
    case 'nothing-read':
      return NOTHING_READ[problem.from]()
    case 'photo-unreadable':
      return m.add_error_photo_unreadable()
    case 'too-many-photos':
      return m.add_error_too_many_photos({ count: MAX_PHOTOS })
    default:
      return importProblemMessage(problem)
  }
}
