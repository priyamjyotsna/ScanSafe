import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ScanResultPage from './page'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock child components
vi.mock('@/components/verdict/VerdictBanner', () => ({
  VerdictBanner: ({ verdict, reason, safeAlternative }: { verdict: string; reason: string; safeAlternative?: string }) => (
    <div data-testid="verdict-banner" data-verdict={verdict}>
      <span>{reason}</span>
      {safeAlternative && <span>{safeAlternative}</span>}
    </div>
  ),
}))

vi.mock('@/components/verdict/ProductCard', () => ({
  ProductCard: ({ name, brand }: { name: string; brand: string }) => (
    <div data-testid="product-card">{name} - {brand}</div>
  ),
}))

vi.mock('@/components/verdict/NutrientBreakdown', () => ({
  NutrientBreakdown: ({ flaggedNutrients }: { nutrients: object; flaggedNutrients: string[] }) => (
    <div data-testid="nutrient-breakdown">Flagged: {flaggedNutrients.join(', ')}</div>
  ),
}))

vi.mock('@/components/ui/MedicalDisclaimer', () => ({
  MedicalDisclaimer: () => <div data-testid="medical-disclaimer">Disclaimer</div>,
}))

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading</div>,
}))

const mockResultData = {
  verdict: {
    verdict: 'CAUTION',
    reason: 'High sodium content',
    flaggedNutrients: ['sodium'],
    safeAlternative: 'Try low-sodium version',
  },
  product: {
    name: 'Maggi Noodles',
    brand: 'Nestlé',
    ingredients: ['wheat flour', 'salt'],
    nutrients: { sodium: 870, sugar: 2, carbohydrates: 45, fat: 7, protein: 8, fiber: 1, saturatedFat: 3, transFat: 0 },
    servingSize: '75g',
  },
}

describe('ScanResultPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    global.fetch = vi.fn()
  })

  it('redirects to /scan when no result data in sessionStorage', () => {
    render(<ScanResultPage />)
    expect(mockPush).toHaveBeenCalledWith('/scan')
  })

  it('shows loading spinner initially before data loads', () => {
    render(<ScanResultPage />)
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('renders verdict banner with correct data', () => {
    sessionStorage.setItem('dietscan_scan_result', JSON.stringify(mockResultData))
    render(<ScanResultPage />)

    expect(screen.getByTestId('verdict-banner')).toBeInTheDocument()
    expect(screen.getByTestId('verdict-banner').getAttribute('data-verdict')).toBe('CAUTION')
    expect(screen.getByText('High sodium content')).toBeInTheDocument()
  })

  it('renders product card when product data exists', () => {
    sessionStorage.setItem('dietscan_scan_result', JSON.stringify(mockResultData))
    render(<ScanResultPage />)

    expect(screen.getByTestId('product-card')).toBeInTheDocument()
    expect(screen.getByText('Maggi Noodles - Nestlé')).toBeInTheDocument()
  })

  it('renders nutrient breakdown when product has nutrients', () => {
    sessionStorage.setItem('dietscan_scan_result', JSON.stringify(mockResultData))
    render(<ScanResultPage />)

    expect(screen.getByTestId('nutrient-breakdown')).toBeInTheDocument()
    expect(screen.getByText('Flagged: sodium')).toBeInTheDocument()
  })

  it('does not render product card when product is null', () => {
    const dataWithoutProduct = { ...mockResultData, product: null }
    sessionStorage.setItem('dietscan_scan_result', JSON.stringify(dataWithoutProduct))
    render(<ScanResultPage />)

    expect(screen.queryByTestId('product-card')).not.toBeInTheDocument()
  })

  it('does not render nutrient breakdown when nutrients are all zero', () => {
    const dataWithZeroNutrients = {
      ...mockResultData,
      product: {
        ...mockResultData.product,
        nutrients: { sodium: 0, sugar: 0, carbohydrates: 0, fat: 0, protein: 0, fiber: 0, saturatedFat: 0, transFat: 0 },
      },
    }
    sessionStorage.setItem('dietscan_scan_result', JSON.stringify(dataWithZeroNutrients))
    render(<ScanResultPage />)

    expect(screen.queryByTestId('nutrient-breakdown')).not.toBeInTheDocument()
  })

  it('renders medical disclaimer', () => {
    sessionStorage.setItem('dietscan_scan_result', JSON.stringify(mockResultData))
    render(<ScanResultPage />)

    expect(screen.getByTestId('medical-disclaimer')).toBeInTheDocument()
  })

  it('renders Scan Another button that navigates to /scan', () => {
    sessionStorage.setItem('dietscan_scan_result', JSON.stringify(mockResultData))
    render(<ScanResultPage />)

    const scanAnotherBtn = screen.getByText('Scan Another')
    fireEvent.click(scanAnotherBtn)

    expect(mockPush).toHaveBeenCalledWith('/scan')
    expect(sessionStorage.getItem('dietscan_scan_result')).toBeNull()
  })

  it('renders Save to History button', () => {
    sessionStorage.setItem('dietscan_scan_result', JSON.stringify(mockResultData))
    render(<ScanResultPage />)

    expect(screen.getByText('Save to History')).toBeInTheDocument()
  })

  it('shows saved confirmation after successful save', async () => {
    sessionStorage.setItem('dietscan_scan_result', JSON.stringify(mockResultData))
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    render(<ScanResultPage />)

    fireEvent.click(screen.getByText('Save to History'))

    await waitFor(() => {
      expect(screen.getByText('✓ Saved to history')).toBeInTheDocument()
    })
  })

  it('renders page title', () => {
    sessionStorage.setItem('dietscan_scan_result', JSON.stringify(mockResultData))
    render(<ScanResultPage />)

    expect(screen.getByText('Scan Result')).toBeInTheDocument()
  })
})
