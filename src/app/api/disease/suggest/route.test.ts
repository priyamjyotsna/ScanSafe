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
  return new Request('http://localhost:3000/api/disease/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/disease/suggest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetStore()
  })

  it('returns 400 when query is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when query is too short', async () => {
    const res = await POST(makeRequest({ query: 'a' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
    expect(json.retryable).toBe(false)
  })

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost:3000/api/disease/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns suggestions for a valid query', async () => {
    const suggestions = [
      'Type 1 Diabetes',
      'Type 2 Diabetes',
      'Gestational Diabetes',
      'Prediabetes',
      'LADA',
      'MODY',
      'Diabetes Insipidus',
      'Steroid-Induced Diabetes',
    ]
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(suggestions) } }],
    })

    const res = await POST(makeRequest({ query: 'diabetes' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.suggestions).toEqual(suggestions)
    expect(json.suggestions).toHaveLength(8)
  })

  it('handles OpenAI response wrapped in markdown code block', async () => {
    const suggestions = ['Condition A', 'Condition B', 'Condition C', 'D', 'E', 'F', 'G', 'H']
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '```json\n' + JSON.stringify(suggestions) + '\n```' } }],
    })

    const res = await POST(makeRequest({ query: 'test condition' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.suggestions).toEqual(suggestions)
  })

  it('returns 502 when OpenAI returns empty content', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '' } }],
    })

    const res = await POST(makeRequest({ query: 'diabetes' }))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.code).toBe('AI_SERVICE_ERROR')
    expect(json.retryable).toBe(true)
  })

  it('returns 502 when OpenAI throws an error', async () => {
    mockCreate.mockRejectedValue(new Error('API key invalid'))

    const res = await POST(makeRequest({ query: 'diabetes' }))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.code).toBe('AI_SERVICE_ERROR')
    expect(json.retryable).toBe(true)
  })

  it('returns 502 when OpenAI returns unparseable content', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'This is not JSON at all' } }],
    })

    const res = await POST(makeRequest({ query: 'diabetes' }))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.code).toBe('AI_SERVICE_ERROR')
  })

  it('returns 429 when rate limit is exceeded', async () => {
    const suggestions = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(suggestions) } }],
    })

    // Default rate limit for disease-suggest is 10 per minute
    for (let i = 0; i < 10; i++) {
      const res = await POST(makeRequest({ query: 'diabetes' }))
      expect(res.status).toBe(200)
    }

    // 11th request should be rate limited
    const res = await POST(makeRequest({ query: 'diabetes' }))
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.code).toBe('RATE_LIMIT_EXCEEDED')
    expect(json.retryable).toBe(true)
  })

  it('passes correct parameters to OpenAI', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '["A","B","C","D","E","F","G","H"]' } }],
    })

    await POST(makeRequest({ query: 'cirrhosis' }))

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o',
        max_tokens: 500,
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('cirrhosis'),
          }),
        ]),
      })
    )
  })
})
