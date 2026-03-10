'use client'

export interface ScanModeToggleProps {
  mode: 'barcode' | 'ingredient'
  onModeChange: (mode: 'barcode' | 'ingredient') => void
}

export function ScanModeToggle({ mode, onModeChange }: ScanModeToggleProps) {
  return (
    <div className="inline-flex rounded-xl bg-gray-100 p-1" role="tablist" aria-label="Scan mode">
      <button
        role="tab"
        aria-selected={mode === 'barcode'}
        className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
          mode === 'barcode'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => onModeChange('barcode')}
      >
        Barcode
      </button>
      <button
        role="tab"
        aria-selected={mode === 'ingredient'}
        className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
          mode === 'ingredient'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => onModeChange('ingredient')}
      >
        Ingredient
      </button>
    </div>
  )
}
