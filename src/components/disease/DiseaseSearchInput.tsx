'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useDiseaseSearch } from '@/hooks/useDiseaseSearch'
import { SuggestionDropdown } from './SuggestionDropdown'

export interface DiseaseSearchInputProps {
  onSelect: (disease: string) => void
}

export function DiseaseSearchInput({ onSelect }: DiseaseSearchInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const { suggestions, loading, error, search } = useDiseaseSearch()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setInputValue(value)
    setConfirmed(false)
    setShowDropdown(true)
    search(value)
  }

  function handleSelect(suggestion: string) {
    setInputValue(suggestion)
    setConfirmed(true)
    setShowDropdown(false)
    onSelect(suggestion)
  }

  function handleManualSubmit() {
    if (inputValue.trim()) {
      setConfirmed(true)
      setShowDropdown(false)
      onSelect(inputValue.trim())
    }
  }

  function handleRetry() {
    search(inputValue)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleManualSubmit()
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          id="disease-search"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder="e.g. diabetes, cirrhosis, hypertension"
          autoComplete="off"
          className={`w-full rounded-xl border-2 bg-white px-4 py-3.5 text-sm outline-none transition-all placeholder:text-gray-400 ${
            confirmed
              ? 'border-emerald-400 bg-emerald-50/50'
              : 'border-gray-200 focus:border-emerald-500 focus:shadow-sm'
          }`}
        />
        {loading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <svg
              className="h-4 w-4 animate-spin text-emerald-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-label="Loading"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
        {confirmed && !loading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Confirmed">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {showDropdown && (
        <SuggestionDropdown
          suggestions={suggestions}
          loading={loading}
          onSelect={handleSelect}
        />
      )}

      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
          <span>{error}</span>
          <button type="button" onClick={handleRetry} className="font-medium underline hover:text-red-800">
            Retry
          </button>
        </div>
      )}

      {!confirmed && inputValue.trim().length > 0 && !loading && (
        <p className="mt-1.5 text-xs text-gray-400">
          Press Enter or select a suggestion
        </p>
      )}
    </div>
  )
}
