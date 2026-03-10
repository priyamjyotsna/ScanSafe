import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDiseaseSearch } from './useDiseaseSearch'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useDiseaseSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useDiseaseSearch())
    expect(result.current.suggestions).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(typeof result.current.search).toBe('function')
  })

  it('does not fetch for queries shorter than MIN_DISEASE_QUERY_LENGTH', () => {
    const { result } = renderHook(() => useDiseaseSearch())
    act(() => result.current.search('a'))
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.current.loading).toBe(false)
  })

  it('sets loading to true when search is called with valid query', () => {
    const { result } = renderHook(() => useDiseaseSearch())
    act(() => result.current.search('diabetes'))
    expect(result.current.loading).toBe(true)
  })

  it('fetches suggestions after debounce delay', async () => {
    const suggestions = ['Type 1 Diabetes', 'Type 2 Diabetes']
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ suggestions }),
    })

    const { result } = renderHook(() => useDiseaseSearch())

    act(() => result.current.search('diabetes'))

    // Before debounce fires
    expect(mockFetch).not.toHaveBeenCalled()

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/disease/suggest', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ query: 'diabetes' }),
    }))
    expect(result.current.suggestions).toEqual(suggestions)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('handles API error responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Rate limited', code: 'RATE_LIMIT_EXCEEDED', retryable: true }),
    })

    const { result } = renderHook(() => useDiseaseSearch())

    act(() => result.current.search('diabetes'))

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(result.current.error).toBe('Rate limited')
    expect(result.current.suggestions).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const { result } = renderHook(() => useDiseaseSearch())

    act(() => result.current.search('diabetes'))

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(result.current.error).toBe('Network error. Please try again.')
    expect(result.current.suggestions).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('clears suggestions when query becomes too short', async () => {
    const suggestions = ['Type 1 Diabetes']
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ suggestions }),
    })

    const { result } = renderHook(() => useDiseaseSearch())

    act(() => result.current.search('diabetes'))
    await act(async () => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current.suggestions).toEqual(suggestions)

    // Now search with short query
    act(() => result.current.search('d'))
    expect(result.current.suggestions).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('debounces rapid calls and only fires the last one', async () => {
    const suggestions = ['Cirrhosis variant']
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ suggestions }),
    })

    const { result } = renderHook(() => useDiseaseSearch())

    act(() => result.current.search('di'))
    act(() => {
      vi.advanceTimersByTime(100)
    })
    act(() => result.current.search('dia'))
    act(() => {
      vi.advanceTimersByTime(100)
    })
    act(() => result.current.search('diab'))

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    // Only one fetch call should have been made (the last one)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith('/api/disease/suggest', expect.objectContaining({
      body: JSON.stringify({ query: 'diab' }),
    }))
  })
})
