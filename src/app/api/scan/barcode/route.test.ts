import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { _resetStore } from '@/lib/rate-limiter'

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}))

// Mock lookupBarcode
const mockLookupBarcode = vi.fn()
vi.mock('@/utils/openFoodFacts', () => ({
  lookupBarcode: (...args: unknown[]) => mockLookupBarcode(...args),
}))

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/scan/barcode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/scan/barcode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetStore()
  })

  it('returns 400 when barcode is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when barcode is empty string', async () => {
    const res = await POST(makeRequest({ barcode: '' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when barcode is not a string', async () => {
    const res = await POST(makeRequest({ barcode: 12345 }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost:3000/api/scan/barcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns found product for valid barcode', async () => {
    const mockProduct = {
      name: 'Maggi Noodles',
      brand: 'Nestlé',
      ingredients: ['Wheat flour', 'Salt'],
      nutrients: {
        sodium: 0.87,
        sugar: 1.875,
        carbohydrates: 45,
        fat: 7.5,
        protein: 6,
        fiber: 1.5,
        saturatedFat: 3,
        transFat: 0,
      },
      servingSize: '75g',
    }

    mockLookupBarcode.mockResolvedValue(mockProduct)

    const res = await POST(makeRequest({ barcode: '8901058852429' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.found).toBe(true)
    expect(json.product).toEqual(mockProduct)
  })

  it('returns found: false when product not in database', async () => {
    mockLookupBarcode.mockResolvedValue(null)

    const res = await POST(makeRequest({ barcode: '0000000000000' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.found).toBe(false)
    expect(json.product).toBeUndefined()
  })

  it('returns 502 on network error from Open Food Facts', async () => {
    mockLookupBarcode.mockRejectedValue(new Error('Network error'))

    const res = await POST(makeRequest({ barcode: '123' }))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.code).toBe('AI_SERVICE_ERROR')
    expect(json.retryable).toBe(true)
  })

  it('returns 504 on timeout error', async () => {
    const timeoutError = new DOMException('The operation was aborted.', 'TimeoutError')
    mockLookupBarcode.mockRejectedValue(timeoutError)

    const res = await POST(makeRequest({ barcode: '123' }))
    expect(res.status).toBe(504)
    const json = await res.json()
    expect(json.code).toBe('PRODUCT_LOOKUP_TIMEOUT')
    expect(json.retryable).toBe(true)
  })

  it('trims barcode whitespace before lookup', async () => {
    mockLookupBarcode.mockResolvedValue(null)

    await POST(makeRequest({ barcode: '  8901058852429  ' }))

    expect(mockLookupBarcode).toHaveBeenCalledWith('8901058852429')
  })

  it('returns 429 when rate limit is exceeded', async () => {
    mockLookupBarcode.mockResolvedValue(null)

    // Default verdict rate limit is 20 per minute
    for (let i = 0; i < 20; i++) {
      const res = await POST(makeRequest({ barcode: '123' }))
      expect(res.status).toBe(200)
    }

    // 21st request should be rate limited
    const res = await POST(makeRequest({ barcode: '123' }))
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.code).toBe('RATE_LIMIT_EXCEEDED')
    expect(json.retryable).toBe(true)
  })
})
