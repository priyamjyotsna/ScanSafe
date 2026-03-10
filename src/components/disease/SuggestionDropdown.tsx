'use client'

import React from 'react'

export interface SuggestionDropdownProps {
  suggestions: string[]
  loading: boolean
  onSelect: (suggestion: string) => void
}

export function SuggestionDropdown({ suggestions, loading, onSelect }: SuggestionDropdownProps) {
  if (!loading && suggestions.length === 0) {
    return null
  }

  return (
    <div
      role="listbox"
      className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg max-h-64 overflow-y-auto"
    >
      {loading && suggestions.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400">
          <svg
            className="h-4 w-4 animate-spin text-emerald-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Finding conditions…
        </div>
      ) : (
        suggestions.map((suggestion) => (
          <button
            key={suggestion}
            role="option"
            aria-selected="false"
            type="button"
            className="w-full cursor-pointer px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none"
            onClick={() => onSelect(suggestion)}
          >
            {suggestion}
          </button>
        ))
      )}
    </div>
  )
}
