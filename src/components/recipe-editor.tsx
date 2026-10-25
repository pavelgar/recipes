import { ParaglideMessage } from '@inlang/paraglide-js-react'
import { useForm, useStore } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { BookOpenIcon, CheckIcon, Trash2Icon, UsersIcon } from 'lucide-react'
import { cn } from 'cn'
import { useEffect, useRef } from 'react'

import { FLOATING_BAR, useHideMenu } from '@/components/app-shell'
import { ChoiceSelect } from '@/components/choice-select'
import { MarkedTextarea } from '@/components/marked-textarea'
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
import { LANGUAGES, MEASURING_SYSTEMS } from '@/db/choices'
import { createRecipe } from '@/db/recipes.functions'
import { LANGUAGE_NAMES, SYSTEM_CHOICES } from '@/lib/choice-names'
import {
  clearDraft,
  draftSchema,
  recipeFromDraft,
  saveDraft,
} from '@/lib/editor/draft'
import { marksOf } from '@/lib/editor/lines'
import { siteOf } from '@/lib/import/link'
import { guessMeasuringSystem } from '@/lib/measuring-system'
import { m } from '@/paraglide/messages'
import type { LucideIcon } from 'lucide-react'
import type { Draft } from '@/lib/editor/draft'
import type { Language } from '@/lib/quantities'

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

const TIMES = [
  ['prepMinutes', m.recipe_prep],
  ['cookMinutes', m.recipe_cook],
  ['totalMinutes', m.recipe_total],
] as const

