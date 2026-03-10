'use client'

import { useEffect, useRef } from 'react'
import {
  STORAGE_KEY_DISEASE,
  STORAGE_KEY_DIET_PLAN,
  STORAGE_KEY_GUEST_SCANS,
  STORAGE_KEY_MIGRATION_PENDING,
} from '@/lib/constants'
import type { DietPlan } from '@/types/diet'

/**
 * Validates that a parsed value conforms to the DietPlan shape.
 * Returns true if valid, false otherwise.
 */
export function isValidDietPlan(value: unknown): value is DietPlan {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>

  if (!Array.isArray(obj.avoid) || !obj.avoid.every((i: unknown) => typeof i === 'string')) return false
  if (!Array.isArray(obj.prefer) || !obj.prefer.every((i: unknown) => typeof i === 'string')) return false
  if (!Array.isArray(obj.watch) || !obj.watch.every((i: unknown) => typeof i === 'string')) return false
  if (
    !obj.nutrients ||
    typeof obj.nutrients !== 'object' ||
    Array.isArray(obj.nutrients) ||
    !Object.values(obj.nutrients as Record<string, unknown>).every((v) => typeof v === 'string')
  ) {
    return false
  }

  return true
}

/**
 * Reads and validates migration data from localStorage.
 * Returns null if no valid data is available.
 */
export function readMigrationData(): { disease: string; dietPlan: DietPlan } | null {
  try {
    const disease = localStorage.getItem(STORAGE_KEY_DISEASE)
    if (!disease || disease.trim().length === 0) return null

    const dietPlanRaw = localStorage.getItem(STORAGE_KEY_DIET_PLAN)
    if (!dietPlanRaw) return null

    let dietPlan: unknown
    try {
      dietPlan = JSON.parse(dietPlanRaw)
    } catch {
      return null
    }

    if (!isValidDietPlan(dietPlan)) return null

    return { disease: disease.trim(), dietPlan }
  } catch {
    return null
  }
}

/**
 * Clears all dietscan_* keys from localStorage.
 */
export function clearMigrationData(): void {
  localStorage.removeItem(STORAGE_KEY_DISEASE)
  localStorage.removeItem(STORAGE_KEY_DIET_PLAN)
  localStorage.removeItem(STORAGE_KEY_GUEST_SCANS)
  localStorage.removeItem(STORAGE_KEY_MIGRATION_PENDING)
}

/**
 * Attempts the actual migration: checks if user has a profile, and if not, saves localStorage data.
 * Returns true on success (or skip), false on failure.
 */
export async function attemptMigration(data: { disease: string; dietPlan: DietPlan }): Promise<boolean> {
  // Step 1: Check if user already has a profile
  const profileRes = await fetch('/api/user/profile')
  if (profileRes.ok) {
    // User already has a profile — skip migration, don't overwrite
    return true
  }

  // Only proceed if 404 (no profile). Any other error means we can't determine state.
  if (profileRes.status !== 404) {
    return false
  }

  // Step 2: Save the localStorage data to the database
  const saveRes = await fetch('/api/diet-plan/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      diseaseName: data.disease,
      dietPlan: data.dietPlan,
      isCustomized: false,
    }),
  })

  return saveRes.ok
}

/**
 * Custom hook that runs localStorage-to-database migration on authenticated page loads.
 *
 * @param isAuthenticated - Whether the user is currently authenticated
 */
export function useMigration(isAuthenticated: boolean): void {
  const migrationAttempted = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || migrationAttempted.current) return

    const hasPendingFlag = localStorage.getItem(STORAGE_KEY_MIGRATION_PENDING) === 'true'
    const data = readMigrationData()

    // Nothing to migrate and no pending flag
    if (!data && !hasPendingFlag) return

    // If pending flag is set but no valid data, clear the flag and bail
    if (!data && hasPendingFlag) {
      localStorage.removeItem(STORAGE_KEY_MIGRATION_PENDING)
      return
    }

    migrationAttempted.current = true

    attemptMigration(data!)
      .then((success) => {
        if (success) {
          clearMigrationData()
        } else {
          localStorage.setItem(STORAGE_KEY_MIGRATION_PENDING, 'true')
        }
      })
      .catch(() => {
        localStorage.setItem(STORAGE_KEY_MIGRATION_PENDING, 'true')
      })
  }, [isAuthenticated])
}
