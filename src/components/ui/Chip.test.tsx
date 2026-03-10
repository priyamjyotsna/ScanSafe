import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Chip } from './Chip'

describe('Chip', () => {
  it('renders label text', () => {
    render(<Chip label="Sodium" color="red" />)
    expect(screen.getByText('Sodium')).toBeInTheDocument()
  })

  it('applies red color styles', () => {
    render(<Chip label="Salt" color="red" />)
    const chip = screen.getByText('Salt').closest('span')
    expect(chip).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('applies green color styles', () => {
    render(<Chip label="Vegetables" color="green" />)
    const chip = screen.getByText('Vegetables').closest('span')
    expect(chip).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('applies gray color styles', () => {
    render(<Chip label="Other" color="gray" />)
    const chip = screen.getByText('Other').closest('span')
    expect(chip).toHaveClass('bg-gray-100', 'text-gray-800')
  })

  it('does not show remove button when not removable', () => {
    render(<Chip label="Salt" color="red" />)
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
  })

  it('shows remove button when removable', () => {
    const onRemove = vi.fn()
    render(<Chip label="Salt" color="red" removable onRemove={onRemove} />)
    expect(screen.getByRole('button', { name: /remove salt/i })).toBeInTheDocument()
  })

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = vi.fn()
    render(<Chip label="Salt" color="red" removable onRemove={onRemove} />)
    fireEvent.click(screen.getByRole('button', { name: /remove salt/i }))
    expect(onRemove).toHaveBeenCalledOnce()
  })
})
