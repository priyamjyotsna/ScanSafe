import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useGuestState } from './useGuestState'
import {
  STORAGE_KEY_DISEASE,
  STORAGE_KEY_DIET_PLAN,
  STORAGE_KEY_GUEST_SCANS,
  STORAGE_KEY_MIGRATION_PENDING,
} from '@/lib/constants'
import type { DietPlan } from '@/types/diet'

describe('useGuestState', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initializes with null/0 defaults when localStorage is empty', () => {
    const { result } = renderHook(() => useGuestState())
    expect(result.current.disease).toBeNull()
    expect(result.current.dietPlan).toBeNull()
    expect(result.current.scanCount).toBe(0)
  })

  it('hydrates disease from localStorage', () => {
    localStorage.setItem(STORAGE_KEY_DISEASE, 'Type 2 Diabetes')
    const { result } = renderHook(() => useGuestState())
    expect(result.current.disease).toBe('Type 2 Diabetes')
  })

  it('hydrates dietPlan from localStorage', () => {
    const plan: DietPlan = {
      avoid: ['Sugar'],
      prefer: ['Vegetables'],
      watch: ['Carbs'],
      nutrients: { Sugar: '< 25g/day' },
    }
    localStorage.setItem(STORAGE_KEY_DIET_PLAN, JSON.stringify(plan))
    const { result } = renderHook(() => useGuestState())
    expect(result.current.dietPlan).toEqual(plan)
  })

  it('hydrates scanCount from localStorage', () => {
    localStorage.setItem(STORAGE_KEY_GUEST_SCANS, '3')
    const { result } = renderHook(() => useGuestState())
    expect(result.current.scanCount).toBe(3)
  })

  it('handles corrupted dietPlan JSON gracefully', () => {
    localStorage.setItem(STORAGE_KEY_DIET_PLAN, 'not-json')
    const { result } = renderHook(() => useGuestState())
    expect(result.current.dietPlan).toBeNull()
  })

  it('setDisease persists to localStorage and updates state', () => {
    const { result } = renderHook(() => useGuestState())
    act(() => result.current.setDisease('Cirrhosis'))
    expect(result.current.disease).toBe('Cirrhosis')
    expect(localStorage.getItem(STORAGE_KEY_DISEASE)).toBe('Cirrhosis')
  })

  it('setDietPlan persists JSON to localStorage and updates state', () => {
    const plan: DietPlan = {
      avoid: ['Salt'],
      prefer: ['Fruits'],
      watch: ['Sodium'],
      nutrients: { Sodium: '< 1500mg/day' },
    }
    const { result } = renderHook(() => useGuestState())
    act(() => result.current.setDietPlan(plan))
    expect(result.current.dietPlan).toEqual(plan)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY_DIET_PLAN)!)).toEqual(plan)
  })

  it('incrementScan increments count and persists', () => {
    const { result } = renderHook(() => useGuestState())
    act(() => result.current.incrementScan())
    expect(result.current.scanCount).toBe(1)
    expect(localStorage.getItem(STORAGE_KEY_GUEST_SCANS)).toBe('1')

    act(() => result.current.incrementScan())
    expect(result.current.scanCount).toBe(2)
    expect(localStorage.getItem(STORAGE_KEY_GUEST_SCANS)).toBe('2')
  })

  it('clearAll removes all dietscan keys and resets state', () => {
    localStorage.setItem(STORAGE_KEY_DISEASE, 'Diabetes')
    localStorage.setItem(STORAGE_KEY_DIET_PLAN, '{}')
    localStorage.setItem(STORAGE_KEY_GUEST_SCANS, '5')
    localStorage.setItem(STORAGE_KEY_MIGRATION_PENDING, 'true')

    const { result } = renderHook(() => useGuestState())
    act(() => result.current.clearAll())

    expect(result.current.disease).toBeNull()
    expect(result.current.dietPlan).toBeNull()
    expect(result.current.scanCount).toBe(0)
    expect(localStorage.getItem(STORAGE_KEY_DISEASE)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY_DIET_PLAN)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY_GUEST_SCANS)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY_MIGRATION_PENDING)).toBeNull()
  })
})
