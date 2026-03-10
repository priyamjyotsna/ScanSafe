import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ScanModeToggle } from './ScanModeToggle'

describe('ScanModeToggle', () => {
  it('renders both Barcode and Ingredient tabs', () => {
    render(<ScanModeToggle mode="barcode" onModeChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'Barcode' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Ingredient' })).toBeInTheDocument()
  })

  it('marks barcode tab as selected when mode is barcode', () => {
    render(<ScanModeToggle mode="barcode" onModeChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'Barcode' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Ingredient' })).toHaveAttribute('aria-selected', 'false')
  })

  it('marks ingredient tab as selected when mode is ingredient', () => {
    render(<ScanModeToggle mode="ingredient" onModeChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'Barcode' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Ingredient' })).toHaveAttribute('aria-selected', 'true')
  })

  it('applies active styles to the selected tab', () => {
    render(<ScanModeToggle mode="barcode" onModeChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'Barcode' })).toHaveClass('bg-white', 'text-gray-900')
    expect(screen.getByRole('tab', { name: 'Ingredient' })).toHaveClass('text-gray-500')
  })

  it('calls onModeChange with "ingredient" when Ingredient tab is clicked', () => {
    const onModeChange = vi.fn()
    render(<ScanModeToggle mode="barcode" onModeChange={onModeChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Ingredient' }))
    expect(onModeChange).toHaveBeenCalledWith('ingredient')
  })

  it('calls onModeChange with "barcode" when Barcode tab is clicked', () => {
    const onModeChange = vi.fn()
    render(<ScanModeToggle mode="ingredient" onModeChange={onModeChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Barcode' }))
    expect(onModeChange).toHaveBeenCalledWith('barcode')
  })

  it('has a tablist role for accessibility', () => {
    render(<ScanModeToggle mode="barcode" onModeChange={vi.fn()} />)
    expect(screen.getByRole('tablist', { name: 'Scan mode' })).toBeInTheDocument()
  })
})
