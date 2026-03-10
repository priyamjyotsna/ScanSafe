import { NextResponse } from 'next/server'
import type { ApiErrorResponse } from '@/types/api'

export interface RetryConfig {
  maxAttempts?: number
  baseDelayMs?: number
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Fetch with exponential backoff retry logic.
 *
 * Retries on:
 * - Network errors (fetch throws)
 * - 5xx status codes
 * - Responses with `retryable: true` in the body (e.g. 429)
 *
 * Does NOT retry on:
 * - 4xx errors (unless body has retryable: true)
 * - Responses with `retryable: false`
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  config?: RetryConfig
): Promise<Response> {
  const { maxAttempts, baseDelayMs } = { ...DEFAULT_RETRY_CONFIG, ...config }

  let lastError: Error | undefined
  let lastResponse: Response | undefined

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(input, init)

      // Success — return immediately
      if (response.ok) {
        return response
      }

      // Try to parse the error body to check the retryable field
      const cloned = response.clone()
      let retryable: boolean | undefined
      try {
        const body = await cloned.json() as Partial<ApiErrorResponse>
        retryable = body.retryable
      } catch {
        // Body isn't JSON — fall through to status-based logic
      }

      // Explicit retryable: false — don't retry
      if (retryable === false) {
        return response
      }

      // 5xx or explicitly retryable — retry if attempts remain
      const isServerError = response.status >= 500
      const shouldRetry = isServerError || retryable === true

      if (shouldRetry && attempt < maxAttempts - 1) {
        lastResponse = response
        await delay(baseDelayMs * Math.pow(2, attempt))
        continue
      }

      // 4xx without retryable: true — return as-is
      return response
    } catch (error) {
      // Network error — retry if attempts remain
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < maxAttempts - 1) {
        await delay(baseDelayMs * Math.pow(2, attempt))
        continue
      }
    }
  }

  // All attempts exhausted
  if (lastError) {
    throw lastError
  }

  // Should always have a response if we didn't throw
  return lastResponse!
}

/**
 * Helper to create a consistent API error response for Next.js API routes.
 */
export function createApiError(
  error: string,
  code: string,
  retryable: boolean,
  status: number
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ error, code, retryable }, { status })
}
