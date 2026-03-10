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

const validDietPlan = {
  avoid: ['High-sodium foods', 'Raw shellfish', 'Alcohol', 'Processed meats', 'Canned soups'],
  prefer: ['Fresh vegetables', 'Lean protein', 'Whole grains', 'Fruits', 'Legumes'],
  watch: ['Daily sodium intake', 'Fluid restriction', 'Protein quality', 'Potassium levels', 'Calorie intake'],
  nutrients: {
    Sodium: '< 300mg/serving',
    Protein: '1.0-1.5g per kg/day',
  },
}

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/diet-plan/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/diet-plan/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetStore()
  })

  it('returns 400 when diseaseName is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
    expect(json.retryable).toBe(false)
  })

  it('returns 400 when diseaseName is empty string', async () => {
    const res = await POST(makeRequest({ diseaseName: '' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when diseaseName is whitespace only', async () => {
    const res = await POST(makeRequest({ diseaseName: '   ' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost:3000/api/diet-plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns a valid diet plan for a valid disease name', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(validDietPlan) } }],
    })

    const res = await POST(makeRequest({ diseaseName: 'Type 2 Diabetes' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.dietPlan).toBeDefined()
    expect(json.dietPlan.avoid).toEqual(validDietPlan.avoid)
    expect(json.dietPlan.prefer).toEqual(validDietPlan.prefer)
    expect(json.dietPlan.watch).toEqual(validDietPlan.watch)
    expect(json.dietPlan.nutrients).toEqual(validDietPlan.nutrients)
  })

  it('handles OpenAI response wrapped in markdown code block', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '```json\n' + JSON.stringify(validDietPlan) + '\n```' } }],
    })

    const res = await POST(makeRequest({ diseaseName: 'Cirrhosis' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.dietPlan.avoid).toEqual(validDietPlan.avoid)
    expect(json.dietPlan.prefer).toEqual(validDietPlan.prefer)
  })

  it('returns 502 when OpenAI returns empty content', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '' } }],
    })

    const res = await POST(makeRequest({ diseaseName: 'Diabetes' }))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.code).toBe('AI_SERVICE_ERROR')
    expect(json.retryable).toBe(true)
  })

  it('returns 502 when OpenAI throws an error', async () => {
    mockCreate.mockRejectedValue(new Error('API key invalid'))

    const res = await POST(makeRequest({ diseaseName: 'Diabetes' }))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.code).toBe('AI_SERVICE_ERROR')
    expect(json.retryable).toBe(true)
  })

  it('returns 502 when OpenAI returns unparseable content', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'This is not JSON at all' } }],
    })

    const res = await POST(makeRequest({ diseaseName: 'Diabetes' }))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.code).toBe('AI_SERVICE_ERROR')
  })

  it('returns 502 when diet plan structure is invalid (missing fields)', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ avoid: ['food'], prefer: ['food'] }) } }],
    })

    const res = await POST(makeRequest({ diseaseName: 'Diabetes' }))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.code).toBe('AI_SERVICE_ERROR')
  })

  it('returns 429 when rate limit is exceeded', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(validDietPlan) } }],
    })

    // Default rate limit for diet-plan-generate is 5 per minute
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeRequest({ diseaseName: 'Diabetes' }))
      expect(res.status).toBe(200)
    }

    // 6th request should be rate limited
    const res = await POST(makeRequest({ diseaseName: 'Diabetes' }))
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.code).toBe('RATE_LIMIT_EXCEEDED')
    expect(json.retryable).toBe(true)
  })

  it('passes correct parameters to OpenAI', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(validDietPlan) } }],
    })

    await POST(makeRequest({ diseaseName: 'Liver Cirrhosis' }))

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o',
        max_tokens: 1000,
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Liver Cirrhosis'),
          }),
        ]),
      })
    )
  })
})
