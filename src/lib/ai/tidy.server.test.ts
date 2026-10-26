import { MockLanguageModelV4 } from 'ai/test'
import { describe, expect, it } from 'vitest'
import { askToTidy } from '@/lib/ai/tidy.server'
import { tidiedSteps } from '@/lib/editor/tidy'

function modelAnswering(answer: unknown) {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: 'text', text: JSON.stringify(answer) }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: {
        inputTokens: {
          total: 10,
          noCache: 10,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: { total: 20, text: 20, reasoning: undefined },
      },
      warnings: [],
    }),
  })
}

// Part of the user's copied bread recipe, including a page control and
// an empty line, to check the indices refer to the unmodified input.
const STEPS =
  'Vaihe 4 tehty4\n\nAnna taikinan kohota leivinliinan alla lämpimässä, vedottomassa paikassa 1 1/2 tuntia.'
const COOKING = STEPS.split('\n')[2]

describe('askToTidy', () => {
  it('identifies clutter separately and validates the remaining recipe text', async () => {
    const model = modelAnswering({ steps: [COOKING], removedLines: [0] })
    const answer = await askToTidy(model, STEPS)
    expect(answer).toEqual({ steps: [COOKING], removedLines: [0] })
    expect(tidiedSteps(STEPS, answer.steps, answer.removedLines)).toBe(COOKING)

    const call = model.doGenerateCalls[0]
    const user = call.prompt.find((message) => message.role === 'user')
    expect(user?.content).toEqual([
      {
        type: 'text',
        text: JSON.stringify({
          lines: [
            { index: 0, text: 'Vaihe 4 tehty4' },
            { index: 1, text: '' },
            { index: 2, text: COOKING },
          ],
        }),
      },
    ])
    expect(call.responseFormat).toMatchObject({
      type: 'json',
      schema: { required: ['steps', 'removedLines'] },
    })
  })

  it('still rejects changes to quantities after identified clutter is removed', async () => {
    const model = modelAnswering({
      steps: [COOKING.replace('1 1/2', '11/2')],
      removedLines: [0],
    })
    const answer = await askToTidy(model, STEPS)
    expect(tidiedSteps(STEPS, answer.steps, answer.removedLines)).toBeNull()
  })

  it('requires explicit removal metadata in the structured answer', async () => {
    await expect(
      askToTidy(modelAnswering({ steps: [COOKING] }), STEPS),
    ).rejects.toThrow()
  })
})
