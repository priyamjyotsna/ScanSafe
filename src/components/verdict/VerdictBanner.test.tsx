import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { VerdictBanner } from './VerdictBanner'

describe('VerdictBanner', () => {
  it('renders SAFE verdict with green styling', () => {
    render(<VerdictBanner verdict="SAFE" reason="This food is safe for your condition." />)
    expect(screen.getByText('Safe to Eat')).toBeInTheDocument()
    expect(screen.getByText('This food is safe for your condition.')).toBeInTheDocument()
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('bg-green-50', 'border-green-400')
  })

  it('renders CAUTION verdict with amber styling', () => {
    render(<VerdictBanner verdict="CAUTION" reason="Okay in moderation." />)
    expect(screen.getByText('Use Caution')).toBeInTheDocument()
    expect(screen.getByText('Okay in moderation.')).toBeInTheDocument()
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('bg-amber-50', 'border-amber-400')
  })

  it('renders AVOID verdict with red styling', () => {
    render(<VerdictBanner verdict="AVOID" reason="Not recommended." />)
    expect(screen.getByText('Avoid This Product')).toBeInTheDocument()
    expect(screen.getByText('Not recommended.')).toBeInTheDocument()
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('bg-red-50', 'border-red-400')
  })

  it('displays safe alternative when provided', () => {
    render(
      <VerdictBanner
        verdict="AVOID"
        reason="High sodium."
        safeAlternative="Try low-sodium rice noodles."
      />
    )
    expect(screen.getByText(/Try low-sodium rice noodles/)).toBeInTheDocument()
    expect(screen.getByText(/Try instead:/)).toBeInTheDocument()
  })

  it('does not display safe alternative section when not provided', () => {
    render(<VerdictBanner verdict="SAFE" reason="All good." />)
    expect(screen.queryByText(/Try instead:/)).not.toBeInTheDocument()
  })

  it('has accessible alert role with verdict label', () => {
    render(<VerdictBanner verdict="CAUTION" reason="Be careful." />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-label', 'Verdict: Use Caution')
  })
})
