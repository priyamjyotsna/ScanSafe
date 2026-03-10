import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  convertNutrientPerServing,
  parseServingSize,
  mapNutrients,
  parseIngredients,
  lookupBarcode,
} from './openFoodFacts'

describe('convertNutrientPerServing', () => {
  it('converts per-100g to per-serving correctly', () => {
    // 10g sodium per 100g, serving is 75g → 7.5g
    expect(convertNutrientPerServing(10, 75)).toBe(7.5)
  })

  it('returns the same value when serving is 100g', () => {
    expect(convertNutrientPerServing(5, 100)).toBe(5)
  })

  it('returns 0 for zero valuePer100g', () => {
    expect(convertNutrientPerServing(0, 75)).toBe(0)
  })

  it('returns 0 for negative valuePer100g', () => {
    expect(convertNutrientPerServing(-5, 75)).toBe(0)
  })

  it('returns 0 for zero servingSizeGrams', () => {
    expect(convertNutrientPerServing(10, 0)).toBe(0)
  })

  it('returns 0 for negative servingSizeGrams', () => {
    expect(convertNutrientPerServing(10, -50)).toBe(0)
  })

  it('returns 0 for NaN valuePer100g', () => {
    expect(convertNutrientPerServing(NaN, 75)).toBe(0)
  })

  it('returns 0 for Infinity servingSizeGrams', () => {
    expect(convertNutrientPerServing(10, Infinity)).toBe(0)
  })
})

describe('parseServingSize', () => {
  it('parses "75g" correctly', () => {
    expect(parseServingSize('75g')).toBe(75)
  })

  it('parses "100 g" with space', () => {
    expect(parseServingSize('100 g')).toBe(100)
  })

  it('parses "30.5g" with decimal', () => {
    expect(parseServingSize('30.5g')).toBe(30.5)
  })

  it('parses "1 cup (240g)" extracting grams', () => {
    expect(parseServingSize('1 cup (240g)')).toBe(240)
  })

  it('returns 100 for undefined', () => {
    expect(parseServingSize(undefined)).toBe(100)
  })

  it('returns 100 for null', () => {
    expect(parseServingSize(null)).toBe(100)
  })

  it('returns 100 for empty string', () => {
    expect(parseServingSize('')).toBe(100)
  })

  it('extracts number from string without g suffix', () => {
    expect(parseServingSize('50')).toBe(50)
  })
})

describe('parseIngredients', () => {
  it('splits comma-separated ingredients', () => {
    expect(parseIngredients('Wheat flour, Salt, Sugar')).toEqual([
      'Wheat flour',
      'Salt',
      'Sugar',
    ])
  })

  it('trims whitespace from ingredients', () => {
    expect(parseIngredients('  Flour ,  Salt  ')).toEqual(['Flour', 'Salt'])
  })

  it('filters out empty strings', () => {
    expect(parseIngredients('Flour,,Salt,')).toEqual(['Flour', 'Salt'])
  })

  it('returns empty array for undefined', () => {
    expect(parseIngredients(undefined)).toEqual([])
  })

  it('returns empty array for null', () => {
    expect(parseIngredients(null)).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(parseIngredients('')).toEqual([])
  })
})

describe('mapNutrients', () => {
  it('maps OFF nutriments to NutrientMap with per-serving conversion', () => {
    const nutriments = {
      sodium_100g: 1.16,
      sugars_100g: 2.5,
      carbohydrates_100g: 60,
      fat_100g: 10,
      proteins_100g: 8,
      fiber_100g: 2,
      'saturated-fat_100g': 4,
      'trans-fat_100g': 0.5,
    }

    const result = mapNutrients(nutriments, 75)

    expect(result.sodium).toBeCloseTo(0.87)
    expect(result.sugar).toBeCloseTo(1.875)
    expect(result.carbohydrates).toBeCloseTo(45)
    expect(result.fat).toBeCloseTo(7.5)
    expect(result.protein).toBeCloseTo(6)
    expect(result.fiber).toBeCloseTo(1.5)
    expect(result.saturatedFat).toBeCloseTo(3)
    expect(result.transFat).toBeCloseTo(0.375)
  })

  it('returns zeros for missing nutriments', () => {
    const result = mapNutrients({}, 75)

    expect(result.sodium).toBe(0)
    expect(result.sugar).toBe(0)
    expect(result.carbohydrates).toBe(0)
    expect(result.fat).toBe(0)
    expect(result.protein).toBe(0)
    expect(result.fiber).toBe(0)
    expect(result.saturatedFat).toBe(0)
    expect(result.transFat).toBe(0)
  })

  it('handles non-numeric nutriment values gracefully', () => {
    const nutriments = {
      sodium_100g: 'not a number',
      sugars_100g: null,
      carbohydrates_100g: undefined,
      fat_100g: -5,
    }

    const result = mapNutrients(nutriments as Record<string, unknown>, 75)

    expect(result.sodium).toBe(0)
    expect(result.sugar).toBe(0)
    expect(result.carbohydrates).toBe(0)
    expect(result.fat).toBe(0)
  })
})

describe('lookupBarcode', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns ProductData for a found product', async () => {
    const mockResponse = {
      status: 1,
      product: {
        product_name: 'Maggi Noodles',
        brands: 'Nestlé',
        ingredients_text: 'Wheat flour, Palm oil, Salt',
        serving_size: '75g',
        nutriments: {
          sodium_100g: 1.16,
          sugars_100g: 2.5,
          carbohydrates_100g: 60,
          fat_100g: 10,
          proteins_100g: 8,
          fiber_100g: 2,
          'saturated-fat_100g': 4,
          'trans-fat_100g': 0,
        },
      },
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await lookupBarcode('8901058852429')

    expect(result).not.toBeNull()
    expect(result!.name).toBe('Maggi Noodles')
    expect(result!.brand).toBe('Nestlé')
    expect(result!.ingredients).toEqual(['Wheat flour', 'Palm oil', 'Salt'])
    expect(result!.servingSize).toBe('75g')
    expect(result!.nutrients.sodium).toBeCloseTo(0.87)
    expect(result!.nutrients.carbohydrates).toBeCloseTo(45)
  })

  it('returns null when product is not found (status 0)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 0 }), { status: 200 })
    )

    const result = await lookupBarcode('0000000000000')
    expect(result).toBeNull()
  })

  it('returns null on 404 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404 })
    )

    const result = await lookupBarcode('0000000000000')
    expect(result).toBeNull()
  })

  it('throws on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    await expect(lookupBarcode('123')).rejects.toThrow('Network error')
  })

  it('throws on non-404 HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Server Error', { status: 500 })
    )

    await expect(lookupBarcode('123')).rejects.toThrow(
      'Open Food Facts API returned status 500'
    )
  })

  it('handles missing product fields gracefully', async () => {
    const mockResponse = {
      status: 1,
      product: {
        nutriments: {},
      },
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    )

    const result = await lookupBarcode('123')

    expect(result).not.toBeNull()
    expect(result!.name).toBe('Unknown Product')
    expect(result!.brand).toBe('Unknown Brand')
    expect(result!.ingredients).toEqual([])
    expect(result!.servingSize).toBe('100g')
    expect(result!.nutrients.sodium).toBe(0)
  })
})
