import { NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { MAX_TOKENS_VERDICT } from '@/lib/constants'
import { checkRateLimit, getRateLimit, getClientIdentifier } from '@/lib/rate-limiter'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { VerdictRequest, VerdictResponse, ApiErrorResponse } from '@/types/api'
import type { DietPlan } from '@/types/diet'
import type { NutrientMap } from '@/types/scan'

function isValidDietPlan(plan: unknown): plan is DietPlan {
  if (!plan || typeof plan !== 'object') return false
  const p = plan as Record<string, unknown>
  return (
    Array.isArray(p.avoid) &&
    Array.isArray(p.prefer) &&
    Array.isArray(p.watch) &&
    p.nutrients !== null &&
    typeof p.nutrients === 'object' &&
    !Array.isArray(p.nutrients)
  )
}

function isValidProduct(
  product: unknown
): product is { name: string; ingredients: string[]; nutrients: NutrientMap } {
  if (!product || typeof product !== 'object') return false
  const p = product as Record<string, unknown>
  return (
    typeof p.name === 'string' &&
    p.name.trim().length > 0 &&
    Array.isArray(p.ingredients) &&
    p.nutrients !== null &&
    typeof p.nutrients === 'object' &&
    !Array.isArray(p.nutrients)
  )
}

export async function POST(
  request: Request
): Promise<NextResponse<VerdictResponse | ApiErrorResponse>> {
  // Get session for user ID (rate limiting + history save)
  const session = await auth()
  const userId = session?.user?.id

  // Rate limit check
  const clientId = getClientIdentifier(request, userId)
  const limit = getRateLimit('verdict')
  const { allowed, retryAfterMs } = checkRateLimit(`verdict:${clientId}`, limit)

  if (!allowed) {
    return NextResponse.json(
      {
        error: "You've made too many requests. Please wait.",
        code: 'RATE_LIMIT_EXCEEDED',
        retryable: true,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((retryAfterMs ?? 60000) / 1000)),
        },
      }
    )
  }

  // Parse request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid request body.',
        code: 'VALIDATION_ERROR',
        retryable: false,
      },
      { status: 400 }
    )
  }

  const { diseaseName, dietPlan, product } = body as Partial<VerdictRequest>

  // Validate diseaseName
  if (!diseaseName || typeof diseaseName !== 'string' || diseaseName.trim().length === 0) {
    return NextResponse.json(
      {
        error: 'diseaseName is required and must be a non-empty string.',
        code: 'VALIDATION_ERROR',
        retryable: false,
      },
      { status: 400 }
    )
  }

  // Validate dietPlan
  if (!isValidDietPlan(dietPlan)) {
    return NextResponse.json(
      {
        error: 'dietPlan is required and must contain avoid, prefer, watch arrays and nutrients object.',
        code: 'VALIDATION_ERROR',
        retryable: false,
      },
      { status: 400 }
    )
  }

  // Validate product
  if (!isValidProduct(product)) {
    return NextResponse.json(
      {
        error: 'product is required and must contain name (string), ingredients (array), and nutrients (object).',
        code: 'VALIDATION_ERROR',
        retryable: false,
      },
      { status: 400 }
    )
  }

  // Call OpenAI GPT-4o for verdict analysis
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: MAX_TOKENS_VERDICT,
      messages: [
        {
          role: 'user',
          content: `You are a clinical dietitian. A patient has ${diseaseName.trim()}. Their diet rules are:
- Foods to avoid: ${dietPlan.avoid.join(', ')}
- Recommended foods: ${dietPlan.prefer.join(', ')}
- Things to watch: ${dietPlan.watch.join(', ')}
- Nutrient targets: ${Object.entries(dietPlan.nutrients).map(([k, v]) => `${k}: ${v}`).join(', ')}

Analyze this food product:
- Name: ${product.name}
- Ingredients: ${product.ingredients.join(', ')}
- Nutrients: ${Object.entries(product.nutrients).map(([k, v]) => `${k}: ${v}`).join(', ')}

Return a JSON object with:
- verdict: "SAFE", "CAUTION", or "AVOID"
- reason: 2-3 sentences specific to their condition and this product
- flaggedNutrients: array of nutrient names that are problematic (empty array if none)
- safeAlternative: one practical suggestion if verdict is CAUTION or AVOID (omit if SAFE)`,
        },
      ],
    })

    const content = completion.choices[0]?.message?.content?.trim()

    if (!content) {
      return NextResponse.json(
        {
          error: 'AI service returned an empty response.',
          code: 'AI_SERVICE_ERROR',
          retryable: true,
        },
        { status: 502 }
      )
    }

    // Parse the JSON response
    let parsed: VerdictResponse
    try {
      parsed = JSON.parse(content)
    } catch {
      // Try extracting JSON from markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch {
          return NextResponse.json(
            {
              error: 'Failed to parse AI verdict response.',
              code: 'AI_PARSE_ERROR',
              retryable: true,
            },
            { status: 422 }
          )
        }
      } else {
        return NextResponse.json(
          {
            error: 'Failed to parse AI verdict response.',
            code: 'AI_PARSE_ERROR',
            retryable: true,
          },
          { status: 422 }
        )
      }
    }

    // Validate parsed verdict structure
    const validVerdicts = ['SAFE', 'CAUTION', 'AVOID']
    if (
      !parsed ||
      !validVerdicts.includes(parsed.verdict) ||
      typeof parsed.reason !== 'string' ||
      !Array.isArray(parsed.flaggedNutrients)
    ) {
      return NextResponse.json(
        {
          error: 'Failed to parse AI verdict response.',
          code: 'AI_PARSE_ERROR',
          retryable: true,
        },
        { status: 422 }
      )
    }

    const verdictResponse: VerdictResponse = {
      verdict: parsed.verdict,
      reason: parsed.reason,
      flaggedNutrients: parsed.flaggedNutrients.filter(
        (n): n is string => typeof n === 'string'
      ),
      ...(parsed.safeAlternative ? { safeAlternative: parsed.safeAlternative } : {}),
    }

    // Save to ScanHistory for authenticated users
    if (userId) {
      try {
        await prisma.scanHistory.create({
          data: {
            userId,
            productName: product.name,
            scanMethod: 'BARCODE',
            verdict: verdictResponse.verdict,
            verdictDetail: {
              reason: verdictResponse.reason,
              flaggedNutrients: verdictResponse.flaggedNutrients,
              safeAlternative: verdictResponse.safeAlternative,
              ingredients: product.ingredients,
            },
          },
        })
      } catch (error) {
        // Log but don't fail the request — verdict is more important than history
        console.error('Failed to save scan history:', error)
      }
    }

    return NextResponse.json(verdictResponse)
  } catch (error) {
    console.error('Verdict OpenAI error:', error)
    return NextResponse.json(
      {
        error: 'Something went wrong. Tap to retry.',
        code: 'AI_SERVICE_ERROR',
        retryable: true,
      },
      { status: 502 }
    )
  }
}
