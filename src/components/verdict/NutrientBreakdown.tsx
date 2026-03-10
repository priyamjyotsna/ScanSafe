'use client'

import React from 'react'
import type { NutrientMap } from '@/types/scan'

export interface NutrientBreakdownProps {
  nutrients: NutrientMap
  flaggedNutrients: string[]
}

const nutrientLabels: Record<keyof NutrientMap, { label: string; unit: string }> = {
  sodium: { label: 'Sodium', unit: 'mg' },
  sugar: { label: 'Sugar', unit: 'g' },
  carbohydrates: { label: 'Carbohydrates', unit: 'g' },
  fat: { label: 'Fat', unit: 'g' },
  protein: { label: 'Protein', unit: 'g' },
  fiber: { label: 'Fiber', unit: 'g' },
  saturatedFat: { label: 'Saturated Fat', unit: 'g' },
  transFat: { label: 'Trans Fat', unit: 'g' },
}

export function NutrientBreakdown({ nutrients, flaggedNutrients }: NutrientBreakdownProps) {
  const keys = Object.keys(nutrientLabels) as (keyof NutrientMap)[]

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
      <h3 className="mb-3 text-base font-semibold text-gray-900">Nutrient Breakdown</h3>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {keys.map((key) => {
          const isFlagged = flaggedNutrients.includes(key)
          const { label, unit } = nutrientLabels[key]
          return (
            <div
              key={key}
              className={`rounded-lg p-2.5 ${
                isFlagged
                  ? 'border border-red-300 bg-red-50'
                  : 'border border-gray-100 bg-gray-50'
              }`}
              data-testid={`nutrient-${key}`}
            >
              <p
                className={`text-xs font-medium ${
                  isFlagged ? 'text-red-700' : 'text-gray-500'
                }`}
              >
                {isFlagged && (
                  <span aria-label="Warning" className="mr-1">⚠️</span>
                )}
                {label}
              </p>
              <p
                className={`text-sm font-semibold ${
                  isFlagged ? 'text-red-800' : 'text-gray-900'
                }`}
              >
                {nutrients[key]}{unit}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
