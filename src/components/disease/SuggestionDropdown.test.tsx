import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SuggestionDropdown } from './SuggestionDropdown'

describe('SuggestionDropdown', () => {
  const onSelect = vi.fn()

  it('renders nothing when not loading and no suggestions', () => {
    const { container } = render(
      <SuggestionDropdown suggestions={[]} loading={false} onSelect={onSelect} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows loading state when loading with no suggestions', () => {
    render(<SuggestionDropdown suggestions={[]} loading={true} onSelect={onSelect} />)
    expect(screen.getByText('Loading suggestions…')).toBeInTheDocument()
  })

  it('renders suggestion items', () => {
    const suggestions = ['Type 1 Diabetes', 'Type 2 Diabetes', 'Gestational Diabetes']
    render(<SuggestionDropdown suggestions={suggestions} loading={false} onSelect={onSelect} />)
    suggestions.forEach((s) => {
      expect(screen.getByText(s)).toBeInTheDocument()
    })
  })

  it('calls onSelect when a suggestion is clicked', () => {
    render(
      <SuggestionDropdown suggestions={['Type 1 Diabetes']} loading={false} onSelect={onSelect} />
    )
    fireEvent.click(screen.getByText('Type 1 Diabetes'))
    expect(onSelect).toHaveBeenCalledWith('Type 1 Diabetes')
  })

  it('renders suggestions even when loading is true', () => {
    const suggestions = ['Type 1 Diabetes']
    render(<SuggestionDropdown suggestions={suggestions} loading={true} onSelect={onSelect} />)
    expect(screen.getByText('Type 1 Diabetes')).toBeInTheDocument()
    expect(screen.queryByText('Loading suggestions…')).not.toBeInTheDocument()
  })

  it('has listbox role for accessibility', () => {
    render(<SuggestionDropdown suggestions={['Test']} loading={false} onSelect={onSelect} />)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('suggestion buttons have option role', () => {
    render(<SuggestionDropdown suggestions={['Test']} loading={false} onSelect={onSelect} />)
    expect(screen.getByRole('option')).toBeInTheDocument()
  })
})
