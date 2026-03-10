import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isValidDietPlan,
  readMigrationData,
  clearMigrationData,
  attemptMigration,
  useMigration,
} from './useMigration'
import {
  STORAGE_KEY_DISEASE,
  STORAGE_KEY_DIET_PLAN,
  STORAGE_KEY_GUEST_SCANS,
  STORAGE_KEY_MIGRATION_PENDING,
} from '@/lib/constants'
import type { DietPlan } from '@/types/diet'

const validPlan: DietPlan = {
  avoid: ['Sugar', 'Salt'],
  prefer: ['Vegetables', 'Fruits'],
  watch: ['Carbs'],
  nutrients: { Sodium: '< 1500mg/day' },
}

describe('isValidDietPlan', () => {
  it('returns true for a valid DietPlan', () => {
    expect(isValidDietPlan(validPlan)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isValidDietPlan(null)).toBe(false)
  })

  it('returns false for a string', () => {
    expect(isValidDietPlan('not a plan')).toBe(false)
  })

  it('returns false when avoid is missing', () => {
    expect(isValidDietPlan({ prefer: [], watch: [], nutrients: {} })).toBe(false)
  })

  it('returns false when avoid contains non-strings', () => {
    expect(isValidDietPlan({ ...validPlan, avoid: [123] })).toBe(false)
  })

  it('returns false when nutrients is an array', () => {
    expect(isValidDietPlan({ ...validPlan, nutrients: [] })).toBe(false)
  })

  it('returns false when nutrients values are not strings', () => {
    expect(isValidDietPlan({ ...validPlan, nutrients: { Sodium: 100 } })).toBe(false)
  })
})

describe('readMigrationData', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when no disease in localStorage', () => {
    expect(readMigrationData()).toBeNull()
  })

  it('returns null when disease is empty string', () => {
    localStorage.setItem(STORAGE_KEY_DISEASE, '')
    expect(readMigrationData()).toBeNull()
  })

  it('returns null when no diet plan in localStorage', () => {
    localStorage.setItem(STORAGE_KEY_DISEASE, 'Diabetes')
    expect(readMigrationData()).toBeNull()
  })

  it('returns null when diet plan is invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY_DISEASE, 'Diabetes')
    localStorage.setItem(STORAGE_KEY_DIET_PLAN, 'not-json{{{')
    expect(readMigrationData()).toBeNull()
  })

  it('returns null when diet plan has invalid structure', () => {
    localStorage.setItem(STORAGE_KEY_DISEASE, 'Diabetes')
    localStorage.setItem(STORAGE_KEY_DIET_PLAN, JSON.stringify({ foo: 'bar' }))
    expect(readMigrationData()).toBeNull()
  })

  it('returns valid migration data', () => {
    localStorage.setItem(STORAGE_KEY_DISEASE, 'Diabetes')
    localStorage.setItem(STORAGE_KEY_DIET_PLAN, JSON.stringify(validPlan))
    const result = readMigrationData()
    expect(result).toEqual({ disease: 'Diabetes', dietPlan: validPlan })
  })

  it('trims disease name', () => {
    localStorage.setItem(STORAGE_KEY_DISEASE, '  Diabetes  ')
    localStorage.setItem(STORAGE_KEY_DIET_PLAN, JSON.stringify(validPlan))
    const result = readMigrationData()
    expect(result?.disease).toBe('Diabetes')
  })
})

describe('clearMigrationData', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('removes all dietscan_* keys from localStorage', () => {
    localStorage.setItem(STORAGE_KEY_DISEASE, 'Diabetes')
    localStorage.setItem(STORAGE_KEY_DIET_PLAN, JSON.stringify(validPlan))
    localStorage.setItem(STORAGE_KEY_GUEST_SCANS, '3')
    localStorage.setItem(STORAGE_KEY_MIGRATION_PENDING, 'true')

    clearMigrationData()

    expect(localStorage.getItem(STORAGE_KEY_DISEASE)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY_DIET_PLAN)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY_GUEST_SCANS)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY_MIGRATION_PENDING)).toBeNull()
  })
})

