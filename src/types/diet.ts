export interface DietPlan {
  avoid: string[]
  prefer: string[]
  watch: string[]
  nutrients: Record<string, string>
}

export type VerdictType = 'SAFE' | 'CAUTION' | 'AVOID'

export interface FoodVerdict {
  verdict: VerdictType
  reason: string
  flaggedNutrients: string[]
  safeAlternative?: string
}
