import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import DietPlanReviewPage from './page'
import type { DietPlan } from '@/types/diet'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock useGuestState
const mockSetDietPlan = vi.fn()
let mockDisease: string | null = 'Type 2 Diabetes'
vi.mock('@/hooks/useGuestState', () => ({
  useGuestState: () => ({
    disease: mockDisease,
    dietPlan: null,
    scanCount: 0,
    setDisease: vi.fn(),
    setDietPlan: mockSetDietPlan,
    incrementScan: vi.fn(),
    clearAll: vi.fn(),
  }),
}))

const fakePlan: DietPlan = {
  avoid: ['High-sodium foods', 'Sugary drinks'],
  prefer: ['Leafy greens', 'Whole grains'],
  watch: ['Daily sodium < 1500mg'],
  nutrients: { Sodium: '< 300mg/serving' },
}

// Mock DietPlanCard
vi.mock('@/components/diet-plan/DietPlanCard', () => ({
  DietPlanCard: ({ plan, onSave }: { plan: DietPlan; editable: boolean; onSave: (p: DietPlan, c: boolean) => void }) => {
    void onSave // referenced to avoid unused warning
    return <div data-testid="diet-plan-card">{plan.avoid.join(', ')}</div>
  },
}))

vi.mock('@/components/ui/MedicalDisclaimer', () => ({
  MedicalDisclaimer: () => <div data-testid="medical-disclaimer">Disclaimer</div>,
}))

vi.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => <div data-testid="loading-spinner" data-size={size}>Loading</div>,
}))

describe('DietPlanReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDisease = 'Type 2 Diabetes'
    global.fetch = vi.fn()
  })

  it('shows skeleton loading UI while fetching diet plan', () => {
    // fetch never resolves
    ;(global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))
    render(<DietPlanReviewPage />)
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(screen.getByText(/generating your personalized diet plan/i)).toBeInTheDocument()
  })

  it('displays the disease name in the subtitle', () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))
    render(<DietPlanReviewPage />)
    expect(screen.getByText('Type 2 Diabetes')).toBeInTheDocument()
  })

  it('renders DietPlanCard and MedicalDisclaimer on successful fetch', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ dietPlan: fakePlan }),
    })

    render(<DietPlanReviewPage />)

    await waitFor(() => {
      expect(screen.getByTestId('diet-plan-card')).toBeInTheDocument()
    })
    expect(screen.getByTestId('medical-disclaimer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save & continue/i })).toBeInTheDocument()
  })

  it('shows error state with retry button on API failure', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'AI service error', code: 'AI_SERVICE_ERROR', retryable: true }),
    })

    render(<DietPlanReviewPage />)

    await waitFor(() => {
      expect(screen.getByText('AI service error')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('retries fetching on retry button click', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Oops', code: 'AI_SERVICE_ERROR', retryable: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ dietPlan: fakePlan }),
      })

    render(<DietPlanReviewPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(screen.getByTestId('diet-plan-card')).toBeInTheDocument()
    })
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('saves diet plan to localStorage and navigates to /scan on confirm', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ dietPlan: fakePlan }),
    })

    render(<DietPlanReviewPage />)

    await waitFor(() => {
      expect(screen.getByTestId('diet-plan-card')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save & continue/i }))

    expect(mockSetDietPlan).toHaveBeenCalledWith(fakePlan)
    expect(mockPush).toHaveBeenCalledWith('/scan')
  })

  it('calls fetch with the correct disease name', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ dietPlan: fakePlan }),
    })

    render(<DietPlanReviewPage />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/diet-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diseaseName: 'Type 2 Diabetes' }),
      })
    })
  })

  it('renders nothing when disease is null', () => {
    mockDisease = null
    ;(global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))
    const { container } = render(<DietPlanReviewPage />)
    expect(container.innerHTML).toBe('')
  })
})
