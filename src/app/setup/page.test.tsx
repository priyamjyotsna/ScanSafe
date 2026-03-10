import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import DiseaseSelectionPage from './page'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock useGuestState
const mockSetDisease = vi.fn()
vi.mock('@/hooks/useGuestState', () => ({
  useGuestState: () => ({
    disease: null,
    dietPlan: null,
    scanCount: 0,
    setDisease: mockSetDisease,
    setDietPlan: vi.fn(),
    incrementScan: vi.fn(),
    clearAll: vi.fn(),
  }),
}))

// Mock DiseaseSearchInput to control onSelect
let capturedOnSelect: ((disease: string) => void) | null = null
vi.mock('@/components/disease/DiseaseSearchInput', () => ({
  DiseaseSearchInput: ({ onSelect }: { onSelect: (d: string) => void }) => {
    capturedOnSelect = onSelect
    return <div data-testid="disease-search-input">DiseaseSearchInput</div>
  },
}))

describe('DiseaseSelectionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnSelect = null
  })

  it('renders the app name and description', () => {
    render(<DiseaseSelectionPage />)
    expect(screen.getByText('DietScan')).toBeInTheDocument()
    expect(screen.getByText(/make safe food choices/i)).toBeInTheDocument()
  })

  it('renders the DiseaseSearchInput component', () => {
    render(<DiseaseSelectionPage />)
    expect(screen.getByTestId('disease-search-input')).toBeInTheDocument()
  })

  it('renders a disabled Continue button initially', () => {
    render(<DiseaseSelectionPage />)
    const button = screen.getByRole('button', { name: /continue/i })
    expect(button).toBeDisabled()
  })

  it('enables Continue button after a disease is selected', () => {
    render(<DiseaseSelectionPage />)
    act(() => { capturedOnSelect!('Type 2 Diabetes') })
    const button = screen.getByRole('button', { name: /continue/i })
    expect(button).toBeEnabled()
  })

  it('stores disease in localStorage and navigates on Continue', () => {
    render(<DiseaseSelectionPage />)
    act(() => { capturedOnSelect!('Type 2 Diabetes') })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(mockSetDisease).toHaveBeenCalledWith('Type 2 Diabetes')
    expect(mockPush).toHaveBeenCalledWith('/setup/diet-plan')
  })

  it('does not navigate when no disease is selected', () => {
    render(<DiseaseSelectionPage />)
    const button = screen.getByRole('button', { name: /continue/i })
    fireEvent.click(button)
    expect(mockPush).not.toHaveBeenCalled()
    expect(mockSetDisease).not.toHaveBeenCalled()
  })
})
