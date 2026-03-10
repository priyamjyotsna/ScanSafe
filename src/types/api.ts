import type { DietPlan } from './diet'
import type { NutrientMap, ProductData } from './scan'

// POST /api/disease/suggest
export interface DiseaseSuggestRequest {
  query: string
}

export interface DiseaseSuggestResponse {
  suggestions: string[]
}

// POST /api/diet-plan/generate
export interface DietPlanGenerateRequest {
  diseaseName: string
}

export interface DietPlanGenerateResponse {
  dietPlan: DietPlan
}

// POST /api/diet-plan/save
export interface DietPlanSaveRequest {
  diseaseName: string
  dietPlan: DietPlan
  isCustomized: boolean
}

export interface DietPlanSaveResponse {
  success: boolean
}

// POST /api/scan/barcode
export interface BarcodeLookupRequest {
  barcode: string
}

export interface BarcodeLookupResponse {
  found: boolean
  product?: ProductData
}

// POST /api/scan/ingredients
export interface IngredientOCRRequest {
  imageBase64: string
}

export interface IngredientOCRResponse {
  ingredients: string[]
  rawText: string
}

// POST /api/scan/verdict
export interface VerdictRequest {
  diseaseName: string
  dietPlan: DietPlan
  product: {
    name: string
    ingredients: string[]
    nutrients: NutrientMap
  }
}

export interface VerdictResponse {
  verdict: 'SAFE' | 'CAUTION' | 'AVOID'
  reason: string
  flaggedNutrients: string[]
  safeAlternative?: string
}

// GET /api/user/profile
export interface UserDiseaseEntry {
  id: string
  diseaseName: string
  dietPlan: DietPlan
  isCustomized: boolean
  isActive: boolean
  createdAt: string
}

export interface ScanHistoryEntry {
  id: string
  productName: string | null
  brand: string | null
  scanMethod: 'BARCODE' | 'INGREDIENT_OCR'
  verdict: 'SAFE' | 'CAUTION' | 'AVOID'
  verdictDetail: { reason?: string; flaggedNutrients?: string[] } | null
  scannedAt: string
}

export interface UserProfileResponse {
  diseaseName: string
  dietPlan: DietPlan
  isCustomized: boolean
  diseases: UserDiseaseEntry[]
  scanHistory: ScanHistoryEntry[]
}

// PUT /api/user/profile
export interface UserProfileUpdateRequest {
  dietPlan: DietPlan
  isCustomized: boolean
}

// Error response
export interface ApiErrorResponse {
  error: string
  code: string
  retryable: boolean
}
