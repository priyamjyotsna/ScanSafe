import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import ScanPage from './page'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock useScanCount
let mockShouldShowSoftPrompt = false
let mockShouldShowHardGate = false
const mockIncrement = vi.fn()
vi.mock('@/hooks/useScanCount', () => ({
  useScanCount: () => ({
    count: 0,
    shouldShowSoftPrompt: mockShouldShowSoftPrompt,
    shouldShowHardGate: mockShouldShowHardGate,
    increment: mockIncrement,
  }),
}))

// Mock useGuestState
let mockDisease: string | null = 'Type 2 Diabetes'
let mockDietPlan: object | null = { avoid: ['Salt'], prefer: ['Vegetables'], watch: ['Sodium'], nutrients: { Sodium: '< 300mg' } }
vi.mock('@/hooks/useGuestState', () => ({
  useGuestState: () => ({
    disease: mockDisease,
    dietPlan: mockDietPlan,
    scanCount: 0,
    setDisease: vi.fn(),
    setDietPlan: vi.fn(),
    incrementScan: vi.fn(),
    clearAll: vi.fn(),
  }),
}))

// Capture callbacks from child components
let capturedOnDecode: ((barcode: string) => void) | null = null
let capturedOnError: ((err: Error) => void) | null = null
let capturedOnIngredientsExtracted: ((ingredients: string[], rawText: string) => void) | null = null

// Mock next/dynamic to return our mock BarcodeScanner
vi.mock('next/dynamic', () => ({
  default: () => {
    const MockScanner = (props: { onDecode: (b: string) => void; onError?: (e: Error) => void }) => {
      capturedOnDecode = props.onDecode
      capturedOnError = props.onError || null
      return <div data-testid="barcode-scanner">Scanner</div>
    }
    MockScanner.displayName = 'MockBarcodeScanner'
    return MockScanner
  },
}))

vi.mock('@/components/scanner/IngredientCapture', () => ({
  IngredientCapture: ({ onIngredientsExtracted, onError }: { onIngredientsExtracted: (i: string[], r: string) => void; onError?: (e: string) => void }) => {
    capturedOnIngredientsExtracted = onIngredientsExtracted
    return <div data-testid="ingredient-capture">Ingredient Capture</div>
  },
}))

vi.mock('@/components/scanner/ScanModeToggle', () => ({
  ScanModeToggle: ({ mode, onModeChange }: { mode: string; onModeChange: (m: 'barcode' | 'ingredient') => void }) => (
    <div data-testid="scan-mode-toggle">
      <button onClick={() => onModeChange('barcode')}>Barcode</button>
      <button onClick={() => onModeChange('ingredient')}>Ingredient</button>
    </div>
  ),
}))

vi.mock('@/components/scanner/CameraViewfinder', () => ({
  CameraViewfinder: ({ active }: { active: boolean }) => active ? <div data-testid="camera-viewfinder" /> : null,
}))

vi.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading</div>,
}))

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}))

