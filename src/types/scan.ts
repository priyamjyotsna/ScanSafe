import type { FoodVerdict } from './diet'

export interface NutrientMap {
  sodium: number
  sugar: number
  carbohydrates: number
  fat: number
  protein: number
  fiber: number
  saturatedFat: number
  transFat: number
}

export interface ProductData {
  name: string
  brand: string
  ingredients: string[]
  nutrients: NutrientMap
  servingSize: string
}

export type ScanMethodType = 'BARCODE' | 'INGREDIENT_OCR'

export interface ScanResult {
  productName?: string
  brand?: string
  barcode?: string
  scanMethod: ScanMethodType
  verdict: FoodVerdict
}
