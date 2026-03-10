import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DietPlanCard } from './DietPlanCard'
import type { DietPlan } from '@/types/diet'

const mockPlan: DietPlan = {
  avoid: ['High-sodium foods', 'Raw shellfish'],
  prefer: ['Soft-cooked vegetables', 'BCAA-rich foods'],
  watch: ['Daily sodium < 1500mg', 'Fluid restriction'],
  nutrients: {
    Sodium: '< 300mg/serving',
    Protein: '1.0-1.5g per kg/day',
  },
}

describe('DietPlanCard', () => {
  it('renders all diet plan sections', () => {
    render(<DietPlanCard plan={mockPlan} editable={false} onSave={vi.fn()} />)

    expect(screen.getByText('Your Diet Plan')).toBeInTheDocument()
    expect(screen.getByText('Foods to Avoid')).toBeInTheDocument()
    expect(screen.getByText('Recommended Foods')).toBeInTheDocument()
    expect(screen.getByText('Nutrients to Watch')).toBeInTheDocument()
    expect(screen.getByText('Nutrient Targets')).toBeInTheDocument()
  })

  it('renders avoid items as red chips', () => {
    render(<DietPlanCard plan={mockPlan} editable={false} onSave={vi.fn()} />)
    expect(screen.getByText('High-sodium foods')).toBeInTheDocument()
    expect(screen.getByText('Raw shellfish')).toBeInTheDocument()
  })

  it('renders prefer items as green chips', () => {
    render(<DietPlanCard plan={mockPlan} editable={false} onSave={vi.fn()} />)
    expect(screen.getByText('Soft-cooked vegetables')).toBeInTheDocument()
    expect(screen.getByText('BCAA-rich foods')).toBeInTheDocument()
  })

  it('renders watch items as a list', () => {
    render(<DietPlanCard plan={mockPlan} editable={false} onSave={vi.fn()} />)
    expect(screen.getByText('Daily sodium < 1500mg')).toBeInTheDocument()
    expect(screen.getByText('Fluid restriction')).toBeInTheDocument()
  })

  it('renders nutrient targets', () => {
    render(<DietPlanCard plan={mockPlan} editable={false} onSave={vi.fn()} />)
    expect(screen.getByText('Sodium')).toBeInTheDocument()
    expect(screen.getByText('< 300mg/serving')).toBeInTheDocument()
  })

  it('does not show Edit button when not editable', () => {
    render(<DietPlanCard plan={mockPlan} editable={false} onSave={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('shows Edit button when editable', () => {
    render(<DietPlanCard plan={mockPlan} editable onSave={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('enters edit mode and shows Confirm/Cancel buttons', () => {
    render(<DietPlanCard plan={mockPlan} editable onSave={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('calls onSave with updated plan and isCustomized=false when no changes made', () => {
    const onSave = vi.fn()
    render(<DietPlanCard plan={mockPlan} editable onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(onSave).toHaveBeenCalledOnce()
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        avoid: mockPlan.avoid,
        prefer: mockPlan.prefer,
      }),
      false
    )
  })

  it('calls onSave with isCustomized=true when items are removed', () => {
    const onSave = vi.fn()
    render(<DietPlanCard plan={mockPlan} editable onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    // Remove an item
    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    fireEvent.click(removeButtons[0])
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(onSave).toHaveBeenCalledOnce()
    expect(onSave).toHaveBeenCalledWith(expect.any(Object), true)
  })

  it('reverts changes on cancel', () => {
    render(<DietPlanCard plan={mockPlan} editable onSave={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    // Remove an item
    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    fireEvent.click(removeButtons[0])

    // Cancel
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    // Original items should still be present
    expect(screen.getByText('High-sodium foods')).toBeInTheDocument()
    expect(screen.getByText('Raw shellfish')).toBeInTheDocument()
  })
})
