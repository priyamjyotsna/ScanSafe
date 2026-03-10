import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { _resetStore } from '@/lib/rate-limiter'

// Mock auth
const mockAuth = vi.fn()
vi.mock('@/lib/auth', () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
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

// Mock Prisma
const mockPrismaCreate = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    scanHistory: {
      create: (...args: unknown[]) => mockPrismaCreate(...args),
    },
  },
}))

const validBody = {
  diseaseName: 'Type 2 Diabetes',
  dietPlan: {
    avoid: ['High sugar foods'],
    prefer: ['Whole grains'],
    watch: ['Carbohydrate intake'],
    nutrients: { Sugar: '< 25g/day' },
  },
  product: {
    name: 'Chocolate Bar',
    ingredients: ['Sugar', 'Cocoa butter', 'Milk'],
    nutrients: {
      sodium: 50,
      sugar: 30,
      carbohydrates: 45,
      fat: 15,
      protein: 3,
      fiber: 1,
      saturatedFat: 8,
      transFat: 0,
    },
  },
}

const avoidVerdictResponse = {
  verdict: 'AVOID',
  reason: 'High sugar content is dangerous for Type 2 Diabetes.',
  flaggedNutrients: ['sugar'],
  safeAlternative: 'Try dark chocolate with 85% cocoa.',
}

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/scan/verdict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockOpenAIResponse(content: string) {
  mockCreate.mockResolvedValue({
    choices: [{ message: { content } }],
  })
}

describe('POST /api/scan/verdict', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetStore()
    mockAuth.mockResolvedValue(null)
  })

  // --- Validation ---

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost:3000/api/scan/verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when diseaseName is missing', async () => {
    const res = await POST(makeRequest({ ...validBody, diseaseName: undefined }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
    expect(json.error).toContain('diseaseName')
  })

  it('returns 400 when diseaseName is empty', async () => {
    const res = await POST(makeRequest({ ...validBody, diseaseName: '  ' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when dietPlan is missing', async () => {
    const res = await POST(makeRequest({ ...validBody, dietPlan: undefined }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
    expect(json.error).toContain('dietPlan')
  })

  it('returns 400 when dietPlan is missing required fields', async () => {
    const res = await POST(makeRequest({ ...validBody, dietPlan: { avoid: [] } }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when product is missing', async () => {
    const res = await POST(makeRequest({ ...validBody, product: undefined }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
    expect(json.error).toContain('product')
  })

  it('returns 400 when product name is empty', async () => {
    const res = await POST(
      makeRequest({ ...validBody, product: { ...validBody.product, name: '' } })
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when product ingredients is not an array', async () => {
    const res = await POST(
      makeRequest({ ...validBody, product: { ...validBody.product, ingredients: 'flour' } })
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  // --- Successful verdict ---

  it('returns AVOID verdict for a valid request', async () => {
    mockOpenAIResponse(JSON.stringify(avoidVerdictResponse))

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.verdict).toBe('AVOID')
    expect(json.reason).toBe(avoidVerdictResponse.reason)
    expect(json.flaggedNutrients).toEqual(['sugar'])
    expect(json.safeAlternative).toBe(avoidVerdictResponse.safeAlternative)
  })

  it('returns SAFE verdict without safeAlternative', async () => {
    mockOpenAIResponse(
      JSON.stringify({
        verdict: 'SAFE',
        reason: 'This product is compatible with your diet.',
        flaggedNutrients: [],
      })
    )

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.verdict).toBe('SAFE')
    expect(json.safeAlternative).toBeUndefined()
  })

  it('handles OpenAI response wrapped in markdown code block', async () => {
    mockOpenAIResponse('```json\n' + JSON.stringify(avoidVerdictResponse) + '\n```')

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.verdict).toBe('AVOID')
  })

  // --- OpenAI parameters ---

  it('passes correct parameters to OpenAI', async () => {
    mockOpenAIResponse(JSON.stringify(avoidVerdictResponse))

    await POST(makeRequest(validBody))

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o',
        max_tokens: 300,
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('clinical dietitian'),
          }),
        ]),
      })
    )
  })

  it('includes disease name and product info in the prompt', async () => {
    mockOpenAIResponse(JSON.stringify(avoidVerdictResponse))

    await POST(makeRequest(validBody))

    const callArgs = mockCreate.mock.calls[0][0]
    const prompt = callArgs.messages[0].content
    expect(prompt).toContain('Type 2 Diabetes')
    expect(prompt).toContain('Chocolate Bar')
    expect(prompt).toContain('High sugar foods')
  })

  // --- Error handling ---

  it('returns 502 when OpenAI returns empty content', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '' } }],
    })

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.code).toBe('AI_SERVICE_ERROR')
  })

  it('returns 422 when OpenAI returns unparseable content', async () => {
    mockOpenAIResponse('I cannot analyze this product.')

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.code).toBe('AI_PARSE_ERROR')
    expect(json.retryable).toBe(true)
  })

  it('returns 422 when parsed response has invalid verdict value', async () => {
    mockOpenAIResponse(
      JSON.stringify({
        verdict: 'MAYBE',
        reason: 'Not sure.',
        flaggedNutrients: [],
      })
    )

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.code).toBe('AI_PARSE_ERROR')
  })

  it('returns 502 when OpenAI throws an error', async () => {
    mockCreate.mockRejectedValue(new Error('API key invalid'))

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.code).toBe('AI_SERVICE_ERROR')
    expect(json.retryable).toBe(true)
  })

  // --- Scan history ---

  it('saves to ScanHistory for authenticated users', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-123' } })
    mockOpenAIResponse(JSON.stringify(avoidVerdictResponse))
    mockPrismaCreate.mockResolvedValue({})

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)

    expect(mockPrismaCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-123',
        productName: 'Chocolate Bar',
        scanMethod: 'BARCODE',
        verdict: 'AVOID',
        verdictDetail: expect.objectContaining({
          reason: avoidVerdictResponse.reason,
          flaggedNutrients: ['sugar'],
          safeAlternative: avoidVerdictResponse.safeAlternative,
          ingredients: validBody.product.ingredients,
        }),
      }),
    })
  })

  it('does not save to ScanHistory for unauthenticated users', async () => {
    mockOpenAIResponse(JSON.stringify(avoidVerdictResponse))

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    expect(mockPrismaCreate).not.toHaveBeenCalled()
  })

  it('still returns verdict even if ScanHistory save fails', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-123' } })
    mockOpenAIResponse(JSON.stringify(avoidVerdictResponse))
    mockPrismaCreate.mockRejectedValue(new Error('DB connection failed'))

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.verdict).toBe('AVOID')
  })

  // --- Rate limiting ---

  it('returns 429 when rate limit is exceeded', async () => {
    mockOpenAIResponse(JSON.stringify(avoidVerdictResponse))

    // Default rate limit for verdict is 20 per minute
    for (let i = 0; i < 20; i++) {
      const res = await POST(makeRequest(validBody))
      expect(res.status).toBe(200)
    }

    // 21st request should be rate limited
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.code).toBe('RATE_LIMIT_EXCEEDED')
    expect(json.retryable).toBe(true)
  })

  // --- Filters non-string flaggedNutrients ---

  it('filters out non-string flaggedNutrients', async () => {
    mockOpenAIResponse(
      JSON.stringify({
        verdict: 'CAUTION',
        reason: 'Moderate sugar.',
        flaggedNutrients: ['sugar', 123, null, 'sodium'],
        safeAlternative: 'Try a lower sugar option.',
      })
    )

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.flaggedNutrients).toEqual(['sugar', 'sodium'])
  })
})
