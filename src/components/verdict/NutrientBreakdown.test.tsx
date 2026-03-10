import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { NutrientBreakdown } from './NutrientBreakdown'
import type { NutrientMap } from '@/types/scan'

const sampleNutrients: NutrientMap = {
  sodium: 870,
  sugar: 2,
  carbohydrates: 45,
  fat: 7,
  protein: 8,
  fiber: 1,
  saturatedFat: 3,
  transFat: 0,
}

describe('NutrientBreakdown', () => {
  it('renders all nutrient values with correct units', () => {
    render(<NutrientBreakdown nutrients={sampleNutrients} flaggedNutrients={[]} />)
    expect(screen.getByText('870mg')).toBeInTheDocument()
    expect(screen.getByText('2g')).toBeInTheDocument()
    expect(screen.getByText('45g')).toBeInTheDocument()
    expect(screen.getByText('7g')).toBeInTheDocument()
    expect(screen.getByText('8g')).toBeInTheDocument()
    expect(screen.getByText('1g')).toBeInTheDocument()
    expect(screen.getByText('3g')).toBeInTheDocument()
    expect(screen.getByText('0g')).toBeInTheDocument()
  })

  it('renders all nutrient labels', () => {
    render(<NutrientBreakdown nutrients={sampleNutrients} flaggedNutrients={[]} />)
    expect(screen.getByText('Sodium')).toBeInTheDocument()
    expect(screen.getByText('Sugar')).toBeInTheDocument()
    expect(screen.getByText('Carbohydrates')).toBeInTheDocument()
    expect(screen.getByText('Fat')).toBeInTheDocument()
    expect(screen.getByText('Protein')).toBeInTheDocument()
    expect(screen.getByText('Fiber')).toBeInTheDocument()
    expect(screen.getByText('Saturated Fat')).toBeInTheDocument()
    expect(screen.getByText('Trans Fat')).toBeInTheDocument()
  })

  it('highlights flagged nutrients with red/warning styling', () => {
    render(
      <NutrientBreakdown nutrients={sampleNutrients} flaggedNutrients={['sodium', 'fat']} />
    )
    const sodiumEl = screen.getByTestId('nutrient-sodium')
    expect(sodiumEl).toHaveClass('bg-red-50', 'border-red-300')

    const fatEl = screen.getByTestId('nutrient-fat')
    expect(fatEl).toHaveClass('bg-red-50', 'border-red-300')
  })

  it('does not highlight non-flagged nutrients', () => {
    render(
      <NutrientBreakdown nutrients={sampleNutrients} flaggedNutrients={['sodium']} />
    )
    const proteinEl = screen.getByTestId('nutrient-protein')
    expect(proteinEl).toHaveClass('bg-gray-50')
    expect(proteinEl).not.toHaveClass('bg-red-50')
  })

  it('shows warning emoji on flagged nutrients', () => {
    render(
      <NutrientBreakdown nutrients={sampleNutrients} flaggedNutrients={['sugar']} />
    )
    const sugarEl = screen.getByTestId('nutrient-sugar')
    expect(sugarEl.querySelector('[aria-label="Warning"]')).toBeInTheDocument()
  })

  it('renders heading', () => {
    render(<NutrientBreakdown nutrients={sampleNutrients} flaggedNutrients={[]} />)
    expect(screen.getByText('Nutrient Breakdown')).toBeInTheDocument()
  })
})
