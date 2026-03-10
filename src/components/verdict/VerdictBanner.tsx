'use client'

import React from 'react'
import type { VerdictType } from '@/types/diet'

export interface VerdictBannerProps {
  verdict: VerdictType
  reason: string
  safeAlternative?: string
}

const verdictConfig: Record<VerdictType, {
  label: string
  bgColor: string
  borderColor: string
  textColor: string
  icon: React.ReactNode
}> = {
  SAFE: {
    label: 'Safe to Eat',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-400',
    textColor: 'text-green-800',
    icon: (
      <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  CAUTION: {
    label: 'Use Caution',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-400',
    textColor: 'text-amber-800',
    icon: (
      <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86l-8.6 14.86A1 1 0 002.56 20h18.88a1 1 0 00.87-1.28l-8.6-14.86a1 1 0 00-1.72 0z" />
      </svg>
    ),
  },
  AVOID: {
    label: 'Avoid This Product',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-400',
    textColor: 'text-red-800',
    icon: (
      <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
}

export function VerdictBanner({ verdict, reason, safeAlternative }: VerdictBannerProps) {
  const config = verdictConfig[verdict]

  return (
    <div
      className={`rounded-2xl border-2 ${config.borderColor} ${config.bgColor} p-4 sm:p-6`}
      role="alert"
      aria-label={`Verdict: ${config.label}`}
    >
      <div className="flex items-center gap-3">
        {config.icon}
        <h2 className={`text-xl font-bold ${config.textColor}`}>{config.label}</h2>
      </div>
      <p className={`mt-2 text-sm ${config.textColor}`}>{reason}</p>
      {safeAlternative && (
        <div className="mt-3 rounded-lg bg-white/60 p-3">
          <p className="text-sm font-medium text-gray-700">
            💡 <span className="font-semibold">Try instead:</span> {safeAlternative}
          </p>
        </div>
      )}
    </div>
  )
}
