import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { UserProfileResponse, UserDiseaseEntry, ScanHistoryEntry, UserProfileUpdateRequest, ApiErrorResponse } from '@/types/api'
import type { DietPlan } from '@/types/diet'

export async function GET() {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.', code: 'UNAUTHORIZED', retryable: false }, { status: 401 })
  }

  try {
    const [diseases, scanHistory] = await Promise.all([
      prisma.userDisease.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.scanHistory.findMany({
        where: { userId },
        orderBy: { scannedAt: 'desc' },
        take: 30,
      }),
    ])

    // Fall back to legacy UserProfile if no UserDisease rows yet
    let activeDisease = diseases.find((d: typeof diseases[0]) => d.isActive)
    if (!activeDisease && diseases.length > 0) activeDisease = diseases[0]

    if (!activeDisease) {
      const legacy = await prisma.userProfile.findUnique({ where: { userId } })
      if (!legacy) {
        return NextResponse.json({ error: 'User profile not found.', code: 'NOT_FOUND', retryable: false }, { status: 404 })
      }
      const response: UserProfileResponse = {
        diseaseName: legacy.diseaseName,
        dietPlan: legacy.dietPlan as unknown as DietPlan,
        isCustomized: legacy.isCustomized,
        diseases: [{
          id: legacy.id,
          diseaseName: legacy.diseaseName,
          dietPlan: legacy.dietPlan as unknown as DietPlan,
          isCustomized: legacy.isCustomized,
          isActive: true,
          createdAt: legacy.createdAt.toISOString(),
        }],
        scanHistory: [],
      }
      return NextResponse.json(response)
    }

    const response: UserProfileResponse = {
      diseaseName: activeDisease.diseaseName,
      dietPlan: activeDisease.dietPlan as unknown as DietPlan,
      isCustomized: activeDisease.isCustomized,
      diseases: diseases.map((d: typeof diseases[0]): UserDiseaseEntry => ({
        id: d.id,
        diseaseName: d.diseaseName,
        dietPlan: d.dietPlan as unknown as DietPlan,
        isCustomized: d.isCustomized,
        isActive: d.isActive,
        createdAt: d.createdAt.toISOString(),
      })),
      scanHistory: scanHistory.map((s: typeof scanHistory[0]): ScanHistoryEntry => ({
        id: s.id,
        productName: s.productName,
        brand: s.brand,
        scanMethod: s.scanMethod as 'BARCODE' | 'INGREDIENT_OCR',
        verdict: s.verdict as 'SAFE' | 'CAUTION' | 'AVOID',
        verdictDetail: s.verdictDetail as { reason?: string; flaggedNutrients?: string[] } | null,
        scannedAt: s.scannedAt.toISOString(),
      })),
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('User profile GET error:', error)
    return NextResponse.json({ error: 'Something went wrong.', code: 'DATABASE_ERROR', retryable: true }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    const errorResponse: ApiErrorResponse = {
      error: 'Authentication required.',
      code: 'UNAUTHORIZED',
      retryable: false,
    }
    return NextResponse.json(errorResponse, { status: 401 })
  }

  let body: UserProfileUpdateRequest
  try {
    body = await request.json()
  } catch {
    const errorResponse: ApiErrorResponse = {
      error: 'Invalid request body.',
      code: 'VALIDATION_ERROR',
      retryable: false,
    }
    return NextResponse.json(errorResponse, { status: 400 })
  }

  const { dietPlan, isCustomized } = body

  // Validate dietPlan structure
  try {
    validateDietPlan(dietPlan)
  } catch {
    const errorResponse: ApiErrorResponse = {
      error: 'Invalid diet plan structure.',
      code: 'VALIDATION_ERROR',
      retryable: false,
    }
    return NextResponse.json(errorResponse, { status: 400 })
  }

  // Validate isCustomized
  if (typeof isCustomized !== 'boolean') {
    const errorResponse: ApiErrorResponse = {
      error: 'isCustomized must be a boolean.',
      code: 'VALIDATION_ERROR',
      retryable: false,
    }
    return NextResponse.json(errorResponse, { status: 400 })
  }

  try {
    const existing = await prisma.userProfile.findUnique({
      where: { userId },
    })

    if (!existing) {
      const errorResponse: ApiErrorResponse = {
        error: 'User profile not found.',
        code: 'NOT_FOUND',
        retryable: false,
      }
      return NextResponse.json(errorResponse, { status: 404 })
    }

    await prisma.userProfile.update({
      where: { userId },
      data: {
        dietPlan: dietPlan as never,
        isCustomized,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('User profile PUT database error:', error)
    const errorResponse: ApiErrorResponse = {
      error: 'Something went wrong. Tap to retry.',
      code: 'DATABASE_ERROR',
      retryable: true,
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

/**
 * Validate that a value conforms to the DietPlan structure.
 * Throws if the structure is invalid.
 */
function validateDietPlan(plan: unknown): asserts plan is DietPlan {
  if (!plan || typeof plan !== 'object') {
    throw new Error('Diet plan is not an object')
  }

  const obj = plan as Record<string, unknown>

  if (!Array.isArray(obj.avoid) || !obj.avoid.every((item: unknown) => typeof item === 'string')) {
    throw new Error('Invalid avoid field')
  }
  if (!Array.isArray(obj.prefer) || !obj.prefer.every((item: unknown) => typeof item === 'string')) {
    throw new Error('Invalid prefer field')
  }
  if (!Array.isArray(obj.watch) || !obj.watch.every((item: unknown) => typeof item === 'string')) {
    throw new Error('Invalid watch field')
  }
  if (
    !obj.nutrients ||
    typeof obj.nutrients !== 'object' ||
    Array.isArray(obj.nutrients) ||
    !Object.values(obj.nutrients as Record<string, unknown>).every((v) => typeof v === 'string')
  ) {
    throw new Error('Invalid nutrients field')
  }
}
