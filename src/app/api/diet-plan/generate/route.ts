import { NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { MAX_TOKENS_DIET_PLAN } from '@/lib/constants'
import { checkRateLimit, getRateLimit, getClientIdentifier } from '@/lib/rate-limiter'
import { auth } from '@/lib/auth'
import type { DietPlanGenerateRequest, DietPlanGenerateResponse, ApiErrorResponse } from '@/types/api'
import type { DietPlan } from '@/types/diet'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  // Get session for user ID (rate limiting key)
  const session = await auth()
  const userId = session?.user?.id

  // Rate limit check
  const clientId = getClientIdentifier(request, userId)
  const limit = getRateLimit('diet-plan-generate')
  const { allowed, retryAfterMs } = checkRateLimit(clientId, limit)

  if (!allowed) {
    const errorResponse: ApiErrorResponse = {
      error: "You've made too many requests. Please wait.",
      code: 'RATE_LIMIT_EXCEEDED',
      retryable: true,
    }
    return NextResponse.json(errorResponse, {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((retryAfterMs ?? 60000) / 1000)),
      },
    })
  }

  // Parse and validate request body
  let body: DietPlanGenerateRequest
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

  const { diseaseName } = body

  if (!diseaseName || typeof diseaseName !== 'string' || diseaseName.trim().length === 0) {
    const errorResponse: ApiErrorResponse = {
      error: 'Disease name is required.',
      code: 'VALIDATION_ERROR',
      retryable: false,
    }
    return NextResponse.json(errorResponse, { status: 400 })
  }

  // Call OpenAI GPT-4o
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: MAX_TOKENS_DIET_PLAN,
      messages: [
        {
          role: 'user',
          content: `You are a clinical dietitian. A patient has been diagnosed with '${diseaseName.trim()}'. Generate a personalized diet plan. Return a JSON object with exactly these fields: avoid (array of specific foods/food groups to avoid with reasons), prefer (array of recommended foods/food groups), watch (array of dietary guidelines and things to monitor), nutrients (object mapping nutrient names to target limits like '< 300mg/serving'). Each array should have 5-10 items. Return only the JSON object, no explanation.`,
        },
      ],
    })

    const content = completion.choices[0]?.message?.content?.trim()

    if (!content) {
      const errorResponse: ApiErrorResponse = {
        error: 'AI service returned an empty response.',
        code: 'AI_SERVICE_ERROR',
        retryable: true,
      }
      return NextResponse.json(errorResponse, { status: 502 })
    }

    // Parse the JSON object from the response
    let dietPlan: DietPlan
    try {
      const parsed = JSON.parse(content)
      dietPlan = validateDietPlan(parsed)
    } catch {
      // Try extracting JSON object from markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          dietPlan = validateDietPlan(parsed)
        } catch {
          const errorResponse: ApiErrorResponse = {
            error: 'Failed to parse AI response.',
            code: 'AI_SERVICE_ERROR',
            retryable: true,
          }
          return NextResponse.json(errorResponse, { status: 502 })
        }
      } else {
        const errorResponse: ApiErrorResponse = {
          error: 'Failed to parse AI response.',
          code: 'AI_SERVICE_ERROR',
          retryable: true,
        }
        return NextResponse.json(errorResponse, { status: 502 })
      }
    }

    const response: DietPlanGenerateResponse = { dietPlan }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Diet plan generate OpenAI error:', error)
    const errorResponse: ApiErrorResponse = {
      error: 'Something went wrong. Tap to retry.',
      code: 'AI_SERVICE_ERROR',
      retryable: true,
    }
    return NextResponse.json(errorResponse, { status: 502 })
  }
}

/**
 * Validate that a parsed object conforms to the DietPlan structure.
 * Throws if the structure is invalid.
 */
function validateDietPlan(parsed: unknown): DietPlan {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Response is not an object')
  }

  const obj = parsed as Record<string, unknown>

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

  return {
    avoid: obj.avoid as string[],
    prefer: obj.prefer as string[],
    watch: obj.watch as string[],
    nutrients: obj.nutrients as Record<string, string>,
  }
}
