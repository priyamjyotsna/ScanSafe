'use client'

import { useState, useEffect, useCallback } from 'react'
import { STORAGE_KEY_GUEST_SCANS } from '@/lib/constants'

export function useScanCount() {
  const [count, setCount] = useState<number>(0)

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY_GUEST_SCANS)
    setCount(stored ? parseInt(stored, 10) || 0 : 0)
  }, [])

  const increment = useCallback(() => {
    setCount((prev) => {
      const next = prev + 1
      localStorage.setItem(STORAGE_KEY_GUEST_SCANS, String(next))
      return next
    })
  }, [])

  const shouldShowSoftPrompt = count === 1
  const shouldShowHardGate = count >= 2

  return { count, shouldShowSoftPrompt, shouldShowHardGate, increment }
}
