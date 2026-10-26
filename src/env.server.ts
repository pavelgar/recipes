import { resolve } from 'node:path'

export function getDatabaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }
  return url
}

// The folder the cover photos are kept in, as an absolute path. A relative
// one is relative to the working directory, as the database's is.
export function getPhotosDir() {
  const dir = process.env.PHOTOS_DIR
  if (!dir) {
    throw new Error('PHOTOS_DIR is not set')
  }
  return resolve(dir)
}

// The two API styles the app speaks: Anthropic's, and the OpenAI-compatible
// one that OpenAI, OpenRouter and local servers such as llama.cpp's offer.
export const AI_PROVIDERS = [
  'anthropic',
  'openai',
  'openrouter',
  'openai-compatible',
] as const

export type AiProvider = (typeof AI_PROVIDERS)[number]

export type AiSettings = {
  readonly provider: AiProvider
  readonly model: string
  readonly apiKey: string | undefined
  // Where the API is, for a local server. The cloud providers have their
  // own.
  readonly baseUrl: string | undefined
}

// The AI model the app reads recipes with, or null without one. Anyone on
// the network can open the app's settings, so the key and the endpoint
// come only from the container's environment, and the app never shows
// them. A setting that's missing or wrong throws, saying which.
export function getAiSettings(): AiSettings | null {
  const read = (name: string) => process.env[name]?.trim() || undefined
  const provider = read('AI_PROVIDER')
  const model = read('AI_MODEL')
  const apiKey = read('AI_API_KEY')
  const baseUrl = read('AI_BASE_URL')

  if (provider === undefined) {
    const set = Object.entries({
      AI_MODEL: model,
      AI_API_KEY: apiKey,
      AI_BASE_URL: baseUrl,
    }).find(([, value]) => value !== undefined)
    if (set) throw new Error(`${set[0]} is set, but AI_PROVIDER is not`)
    return null
  }
  if (!isAiProvider(provider)) {
    throw new Error(
      `AI_PROVIDER is "${provider}"; it must be one of ${AI_PROVIDERS.join(', ')}`,
    )
  }
  if (model === undefined) {
    throw new Error('AI_PROVIDER is set, but AI_MODEL is not')
  }
  if (provider === 'openai-compatible') {
    if (baseUrl === undefined) {
      throw new Error(
        'AI_PROVIDER is openai-compatible, which needs AI_BASE_URL: the address of its API, such as http://llama:8080/v1',
      )
    }
  } else if (apiKey === undefined) {
    throw new Error(`AI_PROVIDER is ${provider}, which needs AI_API_KEY`)
  }
  if (baseUrl !== undefined && !/^https?:\/\//.test(baseUrl)) {
    throw new Error(
      `AI_BASE_URL is "${baseUrl}"; it must be an http:// or https:// address`,
    )
  }
  return { provider, model, apiKey, baseUrl }
}

function isAiProvider(value: string): value is AiProvider {
  return (AI_PROVIDERS as ReadonlyArray<string>).includes(value)
}
