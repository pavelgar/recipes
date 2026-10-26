import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAiSettings } from '@/env.server'

// The container's AI settings, as a household sets them.
function withEnv(env: Record<string, string>) {
  for (const name of ['AI_PROVIDER', 'AI_MODEL', 'AI_API_KEY', 'AI_BASE_URL']) {
    vi.stubEnv(name, env[name] ?? '')
  }
}

describe('getAiSettings', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is null without a provider', () => {
    withEnv({})
    expect(getAiSettings()).toBeNull()
  })

  it('takes a cloud provider with its key', () => {
    withEnv({
      AI_PROVIDER: 'anthropic',
      AI_MODEL: 'claude-sonnet-5-5',
      AI_API_KEY: 'sk-ant-test',
    })
    expect(getAiSettings()).toEqual({
      provider: 'anthropic',
      model: 'claude-sonnet-5-5',
      apiKey: 'sk-ant-test',
      baseUrl: undefined,
    })
  })

  it('takes a local server by its address, without a key', () => {
    withEnv({
      AI_PROVIDER: 'openai-compatible',
      AI_MODEL: 'gemma-3-12b-it',
      AI_BASE_URL: 'http://192.168.1.20:8080/v1',
    })
    expect(getAiSettings()).toMatchObject({
      provider: 'openai-compatible',
      baseUrl: 'http://192.168.1.20:8080/v1',
      apiKey: undefined,
    })
  })

  it('says which setting is missing or wrong', () => {
    withEnv({ AI_MODEL: 'gpt-5' })
    expect(getAiSettings).toThrow('AI_MODEL is set, but AI_PROVIDER is not')
    withEnv({ AI_PROVIDER: 'claude', AI_MODEL: 'x', AI_API_KEY: 'k' })
    expect(getAiSettings).toThrow('it must be one of anthropic, openai')
    withEnv({ AI_PROVIDER: 'openai', AI_API_KEY: 'k' })
    expect(getAiSettings).toThrow('AI_MODEL is not')
    withEnv({ AI_PROVIDER: 'openrouter', AI_MODEL: 'x' })
    expect(getAiSettings).toThrow('needs AI_API_KEY')
    withEnv({ AI_PROVIDER: 'openai-compatible', AI_MODEL: 'x' })
    expect(getAiSettings).toThrow('needs AI_BASE_URL')
    withEnv({
      AI_PROVIDER: 'openai-compatible',
      AI_MODEL: 'x',
      AI_BASE_URL: 'llama:8080',
    })
    expect(getAiSettings).toThrow('http:// or https://')
  })
})
