'use client'

import React from 'react'

export interface ChipProps {
  label: string
  color: 'red' | 'green' | 'gray'
  removable?: boolean
  onRemove?: () => void
}

const colorStyles: Record<ChipProps['color'], string> = {
  red: 'bg-red-100 text-red-800 border-red-200',
  green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  gray: 'bg-gray-100 text-gray-800 border-gray-200',
}

export function Chip({ label, color, removable = false, onRemove }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium ${colorStyles[color]}`}
    >
      {label}
      {removable && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-current"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  )
}
