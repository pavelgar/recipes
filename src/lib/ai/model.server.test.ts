import { APICallError, RetryError } from 'ai'
import { describe, expect, it } from 'vitest'
import { refusedImages } from '@/lib/ai/model.server'

function apiError(statusCode: number, responseBody: string) {
  return new APICallError({
    message: 'Bad Request',
    url: 'http://llama:8080/v1/chat/completions',
    requestBodyValues: {},
    statusCode,
    responseBody,
  })
}

describe('refusedImages', () => {
  it("tells a model that doesn't take images, in each provider's words", () => {
    // llama.cpp's server without a vision projector.
    expect(
      refusedImages(
        apiError(
          500,
          '{"error":{"message":"image input is not supported - hint: if this is unexpected, you may need to provide the mmproj"}}',
        ),
      ),
    ).toBe(true)
    // OpenAI's text-only models.
    expect(
      refusedImages(
        apiError(
          400,
          '{"error":{"message":"Invalid content type. image_url is only supported by certain models."}}',
        ),
      ),
    ).toBe(true)
    // OpenRouter, after the SDK's retries.
    expect(
      refusedImages(
        new RetryError({
          message: 'Failed after 3 attempts',
          reason: 'maxRetriesExceeded',
          errors: [
            apiError(
              404,
              '{"error":{"message":"No endpoints found that support image input"}}',
            ),
          ],
        }),
      ),
    ).toBe(true)
  })

  it('leaves other failures to be told apart from it', () => {
    expect(refusedImages(apiError(401, 'invalid x-api-key'))).toBe(false)
    expect(refusedImages(apiError(429, 'image rate limit'))).toBe(false)
    expect(refusedImages(apiError(500, 'overloaded'))).toBe(false)
    expect(refusedImages(new Error('image'))).toBe(false)
  })
})
