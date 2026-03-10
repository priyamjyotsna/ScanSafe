import { NextResponse } from 'next/server'
import { lookupBarcode } from '@/utils/openFoodFacts'
import { checkRateLimit, getClientIdentifier, getRateLimit } from '@/lib/rate-limiter'
import { auth } from '@/lib/auth'
import type { BarcodeLookupResponse, ApiErrorResponse } from '@/types/api'

export async function POST(request: Request): Promise<NextResponse<BarcodeLookupResponse | ApiErrorResponse>> {
  // Rate limiting
  const session = await auth()
  const userId = session?.user?.id
  const clientId = getClientIdentifier(request, userId)
  const limit = getRateLimit('verdict') // reuse verdict limit for barcode lookups
  const rateLimitResult = checkRateLimit(`barcode:${clientId}`, limit)

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: "You've made too many requests. Please wait.",
        code: 'RATE_LIMIT_EXCEEDED',
        retryable: true,
      },
      { status: 429 }
    )
  }

  // Parse and validate request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid JSON body',
        code: 'VALIDATION_ERROR',
        retryable: false,
      },
      { status: 400 }
    )
  }

  const { barcode } = body as { barcode?: string }

  if (!barcode || typeof barcode !== 'string' || barcode.trim().length === 0) {
    return NextResponse.json(
      {
        error: 'Barcode is required and must be a non-empty string',
        code: 'VALIDATION_ERROR',
        retryable: false,
      },
      { status: 400 }
    )
  }

  // Look up the barcode
  try {
    const product = await lookupBarcode(barcode.trim())

    if (!product) {
      return NextResponse.json(
        { found: false },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { found: true, product },
      { status: 200 }
    )
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === 'TimeoutError'

    if (isTimeout) {
      return NextResponse.json(
        {
          error: 'Product lookup timed out. Tap to retry.',
          code: 'PRODUCT_LOOKUP_TIMEOUT',
          retryable: true,
        },
        { status: 504 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to look up product. Please try again.',
        code: 'AI_SERVICE_ERROR',
        retryable: true,
      },
      { status: 502 }
    )
  }
}
