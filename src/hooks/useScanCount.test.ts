import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useScanCount } from './useScanCount'
import { STORAGE_KEY_GUEST_SCANS } from '@/lib/constants'

describe('useScanCount', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initializes with count 0 when localStorage is empty', () => {
    const { result } = renderHook(() => useScanCount())
    expect(result.current.count).toBe(0)
    expect(result.current.shouldShowSoftPrompt).toBe(false)
    expect(result.current.shouldShowHardGate).toBe(false)
  })

  it('hydrates count from localStorage', () => {
    localStorage.setItem(STORAGE_KEY_GUEST_SCANS, '1')
    const { result } = renderHook(() => useScanCount())
    expect(result.current.count).toBe(1)
  })

  it('shows no prompt when count is 0', () => {
    const { result } = renderHook(() => useScanCount())
    expect(result.current.shouldShowSoftPrompt).toBe(false)
    expect(result.current.shouldShowHardGate).toBe(false)
  })

  it('shows soft prompt when count is 1', () => {
    localStorage.setItem(STORAGE_KEY_GUEST_SCANS, '1')
    const { result } = renderHook(() => useScanCount())
    expect(result.current.shouldShowSoftPrompt).toBe(true)
    expect(result.current.shouldShowHardGate).toBe(false)
  })

  it('shows hard gate when count is 2', () => {
    localStorage.setItem(STORAGE_KEY_GUEST_SCANS, '2')
    const { result } = renderHook(() => useScanCount())
    expect(result.current.shouldShowSoftPrompt).toBe(false)
    expect(result.current.shouldShowHardGate).toBe(true)
  })

  it('shows hard gate when count is greater than 2', () => {
    localStorage.setItem(STORAGE_KEY_GUEST_SCANS, '5')
    const { result } = renderHook(() => useScanCount())
    expect(result.current.shouldShowSoftPrompt).toBe(false)
    expect(result.current.shouldShowHardGate).toBe(true)
  })

  it('increment increases count and persists to localStorage', () => {
    const { result } = renderHook(() => useScanCount())
    act(() => result.current.increment())
    expect(result.current.count).toBe(1)
    expect(localStorage.getItem(STORAGE_KEY_GUEST_SCANS)).toBe('1')

    act(() => result.current.increment())
    expect(result.current.count).toBe(2)
    expect(localStorage.getItem(STORAGE_KEY_GUEST_SCANS)).toBe('2')
  })

  it('transitions from no prompt → soft prompt → hard gate on increments', () => {
    const { result } = renderHook(() => useScanCount())

    // count=0: no prompts
    expect(result.current.shouldShowSoftPrompt).toBe(false)
    expect(result.current.shouldShowHardGate).toBe(false)

    // count=1: soft prompt
    act(() => result.current.increment())
    expect(result.current.shouldShowSoftPrompt).toBe(true)
    expect(result.current.shouldShowHardGate).toBe(false)

    // count=2: hard gate
    act(() => result.current.increment())
    expect(result.current.shouldShowSoftPrompt).toBe(false)
    expect(result.current.shouldShowHardGate).toBe(true)
  })
})
