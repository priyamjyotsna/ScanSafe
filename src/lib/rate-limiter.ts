import {
  DEFAULT_RATE_LIMIT_DISEASE_SUGGEST,
  DEFAULT_RATE_LIMIT_DIET_PLAN_GENERATE,
  DEFAULT_RATE_LIMIT_INGREDIENT_OCR,
  DEFAULT_RATE_LIMIT_VERDICT,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
} from './constants'

// In-memory store: key → array of request timestamps
const store = new Map<string, number[]>()

/**
 * Get the rate limit window size in milliseconds from env or default.
 */
function getWindowMs(): number {
  const envVal = process.env.RATE_LIMIT_WINDOW_MS
  return envVal ? parseInt(envVal, 10) : DEFAULT_RATE_LIMIT_WINDOW_MS
}

/**
 * Get the configured rate limit for a specific endpoint.
 * Reads from environment variables, falling back to constants.
 */
export function getRateLimit(
  endpoint: 'disease-suggest' | 'diet-plan-generate' | 'ingredient-ocr' | 'verdict'
): number {
  const envMap: Record<string, { env: string; fallback: number }> = {
    'disease-suggest': {
      env: 'RATE_LIMIT_DISEASE_SUGGEST',
      fallback: DEFAULT_RATE_LIMIT_DISEASE_SUGGEST,
    },
    'diet-plan-generate': {
      env: 'RATE_LIMIT_DIET_PLAN_GENERATE',
      fallback: DEFAULT_RATE_LIMIT_DIET_PLAN_GENERATE,
    },
    'ingredient-ocr': {
      env: 'RATE_LIMIT_INGREDIENT_OCR',
      fallback: DEFAULT_RATE_LIMIT_INGREDIENT_OCR,
    },
    verdict: {
      env: 'RATE_LIMIT_VERDICT',
      fallback: DEFAULT_RATE_LIMIT_VERDICT,
    },
  }

  const config = envMap[endpoint]
  const envVal = process.env[config.env]
  return envVal ? parseInt(envVal, 10) : config.fallback
}

/**
 * Check if a request is allowed under the sliding window rate limit.
 *
 * Sliding window algorithm:
 * 1. Get current timestamp
 * 2. Look up the key in the store
 * 3. Filter out timestamps older than the window
 * 4. If remaining count >= limit, deny with retryAfterMs
 * 5. Otherwise, add current timestamp and allow
 */
export function checkRateLimit(
  key: string,
  limit: number
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  const windowMs = getWindowMs()
  const windowStart = now - windowMs

  // Get existing timestamps or empty array
  const timestamps = store.get(key) ?? []

  // Filter out expired timestamps (outside the sliding window)
  const activeTimestamps = timestamps.filter((ts) => ts > windowStart)

  if (activeTimestamps.length >= limit) {
    // Find when the oldest active request will expire
    const oldestActive = activeTimestamps[0]
    const retryAfterMs = oldestActive + windowMs - now

    // Update store with cleaned timestamps
    store.set(key, activeTimestamps)

    return { allowed: false, retryAfterMs }
  }

  // Add current request timestamp
  activeTimestamps.push(now)
  store.set(key, activeTimestamps)

  return { allowed: true }
}

/**
 * Extract a client identifier for rate limiting.
 * Uses user ID if authenticated, otherwise falls back to IP from request headers.
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`
  }

  // Try x-forwarded-for first (common behind proxies/Vercel)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs; take the first (client IP)
    const ip = forwarded.split(',')[0].trim()
    return `ip:${ip}`
  }

  // Try x-real-ip
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return `ip:${realIp}`
  }

  // Fallback for local development / unknown
  return 'ip:unknown'
}

/**
 * Reset the rate limiter store. Useful for testing.
 */
export function _resetStore(): void {
  store.clear()
}
