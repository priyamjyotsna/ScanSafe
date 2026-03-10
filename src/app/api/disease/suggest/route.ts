import { NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import {
  MIN_DISEASE_QUERY_LENGTH,
  MAX_TOKENS_DISEASE_SUGGEST,
  DISEASE_SUGGESTION_COUNT,
} from '@/lib/constants'
import { checkRateLimit, getRateLimit, getClientIdentifier } from '@/lib/rate-limiter'
import { auth } from '@/lib/auth'
import type { DiseaseSuggestRequest, DiseaseSuggestResponse, ApiErrorResponse } from '@/types/api'

export async function POST(request: Request) {
  // Get session for user ID (rate limiting key)
  const session = await auth()
  const userId = session?.user?.id

  // Rate limit check
  const clientId = getClientIdentifier(request, userId)
  const limit = getRateLimit('disease-suggest')
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
  let body: DiseaseSuggestRequest
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

  const { query } = body

  if (!query || typeof query !== 'string' || query.trim().length < MIN_DISEASE_QUERY_LENGTH) {
    const errorResponse: ApiErrorResponse = {
      error: `Query must be at least ${MIN_DISEASE_QUERY_LENGTH} characters.`,
      code: 'VALIDATION_ERROR',
      retryable: false,
    }
    return NextResponse.json(errorResponse, { status: 400 })
  }

  // Call OpenAI GPT-4o
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: MAX_TOKENS_DISEASE_SUGGEST,
      messages: [
        {
          role: 'user',
          content: `The user is typing a medical condition: '${query.trim()}'. Return exactly ${DISEASE_SUGGESTION_COUNT} clinically specific disease variants or subtypes that are meaningful for dietary management. Each variant should be specific enough that a dietitian would give different nutritional advice for each. Consider stage, severity, complications, and etiology. Return only a JSON array of strings, no explanation.`,
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

    // Parse the JSON array from the response
    let suggestions: string[]
    try {
      const parsed = JSON.parse(content)
      if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
        throw new Error('Response is not a string array')
      }
      suggestions = parsed
    } catch {
      // Try extracting JSON array from markdown code blocks
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
            suggestions = parsed
          } else {
            throw new Error('Extracted content is not a string array')
          }
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

    const response: DiseaseSuggestResponse = { suggestions }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Disease suggest OpenAI error:', error)
    const errorResponse: ApiErrorResponse = {
      error: 'Something went wrong. Tap to retry.',
      code: 'AI_SERVICE_ERROR',
      retryable: true,
    }
    return NextResponse.json(errorResponse, { status: 502 })
  }
}