vi.mock('@/components/auth/AuthPromptModal', () => ({
  default: ({ mode, onDismiss }: { mode: string; onSignIn: () => void; onDismiss: () => void }) => (
    <div data-testid="auth-modal" data-mode={mode}>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
}))

describe('ScanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnDecode = null
    capturedOnError = null
    capturedOnIngredientsExtracted = null
    mockDisease = 'Type 2 Diabetes'
    mockDietPlan = { avoid: ['Salt'], prefer: ['Vegetables'], watch: ['Sodium'], nutrients: { Sodium: '< 300mg' } }
    mockShouldShowSoftPrompt = false
    mockShouldShowHardGate = false
    global.fetch = vi.fn()
    sessionStorage.clear()
  })

  it('redirects to /setup when disease is missing', () => {
    mockDisease = null
    render(<ScanPage />)
    expect(mockPush).toHaveBeenCalledWith('/setup')
  })

  it('redirects to /setup when dietPlan is missing', () => {
    mockDietPlan = null
    render(<ScanPage />)
    expect(mockPush).toHaveBeenCalledWith('/setup')
  })

  it('renders scan mode toggle and barcode scanner by default', () => {
    render(<ScanPage />)
    expect(screen.getByTestId('scan-mode-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('camera-viewfinder')).toBeInTheDocument()
    expect(screen.getByText('Scan Food')).toBeInTheDocument()
  })

  it('switches to ingredient mode when toggle clicked', () => {
    render(<ScanPage />)
    fireEvent.click(screen.getByText('Ingredient'))
    expect(screen.getByTestId('ingredient-capture')).toBeInTheDocument()
  })

  it('shows loading state during barcode lookup', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))
    render(<ScanPage />)

    await act(async () => {
      capturedOnDecode?.('1234567890')
    })

    expect(screen.getByText('Looking up product...')).toBeInTheDocument()
  })

  it('shows barcode-not-found with fallback option', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ found: false }),
    })

    render(<ScanPage />)

    await act(async () => {
      capturedOnDecode?.('0000000000')
    })

    await waitFor(() => {
      expect(screen.getByText('Product not found')).toBeInTheDocument()
    })
    expect(screen.getByText('Scan Ingredients')).toBeInTheDocument()
  })

  it('switches to ingredient mode on fallback click', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ found: false }),
    })

    render(<ScanPage />)

    await act(async () => {
      capturedOnDecode?.('0000000000')
    })

    await waitFor(() => {
      expect(screen.getByText('Scan Ingredients')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Scan Ingredients'))
    expect(screen.getByTestId('ingredient-capture')).toBeInTheDocument()
  })

  it('navigates to result page after successful barcode scan flow', async () => {
    const mockProduct = {
      name: 'Test Product',
      brand: 'Test Brand',
      ingredients: ['wheat', 'salt'],
      nutrients: { sodium: 500, sugar: 2, carbohydrates: 30, fat: 5, protein: 8, fiber: 1, saturatedFat: 2, transFat: 0 },
      servingSize: '100g',
    }
    const mockVerdict = {
      verdict: 'CAUTION',
      reason: 'High sodium',
      flaggedNutrients: ['sodium'],
      safeAlternative: 'Try low-sodium version',
    }

    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ found: true, product: mockProduct }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockVerdict })

    render(<ScanPage />)

    await act(async () => {
      capturedOnDecode?.('8901058852429')
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/scan/result')
    })

    const stored = JSON.parse(sessionStorage.getItem('dietscan_scan_result')!)
    expect(stored.verdict.verdict).toBe('CAUTION')
    expect(stored.product.name).toBe('Test Product')
  })

  it('navigates to result page after ingredient OCR flow', async () => {
    const mockVerdict = {
      verdict: 'SAFE',
      reason: 'All ingredients are safe',
      flaggedNutrients: [],
    }

    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => mockVerdict })

    render(<ScanPage />)
    fireEvent.click(screen.getByText('Ingredient'))

    await act(async () => {
      capturedOnIngredientsExtracted?.(['wheat flour', 'sugar'], 'wheat flour, sugar')
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/scan/result')
    })
  })

  it('shows error state on API failure', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Product lookup failed' }),
    })

    render(<ScanPage />)

    await act(async () => {
      capturedOnDecode?.('1234567890')
    })

    await waitFor(() => {
      expect(screen.getByText('Product lookup failed')).toBeInTheDocument()
    })
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('resets to idle on retry', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Oops' }),
    })

    render(<ScanPage />)

    await act(async () => {
      capturedOnDecode?.('1234567890')
    })

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Try Again'))
    expect(screen.getByTestId('camera-viewfinder')).toBeInTheDocument()
  })

  it('shows hard auth gate when shouldShowHardGate is true', async () => {
    mockShouldShowHardGate = true
    render(<ScanPage />)

    await act(async () => {
      capturedOnDecode?.('1234567890')
    })

    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
    expect(screen.getByTestId('auth-modal').getAttribute('data-mode')).toBe('hard')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('increments scan count after successful scan', async () => {
    const mockVerdict = { verdict: 'SAFE', reason: 'OK', flaggedNutrients: [] }

    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ found: true, product: { name: 'P', brand: 'B', ingredients: [], nutrients: { sodium: 0, sugar: 0, carbohydrates: 0, fat: 0, protein: 0, fiber: 0, saturatedFat: 0, transFat: 0 }, servingSize: '100g' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockVerdict })

    render(<ScanPage />)

    await act(async () => {
      capturedOnDecode?.('1234567890')
    })

    await waitFor(() => {
      expect(mockIncrement).toHaveBeenCalled()
    })
  })
})
