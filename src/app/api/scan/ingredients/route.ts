import { NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { MAX_TOKENS_INGREDIENT_OCR } from '@/lib/constants'
import { checkRateLimit, getRateLimit, getClientIdentifier } from '@/lib/rate-limiter'
import { auth } from '@/lib/auth'
import type { IngredientOCRResponse, ApiErrorResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<NextResponse<IngredientOCRResponse | ApiErrorResponse>> {
  // Get session for user ID (rate limiting key)
  const session = await auth()
  const userId = session?.user?.id

  // Rate limit check
  const clientId = getClientIdentifier(request, userId)
  const limit = getRateLimit('ingredient-ocr')
  const { allowed, retryAfterMs } = checkRateLimit(`ingredientOcr:${clientId}`, limit)

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

  // Parse and validate request body
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

  const { imageBase64 } = body as { imageBase64?: string }

  if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.trim().length === 0) {
    return NextResponse.json(
      {
        error: 'imageBase64 is required and must be a non-empty string.',
        code: 'VALIDATION_ERROR',
        retryable: false,
      },
      { status: 400 }
    )
  }

  // Call OpenAI GPT-4o Vision to extract ingredients
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: MAX_TOKENS_INGREDIENT_OCR,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract the ingredient list from this food label image. Return a JSON object with two fields: "ingredients" (an array of individual ingredient strings, each trimmed and cleaned) and "rawText" (the raw text exactly as it appears on the label). If you cannot read any ingredients from the image, return {"ingredients": [], "rawText": ""}.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64.trim(),
              },
            },
          ],
        },
      ],
    })

    const content = completion.choices[0]?.message?.content?.trim()

    if (!content) {
      return NextResponse.json(
        {
          error: "Couldn't read the label. Try again with better lighting.",
          code: 'OCR_EXTRACTION_FAILED',
          retryable: true,
        },
        { status: 422 }
      )
    }

    // Parse the JSON response
    let parsed: { ingredients: string[]; rawText: string }
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
              error: "Couldn't read the label. Try again with better lighting.",
              code: 'OCR_EXTRACTION_FAILED',
              retryable: true,
            },
            { status: 422 }
          )
        }
      } else {
        return NextResponse.json(
          {
            error: "Couldn't read the label. Try again with better lighting.",
            code: 'OCR_EXTRACTION_FAILED',
            retryable: true,
          },
          { status: 422 }
        )
      }
    }

    // Validate parsed structure
    if (
      !parsed ||
      !Array.isArray(parsed.ingredients) ||
      typeof parsed.rawText !== 'string'
    ) {
      return NextResponse.json(
        {
          error: "Couldn't read the label. Try again with better lighting.",
          code: 'OCR_EXTRACTION_FAILED',
          retryable: true,
        },
        { status: 422 }
      )
    }

    // Filter out non-string ingredients
    const ingredients = parsed.ingredients.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0
    )

    if (ingredients.length === 0) {
      return NextResponse.json(
        {
          error: "Couldn't read the label. Try again with better lighting.",
          code: 'OCR_EXTRACTION_FAILED',
          retryable: true,
        },
        { status: 422 }
      )
    }

    const response: IngredientOCRResponse = {
      ingredients,
      rawText: parsed.rawText,
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Ingredient OCR OpenAI error:', error)
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
