import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PUT } from './route'

// Mock auth
const mockAuth = vi.fn()
vi.mock('@/lib/auth', () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}))

// Mock prisma
const mockFindUnique = vi.fn()
const mockUpdate = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    userProfile: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
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

const mockProfile = {
  id: 'profile-1',
  userId: 'user-1',
  diseaseName: 'Type 2 Diabetes',
  dietPlan: validDietPlan,
  isCustomized: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function makePutRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/user/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/user/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const res = await GET()
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('UNAUTHORIZED')
    expect(json.retryable).toBe(false)
  })

  it('returns 401 when session has no user id', async () => {
    mockAuth.mockResolvedValue({ user: {} })

    const res = await GET()
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('UNAUTHORIZED')
  })

  it('returns 404 when profile does not exist', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFindUnique.mockResolvedValue(null)

    const res = await GET()
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.code).toBe('NOT_FOUND')
    expect(json.retryable).toBe(false)
  })

  it('returns user profile data on success', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFindUnique.mockResolvedValue(mockProfile)

    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.diseaseName).toBe('Type 2 Diabetes')
    expect(json.dietPlan).toEqual(validDietPlan)
    expect(json.isCustomized).toBe(false)
  })

  it('queries by userId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-42' } })
    mockFindUnique.mockResolvedValue(null)

    await GET()
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { userId: 'user-42' } })
  })

  it('returns 500 on database error', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFindUnique.mockRejectedValue(new Error('Connection refused'))

    const res = await GET()
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.code).toBe('DATABASE_ERROR')
    expect(json.retryable).toBe(true)
  })
})

describe('PUT /api/user/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const res = await PUT(makePutRequest({ dietPlan: validDietPlan, isCustomized: true }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('UNAUTHORIZED')
  })

  it('returns 401 when session has no user id', async () => {
    mockAuth.mockResolvedValue({ user: {} })

    const res = await PUT(makePutRequest({ dietPlan: validDietPlan, isCustomized: true }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('UNAUTHORIZED')
  })

  it('returns 400 for invalid JSON body', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const req = new Request('http://localhost:3000/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    const res = await PUT(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when dietPlan is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const res = await PUT(makePutRequest({ isCustomized: true }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
    expect(json.error).toContain('diet plan')
  })

  it('returns 400 when dietPlan has invalid structure', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const res = await PUT(makePutRequest({
      dietPlan: { avoid: 'not-an-array' },
      isCustomized: true,
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when isCustomized is not a boolean', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const res = await PUT(makePutRequest({
      dietPlan: validDietPlan,
      isCustomized: 'yes',
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
    expect(json.error).toContain('isCustomized')
  })

  it('returns 404 when profile does not exist', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFindUnique.mockResolvedValue(null)

    const res = await PUT(makePutRequest({ dietPlan: validDietPlan, isCustomized: true }))
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.code).toBe('NOT_FOUND')
  })

  it('updates diet plan and isCustomized on success', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFindUnique.mockResolvedValue(mockProfile)
    mockUpdate.mockResolvedValue({})

    const updatedPlan = {
      ...validDietPlan,
      avoid: [...validDietPlan.avoid, 'Processed sugar'],
    }

    const res = await PUT(makePutRequest({ dietPlan: updatedPlan, isCustomized: true }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: {
        dietPlan: updatedPlan,
        isCustomized: true,
      },
    })
  })

  it('returns 500 on database error during findUnique', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFindUnique.mockRejectedValue(new Error('Connection refused'))

    const res = await PUT(makePutRequest({ dietPlan: validDietPlan, isCustomized: true }))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.code).toBe('DATABASE_ERROR')
    expect(json.retryable).toBe(true)
  })

  it('returns 500 on database error during update', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFindUnique.mockResolvedValue(mockProfile)
    mockUpdate.mockRejectedValue(new Error('Connection refused'))

    const res = await PUT(makePutRequest({ dietPlan: validDietPlan, isCustomized: true }))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.code).toBe('DATABASE_ERROR')
    expect(json.retryable).toBe(true)
  })
})
