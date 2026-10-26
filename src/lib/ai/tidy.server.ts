import { generateText, Output } from 'ai'
import { z } from 'zod'
import { AI_MAX_OUTPUT_TOKENS, AI_TIMEOUT_MS } from '@/lib/ai/model.server'
import type { AiModel } from '@/lib/ai/model.server'

// The examples are the ones the brief gives of steps as pages publish
// them. What the model may change is checked after (src/lib/editor/tidy.ts).
const INSTRUCTIONS = `You tidy the steps of a recipe for a recipe app. The steps come one per line, as a web page published them, often cut in the wrong places. Return them with each step on a line of its own:

- Where a line holds several numbered steps ("…bake for 20 minutes.2. In a bowl…"), split it at each number.
- Where steps or sentences run together without a space ("…pastan sekaan.Kiehauta…"), split them into steps if they are separate steps, otherwise leave them as written.
- Where a step is cut in two, a line ending mid-sentence and the next going on with it, join the two with a space.
- Where a heading ("For the sauce", "Kastike") runs onto a step, put it on its own line, ending with a colon.
- Leave out the step numbers at the start of steps ("1.", "2)"); the app numbers steps itself.
- Keep the sentences of one step together, and keep lines that are already one step each as they are.

Change nothing else: no character may be added, changed or left out, apart from line breaks and their adjacent spaces, the step numbers you leave out and the colon after a heading. Don't reword, correct spelling or translate.`

const answerSchema = z.object({ steps: z.array(z.string()) })

// The steps as the model tidied them, one per line. Throws if the provider
// fails or answers in another shape.
export async function askToTidy(
  model: AiModel,
  steps: string,
): Promise<ReadonlyArray<string>> {
  const { output } = await generateText({
    model,
    instructions: INSTRUCTIONS,
    prompt: steps,
    output: Output.object({ schema: answerSchema }),
    maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
    timeout: AI_TIMEOUT_MS,
  })
  return output.steps
}
