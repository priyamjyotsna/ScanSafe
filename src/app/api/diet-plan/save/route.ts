import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { DietPlanSaveRequest, DietPlanSaveResponse, ApiErrorResponse } from '@/types/api'
import type { DietPlan } from '@/types/diet'

export async function POST(request: Request) {
  // Require authentication
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

  // Parse and validate request body
  let body: DietPlanSaveRequest
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

  const { diseaseName, dietPlan, isCustomized } = body

  // Validate diseaseName
  if (!diseaseName || typeof diseaseName !== 'string' || diseaseName.trim().length === 0) {
    const errorResponse: ApiErrorResponse = {
      error: 'Disease name is required.',
      code: 'VALIDATION_ERROR',
      retryable: false,
    }
    return NextResponse.json(errorResponse, { status: 400 })
  }

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

  // Upsert UserDisease and set as active in a transaction
  try {
    await prisma.$transaction([
      // Deactivate all other diseases for this user
      prisma.userDisease.updateMany({
        where: { userId },
        data: { isActive: false },
      }),
      // Upsert this disease and mark active
      prisma.userDisease.upsert({
        where: { userId_diseaseName: { userId, diseaseName: diseaseName.trim() } },
        update: {
          dietPlan: dietPlan as unknown as Record<string, unknown>,
          isCustomized,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          userId,
          diseaseName: diseaseName.trim(),
          dietPlan: dietPlan as unknown as Record<string, unknown>,
          isCustomized,
          isActive: true,
        },
      }),
      // Keep UserProfile in sync (legacy)
      prisma.userProfile.upsert({
        where: { userId },
        update: { diseaseName: diseaseName.trim(), dietPlan: dietPlan as unknown as Record<string, unknown>, isCustomized },
        create: { userId, diseaseName: diseaseName.trim(), dietPlan: dietPlan as unknown as Record<string, unknown>, isCustomized },
      }),
    ])

    const response: DietPlanSaveResponse = { success: true }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Diet plan save database error:', error)
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
