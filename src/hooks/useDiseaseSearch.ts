'use client'

import { useState, useRef, useCallback } from 'react'
import { DEBOUNCE_MS, MIN_DISEASE_QUERY_LENGTH } from '@/lib/constants'
import type { DiseaseSuggestResponse, ApiErrorResponse } from '@/types/api'

export interface UseDiseaseSearchReturn {
  suggestions: string[]
  loading: boolean
  error: string | null
  search: (query: string) => void
}

export function useDiseaseSearch(): UseDiseaseSearchReturn {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const search = useCallback((query: string) => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Clear results if query is too short
    if (!query || query.trim().length < MIN_DISEASE_QUERY_LENGTH) {
      setSuggestions([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const res = await fetch('/api/disease/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: query.trim() }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const errorData: ApiErrorResponse = await res.json()
          setError(errorData.error || 'Failed to fetch suggestions')
          setSuggestions([])
          setLoading(false)
          return
        }

        const data: DiseaseSuggestResponse = await res.json()
        setSuggestions(data.suggestions)
        setError(null)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Request was aborted — don't update state
          return
        }
        setError('Network error. Please try again.')
        setSuggestions([])
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }, DEBOUNCE_MS)
  }, [])

  return { suggestions, loading, error, search }
}
