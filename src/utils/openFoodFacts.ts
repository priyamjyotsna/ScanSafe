import type { ProductData, NutrientMap } from '@/types/scan'

const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v2/product'

/**
 * Convert a nutrient value from per-100g to per-serving.
 * Returns 0 if valuePer100g is not a finite non-negative number or servingSizeGrams is not a finite positive number.
 */
export function convertNutrientPerServing(
  valuePer100g: number,
  servingSizeGrams: number
): number {
  if (
    !Number.isFinite(valuePer100g) ||
    !Number.isFinite(servingSizeGrams) ||
    valuePer100g < 0 ||
    servingSizeGrams <= 0
  ) {
    return 0
  }
  return (valuePer100g * servingSizeGrams) / 100
}

/**
 * Parse a serving size string (e.g. "75g", "100 g", "1 cup (240ml)") into grams.
 * Returns 100 as default if parsing fails (treats values as per-100g).
 */
export function parseServingSize(servingSize: string | undefined | null): number {
  if (!servingSize) return 100

  // Try to extract a number followed by 'g' (grams)
  const match = servingSize.match(/(\d+(?:\.\d+)?)\s*g/i)
  if (match) {
    const value = parseFloat(match[1])
    return value > 0 ? value : 100
  }

  // Try to extract just a number (assume grams)
  const numMatch = servingSize.match(/(\d+(?:\.\d+)?)/)
  if (numMatch) {
    const value = parseFloat(numMatch[1])
    return value > 0 ? value : 100
  }

  return 100
}

/**
 * Safely extract a numeric nutrient value from the OFF nutriments object.
 * Returns 0 if the field is missing or not a valid number.
 */
function safeNutrient(nutriments: Record<string, unknown>, key: string): number {
  const val = nutriments[key]
  if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
    return val
  }
  return 0
}

/**
 * Map Open Food Facts nutriments object to our NutrientMap interface.
 * Converts per-100g values to per-serving using the product's serving size.
 */
export function mapNutrients(
  nutriments: Record<string, unknown>,
  servingSizeGrams: number
): NutrientMap {
  return {
    sodium: convertNutrientPerServing(
      safeNutrient(nutriments, 'sodium_100g'),
      servingSizeGrams
    ),
    sugar: convertNutrientPerServing(
      safeNutrient(nutriments, 'sugars_100g'),
      servingSizeGrams
    ),
    carbohydrates: convertNutrientPerServing(
      safeNutrient(nutriments, 'carbohydrates_100g'),
      servingSizeGrams
    ),
    fat: convertNutrientPerServing(
      safeNutrient(nutriments, 'fat_100g'),
      servingSizeGrams
    ),
    protein: convertNutrientPerServing(
      safeNutrient(nutriments, 'proteins_100g'),
      servingSizeGrams
    ),
    fiber: convertNutrientPerServing(
      safeNutrient(nutriments, 'fiber_100g'),
      servingSizeGrams
    ),
    saturatedFat: convertNutrientPerServing(
      safeNutrient(nutriments, 'saturated-fat_100g'),
      servingSizeGrams
    ),
    transFat: convertNutrientPerServing(
      safeNutrient(nutriments, 'trans-fat_100g'),
      servingSizeGrams
    ),
  }
}

/**
 * Parse the ingredients text from OFF into an array of ingredient strings.
 * Returns an empty array if the text is missing or empty.
 */
export function parseIngredients(ingredientsText: string | undefined | null): string[] {
  if (!ingredientsText || typeof ingredientsText !== 'string') {
    return []
  }

  return ingredientsText
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/**
 * Look up a barcode in the Open Food Facts API.
 * Returns ProductData if found, or null if not found.
 * Throws on network errors.
 */
export async function lookupBarcode(barcode: string): Promise<ProductData | null> {
  const url = `${OFF_API_BASE}/${encodeURIComponent(barcode)}.json`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'DietScan/1.0 (https://dietscan.app)',
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    throw new Error(`Open Food Facts API returned status ${response.status}`)
  }

  const data = await response.json()

  // OFF returns { status: 0 } when product is not found
  if (!data || data.status === 0 || !data.product) {
    return null
  }

  const product = data.product
  const nutriments = (product.nutriments ?? {}) as Record<string, unknown>
  const servingSizeRaw = product.serving_size as string | undefined
  const servingSizeGrams = parseServingSize(servingSizeRaw)

  return {
    name: (product.product_name as string) || 'Unknown Product',
    brand: (product.brands as string) || 'Unknown Brand',
    ingredients: parseIngredients(product.ingredients_text as string | undefined),
    nutrients: mapNutrients(nutriments, servingSizeGrams),
    servingSize: servingSizeRaw || `${servingSizeGrams}g`,
  }
}
