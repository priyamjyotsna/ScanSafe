'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DietPlan } from '@/types/diet'
import {
  STORAGE_KEY_DISEASE,
  STORAGE_KEY_DIET_PLAN,
  STORAGE_KEY_GUEST_SCANS,
  STORAGE_KEY_MIGRATION_PENDING,
  STORAGE_KEY_RECENT_DISEASES,
  MAX_RECENT_DISEASES,
} from '@/lib/constants'

export function useGuestState() {
  const [disease, setDiseaseState] = useState<string | null>(null)
  const [dietPlan, setDietPlanState] = useState<DietPlan | null>(null)
  const [scanCount, setScanCountState] = useState<number>(0)
  const [recentDiseases, setRecentDiseasesState] = useState<string[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    const storedDisease = localStorage.getItem(STORAGE_KEY_DISEASE)
    setDiseaseState(storedDisease)

    const storedPlan = localStorage.getItem(STORAGE_KEY_DIET_PLAN)
    if (storedPlan) {
      try {
        setDietPlanState(JSON.parse(storedPlan) as DietPlan)
      } catch {
        // Corrupted data — ignore
      }
    }

    const storedScans = localStorage.getItem(STORAGE_KEY_GUEST_SCANS)
    setScanCountState(storedScans ? parseInt(storedScans, 10) || 0 : 0)

    const storedRecent = localStorage.getItem(STORAGE_KEY_RECENT_DISEASES)
    if (storedRecent) {
      try {
        setRecentDiseasesState(JSON.parse(storedRecent) as string[])
      } catch {
        // ignore
      }
    }

    setIsHydrated(true)
  }, [])

  const setDisease = useCallback((name: string) => {
    localStorage.setItem(STORAGE_KEY_DISEASE, name)
    setDiseaseState(name)

    // Update recent diseases list (deduplicated, most recent first, max 5)
    setRecentDiseasesState((prev) => {
      const updated = [name, ...prev.filter((d) => d.toLowerCase() !== name.toLowerCase())].slice(0, MAX_RECENT_DISEASES)
      localStorage.setItem(STORAGE_KEY_RECENT_DISEASES, JSON.stringify(updated))
      return updated
    })
  }, [])

  const setDietPlan = useCallback((plan: DietPlan) => {
    localStorage.setItem(STORAGE_KEY_DIET_PLAN, JSON.stringify(plan))
    setDietPlanState(plan)
  }, [])

  const incrementScan = useCallback(() => {
    setScanCountState((prev) => {
      const next = prev + 1
      localStorage.setItem(STORAGE_KEY_GUEST_SCANS, String(next))
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_DISEASE)
    localStorage.removeItem(STORAGE_KEY_DIET_PLAN)
    localStorage.removeItem(STORAGE_KEY_GUEST_SCANS)
    localStorage.removeItem(STORAGE_KEY_MIGRATION_PENDING)
    setDiseaseState(null)
    setDietPlanState(null)
    setScanCountState(0)
  }, [])

  return { disease, dietPlan, scanCount, recentDiseases, isHydrated, setDisease, setDietPlan, incrementScan, clearAll }
}
