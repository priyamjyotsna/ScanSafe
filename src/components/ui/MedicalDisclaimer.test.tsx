import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MedicalDisclaimer } from './MedicalDisclaimer'

describe('MedicalDisclaimer', () => {
  it('renders the disclaimer text', () => {
    render(<MedicalDisclaimer />)
    expect(
      screen.getByText(/DietScan provides general dietary information/i)
    ).toBeInTheDocument()
  })

  it('mentions consulting a healthcare professional', () => {
    render(<MedicalDisclaimer />)
    expect(
      screen.getByText(/always consult your doctor/i)
    ).toBeInTheDocument()
  })

  it('states it is not medical advice', () => {
    render(<MedicalDisclaimer />)
    expect(
      screen.getByText(/this is not medical advice/i)
    ).toBeInTheDocument()
  })

  it('has an alert role for accessibility', () => {
    render(<MedicalDisclaimer />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('contains a decorative icon that is hidden from screen readers', () => {
    render(<MedicalDisclaimer />)
    const svg = screen.getByRole('alert').querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })
})
