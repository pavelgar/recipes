import { generateText, Output } from 'ai'
import { z } from 'zod'
import { AI_MAX_OUTPUT_TOKENS, AI_TIMEOUT_MS } from '@/lib/ai/model.server'
import type { AiModel } from '@/lib/ai/model.server'

// The examples are the ones the brief gives of steps as pages publish
// them. What the model may change is checked after (src/lib/editor/tidy.ts).
const INSTRUCTIONS = `You tidy the steps of a recipe for a recipe app. The input is JSON containing the original lines, each with its zero-based index and text. It may include copied page controls or other text unrelated to cooking. Return the recipe with each step on a line of its own:

- Identify whole lines that are clearly copied page clutter: step-completion controls (such as "Vaihe 2 tehty2"), print/share buttons, navigation, adverts or unrelated page labels. List their original indices in removedLines and leave them out of steps. With no clutter, return an empty removedLines array.
- Remove only lines whose entire text is unrelated to the recipe. Keep every cooking instruction, ingredient, quantity, temperature, time, serving/storage note and recipe heading. If a line mixes recipe text with clutter, or you are unsure, keep the whole line. Never remove a line merely because it is short or seems redundant.
- Preserve all remaining recipe text in its original order and wording. Apart from the lines explicitly listed in removedLines, no text may be omitted.

- Where a line holds several numbered steps ("…bake for 20 minutes.2. In a bowl…"), split it at each number.
- Where steps or sentences run together without a space ("…pastan sekaan.Kiehauta…"), split them into steps if they are separate steps, otherwise leave them as written.
- Where a step is cut in two, a line ending mid-sentence and the next going on with it, join the two with a space.
- Where a heading ("For the sauce", "Kastike") runs onto a step, put it on its own line, ending with a colon.
- Leave out the step numbers at the start of steps ("1.", "2)"); the app numbers steps itself.
- Keep the sentences of one step together, and keep lines that are already one step each as they are.

Change nothing else: no character may be added, changed or left out, apart from the whole clutter lines listed in removedLines, line breaks and their adjacent spaces, the step numbers you leave out and the colon after a heading. Don't reword, correct spelling or translate.`

const answerSchema = z.object({
  steps: z.array(z.string()),
  removedLines: z.array(z.number().int().nonnegative()),
})

type TidyAnswer = z.infer<typeof answerSchema>

// The tidied steps and the original line indices of discarded page
// clutter. Throws if the provider fails or answers in another shape.
export async function askToTidy(
  model: AiModel,
  steps: string,
): Promise<TidyAnswer> {
  const { output } = await generateText({
    model,
    instructions: INSTRUCTIONS,
    prompt: JSON.stringify({
      lines: steps.split('\n').map((text, index) => ({ index, text })),
    }),
    output: Output.object({ schema: answerSchema }),
    maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
    timeout: AI_TIMEOUT_MS,
  })
  return output
}
