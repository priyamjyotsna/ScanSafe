import { describe, it, expect } from 'vitest'
import { addFoodItem, removeFoodItem } from './dietPlan'
import type { DietPlan } from '@/types/diet'

const basePlan: DietPlan = {
  avoid: ['High-sodium foods', 'Raw shellfish'],
  prefer: ['Soft-cooked vegetables', 'BCAA-rich foods'],
  watch: ['Daily sodium < 1500mg', 'Fluid restriction'],
  nutrients: { Sodium: '< 300mg/serving', Protein: '1.0-1.5g per kg/day' },
}

describe('addFoodItem', () => {
  it('appends an item to the avoid category', () => {
    const result = addFoodItem(basePlan, 'avoid', 'Alcohol')
    expect(result.avoid).toEqual([...basePlan.avoid, 'Alcohol'])
  })

  it('appends an item to the prefer category', () => {
    const result = addFoodItem(basePlan, 'prefer', 'Oatmeal')
    expect(result.prefer).toEqual([...basePlan.prefer, 'Oatmeal'])
  })

  it('appends an item to the watch category', () => {
    const result = addFoodItem(basePlan, 'watch', 'Potassium intake')
    expect(result.watch).toEqual([...basePlan.watch, 'Potassium intake'])
  })

  it('does not mutate the original plan', () => {
    const originalAvoid = [...basePlan.avoid]
    addFoodItem(basePlan, 'avoid', 'Alcohol')
    expect(basePlan.avoid).toEqual(originalAvoid)
  })

  it('preserves other categories unchanged', () => {
    const result = addFoodItem(basePlan, 'avoid', 'Alcohol')
    expect(result.prefer).toEqual(basePlan.prefer)
    expect(result.watch).toEqual(basePlan.watch)
    expect(result.nutrients).toEqual(basePlan.nutrients)
  })

  it('returns a new object reference', () => {
    const result = addFoodItem(basePlan, 'avoid', 'Alcohol')
    expect(result).not.toBe(basePlan)
    expect(result.avoid).not.toBe(basePlan.avoid)
  })
})

describe('removeFoodItem', () => {
  it('removes an item from the avoid category', () => {
    const result = removeFoodItem(basePlan, 'avoid', 'Raw shellfish')
    expect(result.avoid).toEqual(['High-sodium foods'])
  })

  it('removes an item from the prefer category', () => {
    const result = removeFoodItem(basePlan, 'prefer', 'BCAA-rich foods')
    expect(result.prefer).toEqual(['Soft-cooked vegetables'])
  })

  it('removes an item from the watch category', () => {
    const result = removeFoodItem(basePlan, 'watch', 'Fluid restriction')
    expect(result.watch).toEqual(['Daily sodium < 1500mg'])
  })

  it('does not mutate the original plan', () => {
    const originalAvoid = [...basePlan.avoid]
    removeFoodItem(basePlan, 'avoid', 'Raw shellfish')
    expect(basePlan.avoid).toEqual(originalAvoid)
  })

  it('preserves other categories unchanged', () => {
    const result = removeFoodItem(basePlan, 'avoid', 'Raw shellfish')
    expect(result.prefer).toEqual(basePlan.prefer)
    expect(result.watch).toEqual(basePlan.watch)
    expect(result.nutrients).toEqual(basePlan.nutrients)
  })

  it('returns the same plan if item is not found', () => {
    const result = removeFoodItem(basePlan, 'avoid', 'Nonexistent item')
    expect(result).toBe(basePlan)
  })

  it('removes only the first occurrence of a duplicate item', () => {
    const planWithDupes: DietPlan = {
      ...basePlan,
      avoid: ['Salt', 'Sugar', 'Salt'],
    }
    const result = removeFoodItem(planWithDupes, 'avoid', 'Salt')
    expect(result.avoid).toEqual(['Sugar', 'Salt'])
  })

  it('returns a new object reference when item is removed', () => {
    const result = removeFoodItem(basePlan, 'avoid', 'Raw shellfish')
    expect(result).not.toBe(basePlan)
    expect(result.avoid).not.toBe(basePlan.avoid)
  })
})
