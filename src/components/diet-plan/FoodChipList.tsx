'use client'

import React, { useState } from 'react'
import { Chip } from '@/components/ui/Chip'

export interface FoodChipListProps {
  items: string[]
  color: 'red' | 'green' | 'gray'
  removable: boolean
  onRemove?: (item: string) => void
  onAdd?: (item: string) => void
}

export function FoodChipList({ items, color, removable, onRemove, onAdd }: FoodChipListProps) {
  const [adding, setAdding] = useState(false)
  const [newItem, setNewItem] = useState('')

  function handleAdd() {
    const trimmed = newItem.trim()
    if (trimmed && onAdd) {
      onAdd(trimmed)
      setNewItem('')
      setAdding(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
    if (e.key === 'Escape') {
      setAdding(false)
      setNewItem('')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <Chip
          key={item}
          label={item}
          color={color}
          removable={removable}
          onRemove={removable && onRemove ? () => onRemove(item) : undefined}
        />
      ))}

      {removable && onAdd && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-400 px-3 py-1 text-sm text-gray-500 transition-colors hover:border-gray-600 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      )}

      {adding && (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type item…"
            autoFocus
            className="w-32 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newItem.trim()}
            className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setNewItem('') }}
            className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
