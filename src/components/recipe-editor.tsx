import { ParaglideMessage } from '@inlang/paraglide-js-react'
import { useForm, useStore } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  BookOpenIcon,
  ClockIcon,
  FlameIcon,
  SliceIcon,
  UsersIcon,
} from 'lucide-react'
import { cn } from 'cn'
import { useRef, useState } from 'react'

import { FLOATING_BAR, useHideMenu } from '@/components/app-shell'
import { ChoiceSelect } from '@/components/choice-select'
import { MarkedTextarea } from '@/components/marked-textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { useCoarsePointer } from '@/hooks/use-coarse-pointer'
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

// What an empty list shows, in the recipe's language: real lines from
// published recipes, with a heading, so the placeholder shows how a list is
// written and what the app recognises in it.
const EXAMPLES: Record<Language, { ingredients: string; steps: string }> = {
  // https://kotiliesi.fi/resepti/etikkasilakat/ and
  // https://www.valio.fi/reseptit/gluteeniton-kesakurpitsa-juustoleipa/
  fi: {
    ingredients:
      '1 sipuli\n2 rkl voita\nEtikkaliemi:\n1 dl etikkaa\n2 dl sokeria',
    steps:
      'Kaada taikina voideltuun, suorakaiteen muotoiseen 1,5 litran vetoiseen leipävuokaan.\nPaista 175 asteessa uunin alatasolla n. 40 min tai kunnes kypsä.',
  },
  // https://www.tasteofhome.com/recipes/overnight-cherry-danish/ and
  // https://www.kingarthurbaking.com/recipes/baked-doughnuts-three-ways-recipe
  en: {
    ingredients:
      "6 cups all-purpose flour\n1 cup cold butter, cubed\nICING:\n3 cups confectioners' sugar\n2 tablespoons butter, softened",
    steps:
      'Preheat the oven to 375°F with a rack in the top third.\nSpoon the batter into the lightly greased doughnut pans, filling the wells to about 1/4" shy of the rim.',
  },
}

const TIMES = [
  ['prepMinutes', m.recipe_prep, SliceIcon],
  ['cookMinutes', m.recipe_cook, FlameIcon],
  ['totalMinutes', m.recipe_total, ClockIcon],
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
  const [saveFailed, setSaveFailed] = useState(false)
  const [typing, setTyping] = useState(false)
  const touch = useCoarsePointer()
  useHideMenu()
  // Once saved or discarded, a change made before the editor goes mustn't
  // bring the draft back.
  const finished = useRef(false)

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
    onSubmit: async ({ value }) => {
      setSaveFailed(false)
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
        setSaveFailed(true)
      }
    },
  })

  const values = useStore(form.store, (state) => state.values)
  const timesInvalid = useStore(form.store, (state) =>
    TIMES.some(([name]) => state.fieldMeta[name]?.errors.length),
  )
  const opts = { language: values.language, system: values.measuringSystem }
  // An imported recipe's source is the page it came from, shown in the note
  // at the top; a typed one's is whatever was typed in, a book and page.
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
    toast.add({
      title: m.editor_discarded(),
      actionProps: {
        children: m.editor_undo(),
        onClick: () => {
          saveDraft(link, draft)
          void navigate({ to: '/add', search: link ? { link } : {} })
        },
      },
    })
    void navigate({ to: '/' })
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
      // Focus moving between fields blurs one and focuses the next in one
      // go, so the actions don't flicker.
      onFocus={(event) => setTyping(takesTyping(event.target))}
      onBlur={() => setTyping(false)}
      className="flex flex-col gap-8"
    >
      {source && (
        <Alert>
          {/* "Read from Soppa365. Check it before saving.", the source's
              name linking to the page. */}
          <AlertDescription>
            <ParaglideMessage
              message={m.editor_imported_from}
              inputs={{ site: values.sourceName.trim() || source.site }}
              markup={{
                link: ({ children }) => (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                  >
                    {children}
                  </a>
                ),
              }}
            />
          </AlertDescription>
        </Alert>
      )}
      {saveFailed && (
        <Alert variant="destructive">
          <AlertDescription>{m.editor_save_failed()}</AlertDescription>
        </Alert>
      )}

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
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        {/* What holds for the whole recipe: for one typed in, where it's
            from, a book and page (an import's source is the note at the
            top), and the language it's written in, labelled. */}
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
            <FieldDescription>{m.editor_ingredients_hint()}</FieldDescription>
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
              {TIMES.map(([name, label, Icon]) => (
                <form.Field key={name} name={name}>
                  {(time) => (
                    <IconField
                      field={time}
                      icon={Icon}
                      label={label()}
                      unit={m.editor_minutes_unit()}
                      inputMode="numeric"
                    />
                  )}
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
            <FieldDescription>{m.editor_steps_hint()}</FieldDescription>
          </section>
        )}
      </form.Field>

      {/* Discard and Save where the thumb is. On phones they take the
          bottom bar's place, the menu stepping aside while the editor
          shows; on wider screens they float at the bottom of the editor.
          On a phone they also step aside while something is typed, so
          they don't crowd the keyboard. */}
      <div
        className={cn(
          FLOATING_BAR,
          'flex items-center justify-between gap-2 p-3 md:sticky md:inset-x-auto md:bottom-6 md:w-full md:max-w-sm md:self-center',
          touch && typing && 'hidden',
        )}
      >
        <Button type="button" variant="outline" size="lg" onClick={discard}>
          {m.editor_discard()}
        </Button>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(saving) => (
            <Button type="submit" size="lg" disabled={saving}>
              {saving && <Spinner data-icon="inline-start" />}
              {m.editor_save()}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}

// A field without a visible label: its icon and placeholder say what it
// is, and the label is for screen readers. A unit, such as "min", follows
// what's typed.
function IconField({
  field,
  icon: Icon,
  label,
  placeholder = label,
  unit,
  inputMode,
}: {
  field: {
    name: string
    state: { value: string; meta: { isValid: boolean } }
    handleChange: (value: string) => void
    handleBlur: () => void
  }
  icon: LucideIcon
  label: string
  placeholder?: string
  unit?: string
  inputMode?: React.ComponentProps<'input'>['inputMode']
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
          inputMode={inputMode}
          placeholder={placeholder}
          value={field.state.value}
          onChange={(event) => field.handleChange(event.target.value)}
          onBlur={field.handleBlur}
          aria-invalid={invalid}
        />
        {unit && (
          <InputGroupAddon align="inline-end">
            <InputGroupText>{unit}</InputGroupText>
          </InputGroupAddon>
        )}
      </InputGroup>
    </Field>
  )
}

// Whether focusing the element brings up the keyboard. A select opens a
// picker instead.
function takesTyping(element: EventTarget): boolean {
  return (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLInputElement
  )
}
