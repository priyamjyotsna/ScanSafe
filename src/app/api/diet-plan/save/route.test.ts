import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'

// Mock auth
const mockAuth = vi.fn()
vi.mock('@/lib/auth', () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}))

// Mock prisma
const mockUpsert = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    userProfile: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}))

const validDietPlan = {
  avoid: ['High-sodium foods', 'Alcohol'],
  prefer: ['Fresh vegetables', 'Lean protein'],
  watch: ['Daily sodium intake', 'Fluid restriction'],
  nutrients: {
    Sodium: '< 300mg/serving',
    Protein: '1.0-1.5g per kg/day',
  },
}

const validBody = {
  diseaseName: 'Type 2 Diabetes',
  dietPlan: validDietPlan,
  isCustomized: false,
}

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/diet-plan/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/diet-plan/save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('UNAUTHORIZED')
    expect(json.retryable).toBe(false)
  })

  it('returns 401 when session has no user id', async () => {
    mockAuth.mockResolvedValue({ user: {} })

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('UNAUTHORIZED')
  })

  it('returns 400 for invalid JSON body', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const req = new Request('http://localhost:3000/api/diet-plan/save', {
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
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const res = await POST(makeRequest({ dietPlan: validDietPlan, isCustomized: false }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
    expect(json.error).toContain('Disease name')
  })

  it('returns 400 when diseaseName is empty', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const res = await POST(makeRequest({ ...validBody, diseaseName: '' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when diseaseName is whitespace only', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const res = await POST(makeRequest({ ...validBody, diseaseName: '   ' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when dietPlan is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const res = await POST(makeRequest({ diseaseName: 'Diabetes', isCustomized: false }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
    expect(json.error).toContain('diet plan')
  })

  it('returns 400 when dietPlan has invalid structure', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const res = await POST(makeRequest({
      diseaseName: 'Diabetes',
      dietPlan: { avoid: 'not-an-array' },
      isCustomized: false,
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when isCustomized is not a boolean', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const res = await POST(makeRequest({
      diseaseName: 'Diabetes',
      dietPlan: validDietPlan,
      isCustomized: 'yes',
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
    expect(json.error).toContain('isCustomized')
  })

  it('successfully saves a diet plan with upsert', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUpsert.mockResolvedValue({})

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)

    expect(mockUpsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      update: {
        diseaseName: 'Type 2 Diabetes',
        dietPlan: validDietPlan,
        isCustomized: false,
      },
      create: {
        userId: 'user-1',
        diseaseName: 'Type 2 Diabetes',
        dietPlan: validDietPlan,
        isCustomized: false,
      },
    })
  })

  it('trims diseaseName before saving', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUpsert.mockResolvedValue({})

    const res = await POST(makeRequest({ ...validBody, diseaseName: '  Diabetes  ' }))
    expect(res.status).toBe(200)

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ diseaseName: 'Diabetes' }),
        update: expect.objectContaining({ diseaseName: 'Diabetes' }),
      })
    )
  })

  it('saves with isCustomized true', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUpsert.mockResolvedValue({})

    const res = await POST(makeRequest({ ...validBody, isCustomized: true }))
    expect(res.status).toBe(200)

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ isCustomized: true }),
        update: expect.objectContaining({ isCustomized: true }),
      })
    )
  })

  it('returns 500 when database throws an error', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUpsert.mockRejectedValue(new Error('Connection refused'))

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.code).toBe('DATABASE_ERROR')
    expect(json.retryable).toBe(true)
  })
})
