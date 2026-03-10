import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  checkRateLimit,
  getRateLimit,
  getClientIdentifier,
  _resetStore,
} from './rate-limiter'

describe('rate-limiter', () => {
  beforeEach(() => {
    _resetStore()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getRateLimit', () => {
    it('returns default values when env vars are not set', () => {
      expect(getRateLimit('disease-suggest')).toBe(10)
      expect(getRateLimit('diet-plan-generate')).toBe(5)
      expect(getRateLimit('ingredient-ocr')).toBe(10)
      expect(getRateLimit('verdict')).toBe(20)
    })

    it('reads from environment variables when set', () => {
      vi.stubEnv('RATE_LIMIT_DISEASE_SUGGEST', '25')
      expect(getRateLimit('disease-suggest')).toBe(25)
    })
  })

  describe('checkRateLimit', () => {
    it('allows requests under the limit', () => {
      const result = checkRateLimit('user:abc', 3)
      expect(result.allowed).toBe(true)
      expect(result.retryAfterMs).toBeUndefined()
    })

    it('blocks the (N+1)th request when limit is N', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('user:abc', 5)
      }
      const result = checkRateLimit('user:abc', 5)
      expect(result.allowed).toBe(false)
      expect(result.retryAfterMs).toBeGreaterThan(0)
    })

    it('uses separate buckets for different keys', () => {
      for (let i = 0; i < 3; i++) {
        checkRateLimit('user:a', 3)
      }
      // user:a is exhausted
      expect(checkRateLimit('user:a', 3).allowed).toBe(false)
      // user:b should still be allowed
      expect(checkRateLimit('user:b', 3).allowed).toBe(true)
    })

    it('allows requests again after the window expires', () => {
      vi.useFakeTimers()

      // Exhaust the limit
      for (let i = 0; i < 2; i++) {
        checkRateLimit('user:abc', 2)
      }
      expect(checkRateLimit('user:abc', 2).allowed).toBe(false)

      // Advance past the default window (60s)
      vi.advanceTimersByTime(60001)

      expect(checkRateLimit('user:abc', 2).allowed).toBe(true)
    })

    it('respects custom window from env', () => {
      vi.useFakeTimers()
      vi.stubEnv('RATE_LIMIT_WINDOW_MS', '5000')

      checkRateLimit('user:abc', 1)
      expect(checkRateLimit('user:abc', 1).allowed).toBe(false)

      // Advance 5001ms (past the 5s window)
      vi.advanceTimersByTime(5001)
      expect(checkRateLimit('user:abc', 1).allowed).toBe(true)
    })

    it('returns retryAfterMs when blocked', () => {
      vi.useFakeTimers()

      checkRateLimit('user:abc', 1)
      const result = checkRateLimit('user:abc', 1)

      expect(result.allowed).toBe(false)
      expect(result.retryAfterMs).toBeDefined()
      expect(result.retryAfterMs!).toBeGreaterThan(0)
      expect(result.retryAfterMs!).toBeLessThanOrEqual(60000)
    })
  })

  describe('getClientIdentifier', () => {
    it('returns user ID when provided', () => {
      const req = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4' },
      })
      expect(getClientIdentifier(req, 'user123')).toBe('user:user123')
    })

    it('extracts IP from x-forwarded-for header', () => {
      const req = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      })
      expect(getClientIdentifier(req)).toBe('ip:1.2.3.4')
    })

    it('extracts IP from x-real-ip header', () => {
      const req = new Request('http://localhost', {
        headers: { 'x-real-ip': '10.0.0.1' },
      })
      expect(getClientIdentifier(req)).toBe('ip:10.0.0.1')
    })

    it('returns unknown fallback when no headers present', () => {
      const req = new Request('http://localhost')
      expect(getClientIdentifier(req)).toBe('ip:unknown')
    })

    it('prefers userId over IP headers', () => {
      const req = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4' },
      })
      expect(getClientIdentifier(req, 'myUser')).toBe('user:myUser')
    })
  })
})
