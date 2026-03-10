import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { _resetStore } from '@/lib/rate-limiter'

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}))

// Mock OpenAI
const mockCreate = vi.fn()
vi.mock('@/lib/openai', () => ({
  openai: {
    chat: {
      completions: {
        create: (...args: unknown[]) => mockCreate(...args),
      },
    },
  },
}))

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/scan/ingredients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/scan/ingredients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetStore()
  })

  it('returns 400 when imageBase64 is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when imageBase64 is empty string', async () => {
    const res = await POST(makeRequest({ imageBase64: '' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when imageBase64 is not a string', async () => {
    const res = await POST(makeRequest({ imageBase64: 12345 }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost:3000/api/scan/ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns extracted ingredients for a valid image', async () => {
    const ocrResult = {
      ingredients: ['Wheat flour', 'Palm oil', 'Salt', 'Sugar'],
      rawText: 'Ingredients: Wheat flour, Palm oil, Salt, Sugar',
    }
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(ocrResult) } }],
    })

    const res = await POST(makeRequest({ imageBase64: 'data:image/jpeg;base64,abc123' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ingredients).toEqual(ocrResult.ingredients)
    expect(json.rawText).toBe(ocrResult.rawText)
  })

  it('handles OpenAI response wrapped in markdown code block', async () => {
    const ocrResult = {
      ingredients: ['Rice', 'Water', 'Salt'],
      rawText: 'Ingredients: Rice, Water, Salt',
    }
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '```json\n' + JSON.stringify(ocrResult) + '\n```' } }],
    })

    const res = await POST(makeRequest({ imageBase64: 'data:image/jpeg;base64,abc123' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ingredients).toEqual(ocrResult.ingredients)
    expect(json.rawText).toBe(ocrResult.rawText)
  })

  it('returns 422 when OpenAI returns empty content', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '' } }],
    })

    const res = await POST(makeRequest({ imageBase64: 'data:image/jpeg;base64,abc123' }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.code).toBe('OCR_EXTRACTION_FAILED')
    expect(json.retryable).toBe(true)
  })

  it('returns 422 when OpenAI returns empty ingredients array', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ ingredients: [], rawText: '' }) } }],
    })

    const res = await POST(makeRequest({ imageBase64: 'data:image/jpeg;base64,abc123' }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.code).toBe('OCR_EXTRACTION_FAILED')
  })

  it('returns 422 when OpenAI returns unparseable content', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'Cannot read the image clearly' } }],
    })

    const res = await POST(makeRequest({ imageBase64: 'data:image/jpeg;base64,abc123' }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.code).toBe('OCR_EXTRACTION_FAILED')
  })

  it('returns 422 when parsed response has invalid structure', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ text: 'some text' }) } }],
    })

    const res = await POST(makeRequest({ imageBase64: 'data:image/jpeg;base64,abc123' }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.code).toBe('OCR_EXTRACTION_FAILED')
  })

  it('returns 502 when OpenAI throws an error', async () => {
    mockCreate.mockRejectedValue(new Error('API key invalid'))

    const res = await POST(makeRequest({ imageBase64: 'data:image/jpeg;base64,abc123' }))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.code).toBe('AI_SERVICE_ERROR')
    expect(json.retryable).toBe(true)
  })

  it('passes correct parameters to OpenAI', async () => {
    const ocrResult = {
      ingredients: ['Flour'],
      rawText: 'Ingredients: Flour',
    }
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(ocrResult) } }],
    })

    await POST(makeRequest({ imageBase64: 'data:image/jpeg;base64,testimage' }))

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o',
        max_tokens: 500,
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({ type: 'text' }),
              expect.objectContaining({
                type: 'image_url',
                image_url: { url: 'data:image/jpeg;base64,testimage' },
              }),
            ]),
          }),
        ]),
      })
    )
  })

  it('filters out non-string ingredients from response', async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            ingredients: ['Flour', '', 'Salt', '  ', 'Sugar'],
            rawText: 'Ingredients: Flour, Salt, Sugar',
          }),
        },
      }],
    })

    const res = await POST(makeRequest({ imageBase64: 'data:image/jpeg;base64,abc123' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ingredients).toEqual(['Flour', 'Salt', 'Sugar'])
  })

  it('returns 429 when rate limit is exceeded', async () => {
    const ocrResult = {
      ingredients: ['Flour'],
      rawText: 'Ingredients: Flour',
    }
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(ocrResult) } }],
    })

    // Default rate limit for ingredient-ocr is 10 per minute
    for (let i = 0; i < 10; i++) {
      const res = await POST(makeRequest({ imageBase64: 'data:image/jpeg;base64,abc' }))
      expect(res.status).toBe(200)
    }

    // 11th request should be rate limited
    const res = await POST(makeRequest({ imageBase64: 'data:image/jpeg;base64,abc' }))
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.code).toBe('RATE_LIMIT_EXCEEDED')
    expect(json.retryable).toBe(true)
  })
})