describe('attemptMigration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('skips migration when user already has a profile (200)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ diseaseName: 'Existing', dietPlan: validPlan, isCustomized: false }), {
        status: 200,
      })
    )

    const result = await attemptMigration({ disease: 'Diabetes', dietPlan: validPlan })
    expect(result).toBe(true)
    // Should only call profile check, not save
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/api/user/profile')
  })

  it('saves data when user has no profile (404)', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))

    const result = await attemptMigration({ disease: 'Diabetes', dietPlan: validPlan })
    expect(result).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/diet-plan/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        diseaseName: 'Diabetes',
        dietPlan: validPlan,
        isCustomized: false,
      }),
    })
  })

  it('returns false when profile check returns unexpected error (500)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
    )

    const result = await attemptMigration({ disease: 'Diabetes', dietPlan: validPlan })
    expect(result).toBe(false)
  })

  it('returns false when save fails', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'DB error' }), { status: 500 }))

    const result = await attemptMigration({ disease: 'Diabetes', dietPlan: validPlan })
    expect(result).toBe(false)
  })
})

describe('useMigration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('does nothing when user is not authenticated', () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
    renderHook(() => useMigration(false))
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does nothing when no localStorage data exists', () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
    renderHook(() => useMigration(true))
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('migrates data when authenticated and localStorage has valid data', async () => {
    localStorage.setItem(STORAGE_KEY_DISEASE, 'Diabetes')
    localStorage.setItem(STORAGE_KEY_DIET_PLAN, JSON.stringify(validPlan))

    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))

    renderHook(() => useMigration(true))

    // Wait for async migration to complete
    await vi.waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY_DISEASE)).toBeNull()
    })

    expect(localStorage.getItem(STORAGE_KEY_DIET_PLAN)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY_GUEST_SCANS)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY_MIGRATION_PENDING)).toBeNull()
  })

  it('skips migration when user already has a profile', async () => {
    localStorage.setItem(STORAGE_KEY_DISEASE, 'Diabetes')
    localStorage.setItem(STORAGE_KEY_DIET_PLAN, JSON.stringify(validPlan))

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ diseaseName: 'Existing', dietPlan: validPlan, isCustomized: false }), {
        status: 200,
      })
    )

    renderHook(() => useMigration(true))

    // Wait for async migration to complete — localStorage should still be cleared
    // because migration "succeeded" (profile already exists = success)
    await vi.waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY_DISEASE)).toBeNull()
    })
  })

  it('sets migration_pending flag on failure', async () => {
    localStorage.setItem(STORAGE_KEY_DISEASE, 'Diabetes')
    localStorage.setItem(STORAGE_KEY_DIET_PLAN, JSON.stringify(validPlan))

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
    )

    renderHook(() => useMigration(true))

    await vi.waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY_MIGRATION_PENDING)).toBe('true')
    })

    // Original data should still be in localStorage
    expect(localStorage.getItem(STORAGE_KEY_DISEASE)).toBe('Diabetes')
  })

  it('retries migration when migration_pending flag is set', async () => {
    localStorage.setItem(STORAGE_KEY_DISEASE, 'Diabetes')
    localStorage.setItem(STORAGE_KEY_DIET_PLAN, JSON.stringify(validPlan))
    localStorage.setItem(STORAGE_KEY_MIGRATION_PENDING, 'true')

    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))

    renderHook(() => useMigration(true))

    await vi.waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY_DISEASE)).toBeNull()
    })

    expect(localStorage.getItem(STORAGE_KEY_MIGRATION_PENDING)).toBeNull()
  })

  it('clears pending flag when no valid data exists but flag is set', () => {
    localStorage.setItem(STORAGE_KEY_MIGRATION_PENDING, 'true')
    // No disease or diet plan data

    const fetchSpy = vi.spyOn(global, 'fetch')
    renderHook(() => useMigration(true))

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(localStorage.getItem(STORAGE_KEY_MIGRATION_PENDING)).toBeNull()
  })

  it('sets migration_pending on network error', async () => {
    localStorage.setItem(STORAGE_KEY_DISEASE, 'Diabetes')
    localStorage.setItem(STORAGE_KEY_DIET_PLAN, JSON.stringify(validPlan))

    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    renderHook(() => useMigration(true))

    await vi.waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY_MIGRATION_PENDING)).toBe('true')
    })
  })
})
