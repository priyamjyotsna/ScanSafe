import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CameraViewfinder } from './CameraViewfinder'

describe('CameraViewfinder', () => {
  it('renders the viewfinder overlay when active', () => {
    render(<CameraViewfinder active={true} />)
    expect(screen.getByTestId('camera-viewfinder')).toBeInTheDocument()
  })

  it('renders nothing when not active', () => {
    render(<CameraViewfinder active={false} />)
    expect(screen.queryByTestId('camera-viewfinder')).not.toBeInTheDocument()
  })

  it('displays instruction text for the user', () => {
    render(<CameraViewfinder active={true} />)
    expect(screen.getByText('Position barcode within the frame')).toBeInTheDocument()
  })

  it('is marked as aria-hidden since it is decorative', () => {
    render(<CameraViewfinder active={true} />)
    expect(screen.getByTestId('camera-viewfinder')).toHaveAttribute('aria-hidden', 'true')
  })
})
