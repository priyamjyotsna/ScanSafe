import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchWithRetry, createApiError } from './fetchWithRetry'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Speed up tests by eliminating real delays
vi.mock('timers', () => ({}))
beforeEach(() => {
  vi.useFakeTimers()
  mockFetch.mockReset()
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function advanceRetryTimers() {
  // Flush all pending timers (exponential backoff delays)
  return vi.runAllTimersAsync()
}

describe('fetchWithRetry', () => {
  it('returns response on successful first attempt', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: 'ok' }))

    const promise = fetchWithRetry('/api/test')
    await advanceRetryTimers()
    const res = await promise

    expect(res.ok).toBe(true)
    expect(await res.json()).toEqual({ data: 'ok' })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('retries on 500 then succeeds', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({ error: 'Server error', code: 'SERVER_ERROR', retryable: true }, 500)
      )
      .mockResolvedValueOnce(jsonResponse({ data: 'ok' }))

    const promise = fetchWithRetry('/api/test', undefined, { maxAttempts: 3, baseDelayMs: 100 })
    await advanceRetryTimers()
    const res = await promise

    expect(res.ok).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('retries on network error then succeeds', async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ data: 'ok' }))

    const promise = fetchWithRetry('/api/test', undefined, { maxAttempts: 3, baseDelayMs: 100 })
    await advanceRetryTimers()
    const res = await promise

    expect(res.ok).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('gives up after max retries on persistent server errors', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({ error: 'err', code: 'ERR', retryable: true }, 500)
      )
      .mockResolvedValueOnce(
        jsonResponse({ error: 'err', code: 'ERR', retryable: true }, 500)
      )
      .mockResolvedValueOnce(
        jsonResponse({ error: 'err', code: 'ERR', retryable: true }, 500)
      )

    const promise = fetchWithRetry('/api/test', undefined, { maxAttempts: 3, baseDelayMs: 100 })
    await advanceRetryTimers()
    const res = await promise

    // Returns the last failed response after exhausting retries
    expect(res.status).toBe(500)
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('throws after max retries on persistent network errors', async () => {
    mockFetch.mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')))

    const promise = fetchWithRetry('/api/test', undefined, { maxAttempts: 3, baseDelayMs: 100 })

    // Catch the promise early to prevent unhandled rejection warnings
    const resultPromise = promise.catch((e: Error) => e)
    await advanceRetryTimers()

    const result = await resultPromise
    expect(result).toBeInstanceOf(TypeError)
    expect((result as TypeError).message).toBe('Failed to fetch')
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('does not retry on 400 errors', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: 'Bad request', code: 'VALIDATION_ERROR', retryable: false }, 400)
    )

    const promise = fetchWithRetry('/api/test', undefined, { maxAttempts: 3, baseDelayMs: 100 })
    await advanceRetryTimers()
    const res = await promise

    expect(res.status).toBe(400)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('retries on 429 with retryable: true', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({ error: 'Rate limited', code: 'RATE_LIMIT_EXCEEDED', retryable: true }, 429)
      )
      .mockResolvedValueOnce(jsonResponse({ data: 'ok' }))

    const promise = fetchWithRetry('/api/test', undefined, { maxAttempts: 3, baseDelayMs: 100 })
    await advanceRetryTimers()
    const res = await promise

    expect(res.ok).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('does not retry when retryable: false even on 5xx-like scenarios', async () => {
    // Edge case: server returns retryable: false explicitly
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: 'Permanent failure', code: 'PERMANENT', retryable: false }, 503)
    )

    const promise = fetchWithRetry('/api/test', undefined, { maxAttempts: 3, baseDelayMs: 100 })
    await advanceRetryTimers()
    const res = await promise

    expect(res.status).toBe(503)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('uses exponential backoff delays', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({ error: 'err', code: 'ERR', retryable: true }, 500)
      )
      .mockResolvedValueOnce(
        jsonResponse({ error: 'err', code: 'ERR', retryable: true }, 500)
      )
      .mockResolvedValueOnce(jsonResponse({ data: 'ok' }))

    const promise = fetchWithRetry('/api/test', undefined, { maxAttempts: 3, baseDelayMs: 1000 })

    // After first failure, delay should be 1000ms (1000 * 2^0)
    await vi.advanceTimersByTimeAsync(999)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    // Second attempt fires
    expect(mockFetch).toHaveBeenCalledTimes(2)

    // After second failure, delay should be 2000ms (1000 * 2^1)
    await vi.advanceTimersByTimeAsync(1999)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(mockFetch).toHaveBeenCalledTimes(3)

    const res = await promise
    expect(res.ok).toBe(true)
  })

  it('passes through fetch init options', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: 'ok' }))

    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
    }

    const promise = fetchWithRetry('/api/test', init)
    await advanceRetryTimers()
    await promise

    expect(mockFetch).toHaveBeenCalledWith('/api/test', init)
  })
})

describe('createApiError', () => {
  it('creates a NextResponse with correct body and status', async () => {
    const response = createApiError('Something went wrong', 'AI_SERVICE_ERROR', true, 502)

    expect(response.status).toBe(502)
    const body = await response.json()
    expect(body).toEqual({
      error: 'Something went wrong',
      code: 'AI_SERVICE_ERROR',
      retryable: true,
    })
  })

  it('creates non-retryable error response', async () => {
    const response = createApiError('Invalid input', 'VALIDATION_ERROR', false, 400)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toEqual({
      error: 'Invalid input',
      code: 'VALIDATION_ERROR',
      retryable: false,
    })
  })
})
