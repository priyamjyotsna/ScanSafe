'use client'

import React from 'react'

export interface NutrientTargetGridProps {
  nutrients: Record<string, string>
}

export function NutrientTargetGrid({ nutrients }: NutrientTargetGridProps) {
  const entries = Object.entries(nutrients)

  if (entries.length === 0) {
    return <p className="text-sm text-gray-500">No nutrient targets defined.</p>
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {entries.map(([name, target]) => (
        <div
          key={name}
          className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{name}</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900">{target}</p>
        </div>
      ))}
    </div>
  )
}
