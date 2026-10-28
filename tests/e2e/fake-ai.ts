import { createServer } from 'node:http'
import { PELTILEIPA } from './recipes.ts'

// A stand-in for an OpenAI-compatible model server, such as llama.cpp's,
// for the app the AI tests run against (playwright.config.ts). It answers
// as a model following the app's instructions would, from canned readings,
// so the tests check the app around the model, not the model.
//
// - A recipe read finds PELTILEIPA in any text that names it, and nothing
//   elsewhere. Its first ingredient comes back without "Valio", so the
//   editor has a line to mark as written differently in the source.
// - Tidying steps splits lines where a sentence runs into the next and
//   drops step numbers, as the instructions ask.

const port = Number(process.env.PORT)

type Message = { role: string; content: string | Array<{ text?: string }> }

const textOf = (message: Message) =>
  typeof message.content === 'string'
    ? message.content
    : message.content.map((part) => part.text ?? '').join('\n')

function readRecipe(text: string) {
  const found = text.includes(PELTILEIPA.title)
  return {
    isRecipe: found,
    title: found ? PELTILEIPA.title : null,
    servings: found ? PELTILEIPA.servings : null,
    prepMinutes: null,
    cookMinutes: null,
    totalMinutes: null,
    ingredients: found
      ? [
          {
            heading: null,
            lines: [
              PELTILEIPA.ingredients[0].replace('Valio ', ''),
              ...PELTILEIPA.ingredients.slice(1),
            ],
          },
        ]
      : [],
    steps: found ? [{ heading: null, lines: PELTILEIPA.steps }] : [],
    language: found ? 'fi' : null,
    measures: null,
  }
}

function tidy(prompt: string) {
  const { lines } = JSON.parse(prompt) as {
    lines: Array<{ index: number; text: string }>
  }
  return {
    steps: lines.flatMap(({ text }) =>
      text
        .split(/(?<=[.!?])(?=\p{Lu})/u)
        .map((step) => step.replace(/^\d+[.)]\s*/, '')),
    ),
    removedLines: [],
  }
}

createServer((request, response) => {
  let body = ''
  request.on('data', (chunk: Buffer) => (body += chunk.toString()))
  request.on('end', () => {
    if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
      response.writeHead(404).end()
      return
    }
    const { messages } = JSON.parse(body) as { messages: Array<Message> }
    const system = messages.find((m) => m.role === 'system')
    const user = messages.filter((m) => m.role === 'user').map(textOf)
    const answer =
      system && textOf(system).startsWith('You tidy the steps')
        ? tidy(user.join('\n'))
        : readRecipe(user.join('\n'))
    response.writeHead(200, { 'content-type': 'application/json' }).end(
      JSON.stringify({
        id: 'fake',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'fake',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: JSON.stringify(answer) },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      }),
    )
  })
}).listen(port)
