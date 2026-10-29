import { tidiedAlready } from '@/core/editor/tidy'
import { MAX_TEXT } from '@/core/ai/limits'
import { ParaglideMessage } from '@inlang/paraglide-js-react'
import { useForm, useStore } from '@tanstack/react-form'
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  BookOpenIcon,
  CheckIcon,
  ImagePlusIcon,
  ImageUpIcon,
  Trash2Icon,
  Undo2Icon,
  UsersIcon,
  WandSparklesIcon,
} from 'lucide-react'
import { cn } from 'cn'
import { useEffect, useRef, useState } from 'react'

import { FLOATING_BAR, useHideMenu } from '@/components/app-shell'
import { ChoiceSelect } from '@/components/choice-select'
import { COVER_FRAME, CoverPhoto } from '@/components/cover-photo'
import { MarkedTextarea } from '@/components/editor/marked-textarea'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { LANGUAGES, MEASURING_SYSTEMS } from '@/core/recipe/choices'
import { createRecipe } from '@/server/recipes.functions'
import { aiStatusQuery, tidySteps } from '@/server/ai/ai.functions'
import {
  namesLanguage,
  recipeLanguageName,
  SYSTEM_NAMES,
} from '@/i18n/choice-names'
import {
  addSearch,
  clearDraft,
  draftSchema,
  recipeFromDraft,
  saveDraft,
} from '@/components/editor/draft'
import { marksOf } from '@/core/editor/lines'
import { siteOf } from '@/core/import/link'
import { RECIPE_LANGUAGES, rulesFor, UNKNOWN_LANGUAGE } from '@/core/languages'
import { suggestLanguage } from '@/server/languages.functions'
import { guessMeasuringSystem } from '@/core/measuring-system'
import { scrollBehavior } from '@/components/motion'
import { MAX_PHOTO_BYTES } from '@/core/photo'
import { uploadPhoto } from '@/server/photos/photos.functions'
import { m } from '@/paraglide/messages'
import type { LucideIcon } from 'lucide-react'
import type { Draft, DraftOrigin } from '@/components/editor/draft'
import type { RecipeLanguage } from '@/core/languages'
import type { PhotoResult } from '@/core/photo'
import type { Language } from '@/core/quantities'

// What an empty list shows, in the recipe's language: part of a carrot
// cake recipe, written to show how a list is written and what the app
// recognises in it, section headings included. The steps follow
// https://www.kotikokki.net/reseptit/nayta/360/Juustop%C3%A4%C3%A4llysteinen%20porkkanakakku/
const EXAMPLES: Record<Language, { ingredients: string; steps: string }> = {
  fi: {
    ingredients:
      'Pohja:\n3 porkkanaa\n2 dl sokeria\n3½ dl vehnäjauhoja\n1 tl kanelia\nKuorrutus:\n200 g tuorejuustoa\n1 dl tomusokeria',
    steps:
      'Pohja:\nRaasta porkkanat hienoksi raasteeksi.\nPaista kakkuvuoassa alimmalla tasolla 190 asteessa noin 45 min.\nKuorrutus:\nLevitä kuorrutus jäähtyneen kakun päälle.',
  },
  en: {
    ingredients:
      "Cake:\n3 carrots\n1 cup sugar\n1 1/2 cups all-purpose flour\n1 teaspoon ground cinnamon\nFrosting:\n8 ounces cream cheese, softened\n1/2 cup confectioners' sugar",
    steps:
      'Cake:\nFinely grate the carrots.\nBake in a cake pan on the bottom rack at 375°F for about 45 minutes.\nFrosting:\nSpread the frosting over the cooled cake.',
  },
}

type TidyFeedback =
  | { kind: 'error'; message: string }
  | { kind: 'tidied'; before: string; after: string }

// The fields the recipe's language is told from.
const TEXT_FIELDS: ReadonlyArray<string> = ['title', 'ingredients', 'steps']

const TIMES = [
  ['prepMinutes', m.recipe_prep],
  ['cookMinutes', m.recipe_cook],
  ['totalMinutes', m.recipe_total],
] as const

// Saving waits for a photo still being uploaded, so it isn't left out.
const UPLOAD_PHOTO = ['upload-photo']

