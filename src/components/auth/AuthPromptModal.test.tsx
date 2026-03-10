import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AuthPromptModal from './AuthPromptModal'

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}))

describe('AuthPromptModal', () => {
  const defaultProps = {
    mode: 'soft' as const,
    onSignIn: vi.fn(),
    onDismiss: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('soft mode', () => {
    it('renders the soft mode message', () => {
      render(<AuthPromptModal {...defaultProps} />)
      expect(screen.getByText('Save your progress')).toBeInTheDocument()
      expect(
        screen.getByText('Sign in to save your diet plan across devices and track your scan history')
      ).toBeInTheDocument()
    })

    it('renders the Google sign-in button', () => {
      render(<AuthPromptModal {...defaultProps} />)
      expect(screen.getByText('Continue with Google')).toBeInTheDocument()
    })

    it('renders the Maybe Later button', () => {
      render(<AuthPromptModal {...defaultProps} />)
      expect(screen.getByText('Maybe Later')).toBeInTheDocument()
    })

    it('calls onDismiss when Maybe Later is clicked', () => {
      render(<AuthPromptModal {...defaultProps} />)
      fireEvent.click(screen.getByText('Maybe Later'))
      expect(defaultProps.onDismiss).toHaveBeenCalledOnce()
    })

    it('calls onSignIn and signIn when Google button is clicked', async () => {
      const { signIn } = await import('next-auth/react')
      render(<AuthPromptModal {...defaultProps} />)
      fireEvent.click(screen.getByText('Continue with Google'))
      expect(defaultProps.onSignIn).toHaveBeenCalledOnce()
      expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/' })
    })
  })

  describe('hard mode', () => {
    it('renders the hard mode message', () => {
      render(<AuthPromptModal {...defaultProps} mode="hard" />)
      expect(screen.getByText('Sign in to continue scanning')).toBeInTheDocument()
      expect(screen.getByText('You need to sign in with Google to keep scanning products')).toBeInTheDocument()
    })

    it('does NOT render the Maybe Later button', () => {
      render(<AuthPromptModal {...defaultProps} mode="hard" />)
      expect(screen.queryByText('Maybe Later')).not.toBeInTheDocument()
    })

    it('renders the Google sign-in button', () => {
      render(<AuthPromptModal {...defaultProps} mode="hard" />)
      expect(screen.getByText('Continue with Google')).toBeInTheDocument()
    })

    it('calls onSignIn and signIn when Google button is clicked', async () => {
      const { signIn } = await import('next-auth/react')
      render(<AuthPromptModal {...defaultProps} mode="hard" />)
      fireEvent.click(screen.getByText('Continue with Google'))
      expect(defaultProps.onSignIn).toHaveBeenCalledOnce()
      expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/' })
    })
  })

  it('renders a semi-transparent backdrop overlay', () => {
    const { container } = render(<AuthPromptModal {...defaultProps} />)
    const backdrop = container.firstChild as HTMLElement
    expect(backdrop.className).toContain('bg-black/50')
    expect(backdrop.className).toContain('fixed')
    expect(backdrop.className).toContain('inset-0')
  })
})
