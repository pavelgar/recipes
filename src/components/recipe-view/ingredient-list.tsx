import { cn } from 'cn'
import { MinusIcon, PlusIcon, RotateCcwIcon } from 'lucide-react'
import { useId } from 'react'
import { Segments } from '@/components/recipe-view/step-text'
import { Button } from '@/components/ui/button'
import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group'
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useIsMobile } from '@/hooks/use-mobile'
import { m } from '@/paraglide/messages'
import type { ReadSection } from '@/components/recipe-view/lines'
import type { CrossOff, Servings } from '@/components/recipe-view/state'
import type { RecipeLanguage } from '@/lib/languages'
import type { Ref } from 'react'

type ListProps = {
  sections: ReadonlyArray<ReadSection>
  language: RecipeLanguage
  cross: CrossOff
  servings: Servings
}

// The servings as the recipe writes them, scaled ("5 people", "Serves
// 12-15"), between the buttons that change them. Long servings wrap, and
// the buttons grow with them.
function ServingsStepper({
  servings,
  language,
}: {
  servings: Servings
  language: RecipeLanguage
}) {
  return (
    <ButtonGroup aria-label={m.recipe_servings()}>
      <Button
        variant="outline"
        size="icon"
        onClick={servings.less}
        disabled={!servings.canLess}
        aria-label={m.recipe_servings_fewer()}
        className="h-auto min-h-9"
      >
        <MinusIcon />
      </Button>
      <ButtonGroupText
        lang={language}
        aria-live="polite"
        className="flex-1 justify-center bg-transparent py-1.5 text-center text-balance tabular-nums"
      >
        {servings.label}
      </ButtonGroupText>
      <Button
        variant="outline"
        size="icon"
        onClick={servings.more}
        aria-label={m.recipe_servings_more()}
        className="h-auto min-h-9"
      >
        <PlusIcon />
      </Button>
    </ButtonGroup>
  )
}

// The ingredient lines, each one checked off as it's gathered, in a field
// set per section.
function Lines({ sections, language, cross }: ListProps) {
  const id = useId()
  return (
    <div lang={language}>
      {sections.map((section) => (
        <FieldSet key={section.key} className="not-first:mt-6">
          {section.heading && (
            <FieldLegend variant="label" className="mb-2 text-balance">
              {section.heading}
            </FieldLegend>
          )}
          <FieldGroup data-slot="checkbox-group">
            {section.lines.map((line) => {
              const done = cross.has(line.key)
              const lineId = `${id}-${line.key}`
              return (
                <Field key={line.key} orientation="horizontal">
                  <Checkbox
                    id={lineId}
                    checked={done}
                    onCheckedChange={() => cross.toggle(line.key)}
                  />
                  <FieldContent>
                    <FieldLabel
                      htmlFor={lineId}
                      className={cn(
                        'block w-full cursor-pointer text-base leading-snug font-normal',
                        done &&
                          'text-muted-foreground line-through decoration-foreground/30',
                      )}
                    >
                      <Segments pieces={line.pieces} />
                    </FieldLabel>
                  </FieldContent>
                </Field>
              )
            })}
          </FieldGroup>
        </FieldSet>
      ))}
    </div>
  )
}

// Unchecks every ingredient, once any is checked.
function UncheckAll({ sections, cross }: ListProps) {
  const keys = sections.flatMap((s) => s.lines.map((l) => l.key))
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => cross.clear(keys)}
      className="-ml-2.5 self-start"
    >
      <RotateCcwIcon data-icon="inline-start" />
      {m.recipe_uncheck_all()}
    </Button>
  )
}

const anyChecked = ({ sections, cross }: ListProps) =>
  sections.some((s) => s.lines.some((l) => cross.has(l.key)))

// The ingredients in a card: the title and servings in its header, the
// servings on a row of their own on phones. Where the card holds still
// beside the steps, its list scrolls inside it.
export function IngredientCard({
  titleId,
  scrolls,
  className,
  ref,
  ...props
}: ListProps & {
  titleId: string
  scrolls: boolean
  className?: string
  ref?: Ref<HTMLDivElement>
}) {
  const lines = (
    <CardContent>
      <Lines {...props} />
    </CardContent>
  )
  return (
    <Card ref={ref} className={className}>
      <CardHeader>
        <CardTitle
          id={titleId}
          role="heading"
          aria-level={2}
          className="text-2xl font-semibold"
        >
          {m.recipe_ingredients()}
        </CardTitle>
        <CardAction className="max-md:col-span-2 max-md:col-start-1 max-md:row-span-1 max-md:row-start-2 max-md:justify-self-start">
          <ServingsStepper
            servings={props.servings}
            language={props.language}
          />
        </CardAction>
      </CardHeader>
      {scrolls ? (
        <ScrollArea
          className="flex min-h-0 flex-col"
          viewportProps={{ className: 'min-h-0 flex-1' }}
        >
          {lines}
        </ScrollArea>
      ) : (
        lines
      )}
      {anyChecked(props) && (
        <CardFooter>
          <UncheckAll {...props} />
        </CardFooter>
      )}
    </Card>
  )
}

// The ingredients in a drawer, for when their card has scrolled away.
export function IngredientDrawer({
  open,
  onOpenChange,
  ...props
}: ListProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const isMobile = useIsMobile()
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      swipeDirection={isMobile ? 'down' : 'right'}
      showSwipeHandle={isMobile}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{m.recipe_ingredients()}</DrawerTitle>
        </DrawerHeader>
        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-4">
          <ServingsStepper
            servings={props.servings}
            language={props.language}
          />
          <Lines {...props} />
        </div>
        {anyChecked(props) && (
          <DrawerFooter>
            <UncheckAll {...props} />
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  )
}