// The recipe editor, laid out like the recipe it writes: the name as its
// heading, and the lists as lists, each detail in view beside what it's
// about.
// `link` names the import it came from; the draft is kept in the browser
// under it until it's saved or discarded.
export function RecipeEditor({
  link,
  initial,
}: {
  link: string | null
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

  const form = useForm({
    defaultValues: initial,
    validators: { onSubmit: draftSchema },
    listeners: {
      // Every change is kept as it's made, so a reload, even the one when a
      // new version of the app takes over, loses nothing typed.
      onChange: ({ formApi }) => {
        if (!finished.current) saveDraft(link, formApi.state.values)
      },
    },
    // Save is at the bottom of the screen and the name at the top, so the
    // first field with an error is brought into view, clear of the actions,
    // and focused.
    onSubmitInvalid: ({ formApi }) => {
      const invalid = Object.entries(formApi.state.fieldMeta)
        .filter(([, meta]) => meta.errors.length)
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
        clearDraft(link)
        await queryClient.invalidateQueries({ queryKey: ['recipes'] })
        await navigate({
          to: '/recipes/$recipeId',
          params: { recipeId: id },
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

  const values = useStore(form.store, (state) => state.values)
  const timesInvalid = useStore(form.store, (state) =>
    TIMES.some(([name]) => state.fieldMeta[name]?.errors.length),
  )
  const opts = { language: values.language, system: values.measuringSystem }
  // An imported recipe's source is the page it came from, shown in the note
  // under its name; a typed one's is whatever was typed in, a book and page.
  const source = link
    ? { url: values.sourceUrl || link, site: siteOf(values.sourceUrl || link) }
    : null
  const languageChoices = LANGUAGES.map((value) => ({
    value,
    label: LANGUAGE_NAMES[value](),
  }))
  const measuresChoices = MEASURING_SYSTEMS.map((value) => ({
    value,
    label: SYSTEM_CHOICES[value](),
  }))
  const examples = EXAMPLES[values.language]

  // Nothing asks for confirmation; Undo brings the draft back.
  function discard() {
    const draft = form.state.values
    finished.current = true
    clearDraft(link)
    const id = toast.add({
      title: m.editor_discarded(),
      actionProps: {
        children: m.editor_undo(),
        onClick: () => {
          toast.close(id)
          saveDraft(link, draft)
          void navigate({ to: '/add', search: link ? { link } : {} })
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
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        {/* What holds for the whole recipe: for one typed in, where it's
            from, a book and page (an import's source is the note under its
            name), and the language it's written in, labelled. */}
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
            {(field) => (
              <Field>
                {/* The dropdown as wide as the measures one under the
                    Ingredients heading, and lined up with it. */}
                <div className="grid grid-cols-2 items-center gap-3">
                  <FieldLabel htmlFor={field.name}>
                    {m.editor_recipe_language()}
                  </FieldLabel>
                  <div>
                    <ChoiceSelect
                      id={field.name}
                      value={field.state.value}
                      options={languageChoices}
                      onValueChange={(next) => {
                        // Measures that followed the language, or for an
                        // import its site, keep following them.
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
                      }}
                    />
                  </div>
                </div>
              </Field>
            )}
          </form.Field>
        </div>
      </header>

      <form.Field name="ingredients">
        {(field) => (
          <section className="flex flex-col gap-3">
            <h2 className="font-heading text-xl font-semibold">
              <label htmlFor={field.name}>{m.recipe_ingredients()}</label>
            </h2>
            {/* How much the amounts make, and whose cups and spoons they're
                in, in view where they're read. Each choice of measures
                names itself, so its label is for screen readers. */}
            <div className="grid grid-cols-2 gap-3">
              <form.Field name="servings">
                {(servings) => (
                  <IconField
                    field={servings}
                    icon={UsersIcon}
                    label={m.recipe_servings()}
                    placeholder={m.editor_servings_placeholder()}
                  />
                )}
              </form.Field>
              <form.Field name="measuringSystem">
                {(measures) => (
                  <Field>
                    <FieldLabel htmlFor={measures.name} className="sr-only">
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
            <MarkedTextarea
              id={field.name}
              list="bullets"
              value={field.state.value}
              placeholder={examples.ingredients}
              marksOf={(line) => marksOf(line, 'ingredient', opts)}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          </section>
        )}
      </form.Field>

      <form.Field name="steps">
        {(field) => (
          <section className="flex flex-col gap-3">
            <h2 className="font-heading text-xl font-semibold">
              <label htmlFor={field.name}>{m.recipe_steps()}</label>
            </h2>
            {/* How long it takes, in view with the steps. */}
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
            <MarkedTextarea
              id={field.name}
              list="numbers"
              value={field.state.value}
              placeholder={examples.steps}
              marksOf={(line) => marksOf(line, 'step', opts)}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          </section>
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
          'flex items-center gap-2 p-3 md:sticky md:inset-x-auto md:bottom-8 md:mt-auto md:w-full md:max-w-sm md:self-center',
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
              disabled={saving}
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
  placeholder = label,
}: {
  field: TextField
  icon: LucideIcon
  label: string
  placeholder?: string
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
          placeholder={placeholder}
          value={field.state.value}
          onChange={(event) => field.handleChange(event.target.value)}
          onBlur={field.handleBlur}
          aria-invalid={invalid}
        />
      </InputGroup>
    </Field>
  )
}

// A time in minutes, named under its box, where the name has the width the
// box can't spare: three to a row on a phone, Finnish names are too long to
// sit beside a number. The number sits beside its unit.
function MinutesField({ field, label }: { field: TextField; label: string }) {
  const invalid = !field.state.meta.isValid || undefined
  return (
    <Field data-invalid={invalid} className="gap-1.5">
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
      <FieldLabel
        htmlFor={field.name}
        className="justify-center text-center font-normal text-muted-foreground"
      >
        {label}
      </FieldLabel>
    </Field>
  )
}

// The editor's own scrolling glides, unless the device asks for less
// motion.
function scrollBehavior(): ScrollBehavior {
  return matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'instant'
    : 'smooth'
}

// Closing no toast at all would close every toast.
function closeToast(id: string | undefined) {
  if (id !== undefined) toast.close(id)
}
