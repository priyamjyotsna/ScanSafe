import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProductCard } from './ProductCard'

describe('ProductCard', () => {
  it('renders product name and brand', () => {
    render(<ProductCard name="Maggi 2-Minute Noodles" brand="Nestlé" />)
    expect(screen.getByText('Maggi 2-Minute Noodles')).toBeInTheDocument()
    expect(screen.getByText('Nestlé')).toBeInTheDocument()
  })

  it('renders name as a heading', () => {
    render(<ProductCard name="Oats" brand="Quaker" />)
    expect(screen.getByRole('heading', { name: 'Oats' })).toBeInTheDocument()
  })

  it('renders inside a card container', () => {
    const { container } = render(<ProductCard name="Rice" brand="India Gate" />)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('rounded-2xl', 'border', 'bg-white')
  })
})
