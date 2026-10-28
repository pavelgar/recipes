import { afterEach, describe, expect, it, vi } from 'vitest'
import { shrinkPhoto } from '@/components/add-recipe/photos'

afterEach(() => vi.unstubAllGlobals())

describe('shrinkPhoto', () => {
  it.each(['success', 'no context', 'encoding failed', 'drawing failed'])(
    'releases image memory after %s',
    async (outcome) => {
      const bitmap = { width: 4000, height: 3000, close: vi.fn() }
      const canvas = {
        width: 0,
        height: 0,
        getContext: () =>
          outcome === 'no context'
            ? null
            : {
                drawImage: () => {
                  if (outcome === 'drawing failed')
                    throw new Error('drawing failed')
                },
              },
        toBlob: (callback: (blob: Blob | null) => void) => {
          expect(canvas.width).toBe(2048)
          expect(canvas.height).toBe(1536)
          callback(outcome === 'encoding failed' ? null : new Blob(['photo']))
        },
      }
      vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))
      vi.stubGlobal('document', { createElement: () => canvas })
      const result = shrinkPhoto(new Blob())
      if (outcome === 'success')
        await expect(result).resolves.toBeInstanceOf(Blob)
      else await expect(result).rejects.toThrow()
      expect(bitmap.close).toHaveBeenCalledOnce()
      expect(canvas.width).toBe(0)
      expect(canvas.height).toBe(0)
    },
  )
})
