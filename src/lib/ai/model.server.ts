import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { APICallError, RetryError } from 'ai'
import { getAiSettings } from '@/env.server'
import type { LanguageModel } from 'ai'

export type AiModel = Exclude<LanguageModel, string>

const OPENROUTER_URL = 'https://openrouter.ai/api/v1'

// The model the container is given, or null without one. Every feature
// uses the same one.
export function aiModel(): AiModel | null {
  const settings = getAiSettings()
  if (!settings) return null
  const { provider, model, apiKey, baseUrl } = settings
  switch (provider) {
    case 'anthropic':
      return createAnthropic({ apiKey, baseURL: baseUrl })(model)
    case 'openai':
      return createOpenAI({ apiKey, baseURL: baseUrl })(model)
    // Both answer to a JSON schema. llama.cpp's server does too, and turns
    // the schema into a grammar the model can't step out of.
    case 'openrouter':
    case 'openai-compatible':
      return createOpenAICompatible({
        name: provider,
        apiKey,
        baseURL: baseUrl ?? OPENROUTER_URL,
        supportsStructuredOutputs: true,
      })(model)
  }
}

// How long a model may take. A local model on a home server can take
// minutes over a long recipe; a cloud model takes seconds.
export const AI_TIMEOUT_MS = 5 * 60_000

// Enough for the longest recipe, as JSON. Models stop sooner by themselves.
export const AI_MAX_OUTPUT_TOKENS = 8192

// Whether the provider refused a request because the model doesn't take
// images. Each says so in its own words: OpenAI that "image_url is only
// supported by certain models", OpenRouter that no endpoint supports
// "image input", llama.cpp that "image input is not supported" without a
// vision projector.
export function refusedImages(error: unknown): boolean {
  const failures = RetryError.isInstance(error) ? error.errors : [error]
  return failures.some(
    (failure) =>
      APICallError.isInstance(failure) &&
      failure.statusCode !== undefined &&
      failure.statusCode >= 400 &&
      failure.statusCode !== 401 &&
      failure.statusCode !== 429 &&
      /\bimage/i.test(`${failure.message} ${failure.responseBody ?? ''}`),
  )
}