// The recipe editor, laid out like the recipe it writes: the name as its
// heading, and the lists as lists, each detail in view beside what it's
// about.
// `origin` says where the draft came from; it's kept in the browser under
// it until it's saved or discarded.
export function RecipeEditor({
  origin,
  initial,
}: {
  origin: DraftOrigin
  initial: Draft
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  useHideMenu()
  // Once saved or discarded, a change made before the editor goes mustn't
  // bring the draft back.
  const finished = useRef(false)
  const formElement = useRef<HTMLFormElement>(null)
  // The toast saying saving failed. It stays until closed, saving is tried
  // again, or the editor goes.
  const saveFailed = useRef<string>(undefined)
  useEffect(() => () => closeToast(saveFailed.current), [])

  // The language its text reads as, from the server, when the one chosen
  // doesn't fit it. Without the server there's none.
  const [suggestion, setSuggestion] = useState<RecipeLanguage | null>(null)
  const { mutate: askLanguage } = useMutation({
    mutationFn: (data: { text: string; current: RecipeLanguage }) =>
      suggestLanguage({ data }),
  })
  const asked = useRef<string>(undefined)
  function suggest({ title, ingredients, steps, language }: Draft) {
    const text = [title, ingredients, steps].join('\n').trim()
    const question = `${language}\n${text}`
    if (question === asked.current) return
    asked.current = question
    // Only the answer to the latest question is taken.
    askLanguage({ text, current: language }, { onSuccess: setSuggestion })
  }

  const form = useForm({
    defaultValues: initial,
    validators: { onSubmit: draftSchema },
    listeners: {
      // Every change is kept as it's made, so a reload, even the one when a
      // new version of the app takes over, loses nothing typed.
      onChange: ({ formApi, fieldApi }) => {
        if (!finished.current) saveDraft(origin, formApi.state.values)
        if (fieldApi.name === 'language') suggest(formApi.state.values)
      },
      // The language its text reads as is asked when the editor opens, when
      // the language changes and when a text field is left, rather than as
      // each letter is typed.
      onMount: ({ formApi }) => suggest(formApi.state.values),
      onBlur: ({ formApi, fieldApi }) => {
        if (TEXT_FIELDS.includes(fieldApi.name)) suggest(formApi.state.values)
      },
    },
    // Save is at the bottom of the screen and the name at the top, so the
    // first field with an error is brought into view, clear of the actions,
    // and focused.
    onSubmitInvalid: ({ formApi }) => {
      const invalid = Object.entries(formApi.state.fieldMeta)
        .filter(([, meta]) => meta?.errors.length)
        .map(([name]) => name)
      const first = Array.from(formElement.current?.elements ?? []).find(
        (element) => invalid.includes(element.id),
      )
      if (first instanceof HTMLElement) {
        first.scrollIntoView({ block: 'center', behavior: scrollBehavior() })
        first.focus({ preventScroll: true })
      }
    },
    onSubmit: async ({ value }) => {
      closeToast(saveFailed.current)
      try {
        const { id } = await createRecipe({ data: recipeFromDraft(value) })
        finished.current = true
        clearDraft(origin)
        await queryClient.invalidateQueries({ queryKey: ['recipes'] })
        // The recipe takes the editor's place, so Back doesn't open it again,
        // with the import it was read from, to save a second recipe.
        await navigate({
          to: '/recipes/$recipeId',
          params: { recipeId: id },
          replace: true,
        })
      } catch {
        // Not about any one field, so it shows at the top of the screen,
        // wherever the page is scrolled to.
        saveFailed.current = toast.add({
          type: 'error',
          title: m.editor_save_failed(),
          priority: 'high',
          timeout: 0,
        })
      }
    },
  })

  const uploading = useIsMutating({ mutationKey: UPLOAD_PHOTO }) > 0
  const values = useStore(form.store, (state) => state.values)
  const timesInvalid = useStore(form.store, (state) =>
    TIMES.some(([name]) => state.fieldMeta[name]?.errors.length),
  )
  // The rules of the recipe's language, if the app has them. Without them
  // nothing in its lines is recognised, and its measures don't matter.
  const rules = rulesFor(values.language)
  const opts = { language: rules, system: values.measuringSystem }
  // An imported recipe's source is the page it came from, shown in the note
  // under its name; a typed one's is whatever was typed in, a book and page,
  // as is one read from photos or pasted text.
  const link = origin.kind === 'page' ? origin.link : null
  const source = link
    ? { url: values.sourceUrl || link, site: siteOf(values.sourceUrl || link) }
    : null
  // The languages the app reads come first; then every other the browser
  // can name, the recipe's own among them in its place. Unknown, which
  // isn't a language, comes first while it's chosen. A browser can give two
  // codes one name (Chromium calls Twi "Akan"), so each name is offered
  // once: the recipe's own, or the first code's.
  const pinned =
    values.language === UNKNOWN_LANGUAGE
      ? [UNKNOWN_LANGUAGE, ...LANGUAGES]
      : LANGUAGES
  const languageChoices = [
    ...new Set([
      values.language,
      ...LANGUAGES,
      ...RECIPE_LANGUAGES.filter(namesLanguage),
    ]),
  ]
    .map((value) => ({ value, label: recipeLanguageName(value) }))
    .filter(
      (choice, i, all) =>
        all.findIndex((other) => other.label === choice.label) === i,
    )
  // The language the text reads as, offered under the language when it
  // isn't the one chosen.
  const offered =
    suggestion !== null &&
    suggestion !== values.language &&
    namesLanguage(suggestion)
      ? suggestion
      : null
  const measuresChoices = MEASURING_SYSTEMS.map((value) => ({
    value,
    label: SYSTEM_NAMES[value](),
  }))
  const examples = rules ? EXAMPLES[rules] : null
  // Lines AI wrote differently from what it read, until they're changed.
  const reworded = new Set(values.reworded)
  const flagged = (line: string) => reworded.has(line.trim())
  const anyFlagged = (text: string) => text.split('\n').some(flagged)

  // Tidying the steps needs the AI model, and steps to tidy.
  const { data: ai } = useQuery(aiStatusQuery)
  const canTidy = ai?.available === true && values.steps.trim() !== ''
  const tidying = useMutation({
    mutationFn: (steps: string) => tidySteps({ data: { steps } }),
  })
  const [tidyFeedback, setTidyFeedback] = useState<TidyFeedback | null>(null)
  const hasTidied = tidyFeedback?.kind === 'tidied'

  function changeSteps(steps: string) {
    form.setFieldValue('steps', steps)
    if (!finished.current) saveDraft(origin, form.state.values)
  }

  // The same button becomes Undo after successful tidying.
  // Editing the steps clears it; a late answer cannot replace those edits.
  function tidy() {
    const before = form.getFieldValue('steps')
    setTidyFeedback(null)
    if (before.trim().length > MAX_TEXT) {
      setTidyFeedback({
        kind: 'error',
        message: m.ai_text_too_long({ count: MAX_TEXT }),
      })
      return
    }
    tidying.mutate(before, {
      onSuccess: (result) => {
        if (form.getFieldValue('steps') !== before) return
        if (!result.ok) {
          setTidyFeedback({
            kind: 'error',
            message:
              result.code === 'text-too-long'
                ? m.ai_text_too_long({ count: MAX_TEXT })
                : result.code === 'changed-words'
                  ? m.editor_tidy_rejected()
                  : m.editor_tidy_failed(),
          })
          return
        }
        if (result.steps === tidiedAlready(before)) {
          setTidyFeedback({ kind: 'tidied', before, after: before })
          return
        }
        changeSteps(result.steps)
        setTidyFeedback({ kind: 'tidied', before, after: result.steps })
      },
      onError: () => {
        if (form.getFieldValue('steps') !== before) return
        setTidyFeedback({ kind: 'error', message: m.editor_tidy_failed() })
      },
    })
  }

  function undoTidy() {
    if (tidyFeedback?.kind !== 'tidied') return
    if (form.getFieldValue('steps') !== tidyFeedback.after) return
    changeSteps(tidyFeedback.before)
    setTidyFeedback(null)
    formElement.current
      ?.querySelector<HTMLTextAreaElement>('#steps')
      ?.focus({ preventScroll: true })
  }

  // Nothing asks for confirmation; Undo brings the draft back.
  function discard() {
    const draft = form.state.values
    finished.current = true
    clearDraft(origin)
    const id = toast.add({
      title: m.editor_discarded(),
      actionProps: {
        children: m.editor_undo(),
        onClick: () => {
          toast.close(id)
          saveDraft(origin, draft)
          void navigate({ to: '/add', search: addSearch(origin) })
        },
      },
    })
    void navigate({ to: '/' })
  }

  return (
    <form
      ref={formElement}
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
      className="flex flex-1 flex-col gap-8"
    >
      <header className="flex flex-col gap-4">
        <form.Field name="photo">
          {(field) => <PhotoField field={field} />}
        </form.Field>

        <form.Field name="title">
          {(field) => (
            <Field data-invalid={!field.state.meta.isValid || undefined}>
              <FieldLabel htmlFor={field.name} className="sr-only">
                {m.editor_title()}
              </FieldLabel>
              {/* The name is the recipe's heading, typed in place: set like
                  one, in a field like the others, so it reads as editable.
                  It wraps rather than scrolls; Enter doesn't start a new
                  line. */}
              <Textarea
                id={field.name}
                rows={1}
                value={field.state.value}
                placeholder={m.editor_title_placeholder()}
                onChange={(event) =>
                  field.handleChange(event.target.value.replace(/\n/g, ' '))
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.preventDefault()
                }}
                onBlur={field.handleBlur}
                aria-invalid={!field.state.meta.isValid || undefined}
                className="min-h-0 py-2 font-heading text-3xl font-semibold md:text-3xl"
              />
              {/* For an import, where it's from: "Read from Soppa365. Check
                  it before saving.", the source's name linking to the
                  page. */}
              {source && (
                <FieldDescription>
                  <ParaglideMessage
                    message={m.editor_imported_from}
                    inputs={{ site: values.sourceName.trim() || source.site }}
                    markup={{
                      link: ({ children }) => (
                        <a href={source.url} target="_blank" rel="noreferrer">
                          {children}
                        </a>
                      ),
                    }}
                  />
                </FieldDescription>
              )}
              {/* Read by AI from photos or pasted text: "Read by AI from
                  your photos. Check it before saving." */}
              {origin.kind === 'photos' && (
                <FieldDescription>{m.editor_read_photos()}</FieldDescription>
              )}
              {origin.kind === 'text' && (
                <FieldDescription>{m.editor_read_text()}</FieldDescription>
              )}
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        {/* What holds for the whole recipe: for one typed in, where it's
            from, a book and page (an import's source is the note under its
            name); then the language it's written in and whose cups and
            spoons it measures in, side by side, since together they decide
            how its amounts read; then how long it takes. Each is labelled
            above its box. */}
        <div className="flex flex-col gap-3">
          {!link && (
            <form.Field name="sourceName">
              {(field) => (
                <IconField
                  field={field}
                  icon={BookOpenIcon}
                  label={m.recipe_source()}
                />
              )}
            </form.Field>
          )}
          <form.Field name="language">
            {(field) => {
              // Measures that followed the language, or for an import its
              // site, keep following them; ones someone picked stay.
              const choose = (next: RecipeLanguage) => {
                const site = source?.site ?? null
                if (
                  values.measuringSystem ===
                  guessMeasuringSystem(site, field.state.value)
                ) {
                  form.setFieldValue(
                    'measuringSystem',
                    guessMeasuringSystem(site, next),
                  )
                }
                field.handleChange(next)
              }
              return (
                <div className="flex flex-col gap-1.5">
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        {m.editor_recipe_language()}
                      </FieldLabel>
                      <ChoiceSelect
                        id={field.name}
                        value={field.state.value}
                        options={languageChoices}
                        pinned={pinned}
                        onValueChange={choose}
                      />
                    </Field>
                    <form.Field name="measuringSystem">
                      {(measures) => (
                        <Field>
                          <FieldLabel htmlFor={measures.name}>
                            {m.recipe_measures()}
                          </FieldLabel>
                          <ChoiceSelect
                            id={measures.name}
                            value={measures.state.value}
                            options={measuresChoices}
                            onValueChange={measures.handleChange}
                          />
                        </Field>
                      )}
                    </form.Field>
                  </div>
                  {/* Under them, a language the text reads as instead, a
                      tap away: "Written in Swedish? Switch to it". Otherwise
                      a language to choose, or one whose amounts the app
                      doesn't read. */}
                  {offered ? (
                    <FieldDescription>
                      <ParaglideMessage
                        message={m.editor_language_suggested}
                        inputs={{ language: recipeLanguageName(offered) }}
                        markup={{
                          use: ({ children }) => (
                            <button
                              type="button"
                              onClick={() => choose(offered)}
                              className="underline underline-offset-4 hover:text-primary"
                            >
                              {children}
                            </button>
                          ),
                        }}
                      />
                    </FieldDescription>
                  ) : field.state.value === UNKNOWN_LANGUAGE ? (
                    <FieldDescription>
                      {m.editor_language_unknown()}
                    </FieldDescription>
                  ) : (
                    !rules && (
                      <FieldDescription>
                        {m.editor_language_unread()}
                      </FieldDescription>
                    )
                  )}
                </div>
              )
            }}
          </form.Field>
          <div className="grid grid-cols-3 gap-3">
            {TIMES.map(([name, label]) => (
              <form.Field key={name} name={name}>
                {(time) => <MinutesField field={time} label={label()} />}
              </form.Field>
            ))}
          </div>
          {timesInvalid && (
            <FieldError>{m.editor_minutes_invalid()}</FieldError>
          )}
        </div>
      </header>

      <form.Field name="ingredients">
        {(field) => (
          <section className="flex flex-col gap-3">
            {/* Beside the heading, how much the amounts make, in view where
                they're read, in the half of the width the heading leaves. */}
            <div className="grid grid-cols-2 items-center gap-3">
              <h2 className="font-heading text-xl font-semibold">
                <label htmlFor={field.name}>{m.recipe_ingredients()}</label>
              </h2>
              <form.Field name="servings">
                {(servings) => (
                  <IconField
                    field={servings}
                    icon={UsersIcon}
                    label={m.recipe_servings()}
                  />
                )}
              </form.Field>
            </div>
            <MarkedTextarea
              id={field.name}
              list="bullets"
              value={field.state.value}
              placeholder={examples?.ingredients}
              marksOf={(line) => marksOf(line, 'ingredient', opts)}
              flagged={flagged}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
            {anyFlagged(field.state.value) && (
              <FieldDescription>{m.editor_reworded()}</FieldDescription>
            )}
          </section>
        )}
      </form.Field>

      <form.Field name="steps">
        {(field) => (
          <Field aria-labelledby="steps-heading">
            {/* Beside the heading, Tidy steps, where it's about them. */}
            <div className="flex min-h-9 items-center justify-between gap-3">
              <h2
                id="steps-heading"
                className="shrink-0 font-heading text-xl font-semibold"
              >
                <label htmlFor={field.name}>{m.recipe_steps()}</label>
              </h2>
              <div className="flex min-w-0 items-center justify-end gap-3">
                {tidyFeedback?.kind === 'error' && (
                  <FieldError
                    id="steps-tidy-feedback"
                    className="min-w-0 break-words"
                  >
                    {tidyFeedback.message}
                  </FieldError>
                )}
                {canTidy && (
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={
                      hasTidied ? m.editor_undo() : m.editor_tidy_label()
                    }
                    disabled={tidying.isPending}
                    onClick={hasTidied ? undoTidy : tidy}
                  >
                    {tidying.isPending ? (
                      <Spinner data-icon="inline-start" />
                    ) : hasTidied ? (
                      <Undo2Icon data-icon="inline-start" />
                    ) : (
                      <WandSparklesIcon data-icon="inline-start" />
                    )}
                    {hasTidied ? m.editor_undo() : m.editor_tidy()}
                  </Button>
                )}
              </div>
            </div>
            <span role="status" className="sr-only">
              {hasTidied
                ? tidyFeedback.before === tidyFeedback.after
                  ? m.editor_tidy_unchanged()
                  : m.editor_tidied()
                : null}
            </span>
            <MarkedTextarea
              id={field.name}
              list="numbers"
              value={field.state.value}
              placeholder={examples?.steps}
              marksOf={(line) => marksOf(line, 'step', opts)}
              flagged={flagged}
              aria-describedby={
                tidyFeedback?.kind === 'error'
                  ? 'steps-tidy-feedback'
                  : undefined
              }
              onChange={(event) => {
                setTidyFeedback(null)
                field.handleChange(event.target.value)
              }}
              onBlur={field.handleBlur}
            />
            {anyFlagged(field.state.value) && (
              <FieldDescription>{m.editor_reworded()}</FieldDescription>
            )}
          </Field>
        )}
      </form.Field>

      {/* Discard and Save where the thumb is, Save taking all the room
          Discard leaves. On phones they take the bottom bar's place, the
          menu stepping aside while the editor shows. On wider screens they
          float at the bottom of the window, below a short recipe too, as
          far from its edge as when they sit at the end of the page. */}
      <div
        className={cn(
          FLOATING_BAR,
          'flex items-center gap-2 p-3 md:sticky md:inset-x-auto md:bottom-6 md:mt-auto md:w-full md:max-w-sm md:self-center',
        )}
      >
        <Button type="button" variant="outline" size="lg" onClick={discard}>
          <Trash2Icon data-icon="inline-start" />
          {m.editor_discard()}
        </Button>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(saving) => (
            <Button
              type="submit"
              size="lg"
              disabled={saving || uploading}
              className="flex-1"
            >
              {saving ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              {m.editor_save()}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}

// The cover photo, above the name as on the recipe: chosen from the
// device, or taken with its camera on a phone. Without one, its frame
// stays, empty like the other fields, and tapping it adds one. Removing it
// asks nothing and can be undone.
function PhotoField({ field }: { field: TextField }) {
  const input = useRef<HTMLInputElement>(null)
  // The toast that undoes removing it, which goes when the editor does or
  // another photo takes its place.
  const removed = useRef<string>(undefined)
  useEffect(() => () => closeToast(removed.current), [])
  const upload = useMutation({
    mutationKey: UPLOAD_PHOTO,
    mutationFn: (file: File) => {
      const data = new FormData()
      data.set('photo', file)
      return uploadPhoto({ data })
    },
  })

  function choose(file: File) {
    // The server would refuse it too, but only once it was sent.
    if (file.size > MAX_PHOTO_BYTES) {
      toast.add({ type: 'error', title: m.editor_photo_too_large() })
      return
    }
    upload.mutate(file, {
      onSuccess: (result) => {
        if (!result.ok) {
          toast.add({ type: 'error', title: PHOTO_ERRORS[result.error]() })
          return
        }
        closeToast(removed.current)
        field.handleChange(result.photo)
      },
      onError: () =>
        toast.add({ type: 'error', title: m.editor_photo_failed() }),
    })
  }

  function remove() {
    const photo = field.state.value
    field.handleChange('')
    removed.current = toast.add({
      title: m.editor_photo_removed(),
      actionProps: {
        children: m.editor_undo(),
        onClick: () => {
          closeToast(removed.current)
          field.handleChange(photo)
        },
      },
    })
  }

  const busy = upload.isPending
  const pick = () => input.current?.click()
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          // The same file can be chosen again.
          event.target.value = ''
          if (file) choose(file)
        }}
      />
      {field.state.value ? (
        <CoverPhoto id={field.state.value}>
          <div className="absolute right-2 bottom-2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={pick}
            >
              {busy ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <ImageUpIcon data-icon="inline-start" />
              )}
              {m.editor_photo_change()}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={remove}
            >
              <Trash2Icon data-icon="inline-start" />
              {m.editor_photo_remove()}
            </Button>
          </div>
        </CoverPhoto>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={pick}
          className={cn(
            COVER_FRAME,
            'flex flex-col items-center justify-center gap-2 border border-input bg-input/30 text-sm text-muted-foreground transition-colors outline-none hover:bg-input/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none',
          )}
        >
          {busy ? (
            <Spinner className="size-6" />
          ) : (
            <ImagePlusIcon className="size-6" />
          )}
          {m.editor_photo_add()}
        </button>
      )}
    </>
  )
}

const PHOTO_ERRORS: Record<
  Extract<PhotoResult, { ok: false }>['error'],
  () => string
> = {
  unreadable: m.editor_photo_unreadable,
  'too-large': m.editor_photo_too_large,
}

type TextField = {
  name: string
  state: { value: string; meta: { isValid: boolean } }
  handleChange: (value: string) => void
  handleBlur: () => void
}

// A field without a visible label: its icon and placeholder say what it
// is, and the label is for screen readers.
function IconField({
  field,
  icon: Icon,
  label,
}: {
  field: TextField
  icon: LucideIcon
  label: string
}) {
  const invalid = !field.state.meta.isValid || undefined
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={field.name} className="sr-only">
        {label}
      </FieldLabel>
      <InputGroup>
        <InputGroupAddon>
          <Icon />
        </InputGroupAddon>
        <InputGroupInput
          id={field.name}
          placeholder={label}
          value={field.state.value}
          onChange={(event) => field.handleChange(event.target.value)}
          onBlur={field.handleBlur}
          aria-invalid={invalid}
        />
      </InputGroup>
    </Field>
  )
}

// A time in minutes, labelled above its box, where the name has the width
// the box can't spare: three to a row on a phone, Finnish names are too
// long to sit beside a number. The number sits beside its unit.
function MinutesField({ field, label }: { field: TextField; label: string }) {
  const invalid = !field.state.meta.isValid || undefined
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          id={field.name}
          inputMode="numeric"
          placeholder="0"
          value={field.state.value}
          onChange={(event) => field.handleChange(event.target.value)}
          onBlur={field.handleBlur}
          aria-invalid={invalid}
          className="text-right"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupText>{m.editor_minutes_unit()}</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}

// Closing no toast at all would close every toast.
function closeToast(id: string | undefined) {
  if (id !== undefined) toast.close(id)
}
