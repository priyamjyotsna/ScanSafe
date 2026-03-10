import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IngredientCapture } from './IngredientCapture'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Helper to create a mock File
function createMockFile(name = 'label.jpg', type = 'image/jpeg') {
  return new File(['fake-image-data'], name, { type })
}

// Mock FileReader properly using class syntax
const originalFileReader = global.FileReader

function installFileReaderMock(base64Result = 'data:image/jpeg;base64,abc123') {
  class MockFileReader {
    result: string | null = null
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    readAsDataURL() {
      this.result = base64Result
      setTimeout(() => this.onload?.(), 0)
    }
  }
  global.FileReader = MockFileReader as unknown as typeof FileReader
}

describe('IngredientCapture', () => {
  const defaultProps = {
    onIngredientsExtracted: vi.fn(),
    onError: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
    installFileReaderMock()
  })

  afterEach(() => {
    global.FileReader = originalFileReader
  })

  it('renders the capture button', () => {
    render(<IngredientCapture {...defaultProps} />)
    expect(screen.getByText('Capture Ingredient Label')).toBeInTheDocument()
  })

  it('displays the in-app tip about lighting and focus', () => {
    render(<IngredientCapture {...defaultProps} />)
    expect(screen.getByText('Make sure the text is well-lit and in focus')).toBeInTheDocument()
  })

  it('renders a file input with image capture attributes', () => {
    render(<IngredientCapture {...defaultProps} />)
    const fileInput = screen.getByLabelText('Capture ingredient label')
    expect(fileInput).toHaveAttribute('type', 'file')
    expect(fileInput).toHaveAttribute('accept', 'image/*')
    expect(fileInput).toHaveAttribute('capture', 'environment')
  })

  it('shows loading state while processing an image', async () => {
    mockFetch.mockReturnValue(new Promise(() => {})) // never resolves

    render(<IngredientCapture {...defaultProps} />)

    const fileInput = screen.getByLabelText('Capture ingredient label')
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [createMockFile()] } })
    })

    // Wait for FileReader to complete and processing state to show
    await waitFor(() => {
      expect(screen.getByText('Reading ingredients...')).toBeInTheDocument()
    })
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('calls onIngredientsExtracted on successful OCR', async () => {
    const ocrResponse = {
      ingredients: ['wheat flour', 'sugar', 'salt'],
      rawText: 'Ingredients: wheat flour, sugar, salt',
    }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(ocrResponse),
    })

    render(<IngredientCapture {...defaultProps} />)

    const fileInput = screen.getByLabelText('Capture ingredient label')
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [createMockFile()] } })
    })

    await waitFor(() => {
      expect(defaultProps.onIngredientsExtracted).toHaveBeenCalledWith(
        ['wheat flour', 'sugar', 'salt'],
        'Ingredients: wheat flour, sugar, salt'
      )
    })
  })

  it('shows manual entry fallback on OCR failure (422)', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: "Couldn't read the label.",
          code: 'OCR_EXTRACTION_FAILED',
          retryable: true,
        }),
    })

    render(<IngredientCapture {...defaultProps} />)

    const fileInput = screen.getByLabelText('Capture ingredient label')
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [createMockFile()] } })
    })

    await waitFor(() => {
      expect(screen.getByText(/Could not read the label automatically/)).toBeInTheDocument()
    })
    expect(screen.getByLabelText('Manual ingredient entry')).toBeInTheDocument()
    expect(screen.getByText('Submit')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
    expect(defaultProps.onError).toHaveBeenCalledWith("Couldn't read the label.")
  })

  it('shows manual entry fallback on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    render(<IngredientCapture {...defaultProps} />)

    const fileInput = screen.getByLabelText('Capture ingredient label')
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [createMockFile()] } })
    })

    await waitFor(() => {
      expect(screen.getByText(/Could not read the label automatically/)).toBeInTheDocument()
    })
    expect(defaultProps.onError).toHaveBeenCalledWith('Failed to process image. Please try again.')
  })

  it('parses comma-separated manual text into ingredients', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: 'OCR failed',
          code: 'OCR_EXTRACTION_FAILED',
          retryable: true,
        }),
    })

    render(<IngredientCapture {...defaultProps} />)

    // Trigger OCR failure to show manual entry
    const fileInput = screen.getByLabelText('Capture ingredient label')
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [createMockFile()] } })
    })

    await waitFor(() => {
      expect(screen.getByLabelText('Manual ingredient entry')).toBeInTheDocument()
    })

    const textarea = screen.getByLabelText('Manual ingredient entry')
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'wheat flour, sugar, salt' } })
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Submit'))
    })

    expect(defaultProps.onIngredientsExtracted).toHaveBeenCalledWith(
      ['wheat flour', 'sugar', 'salt'],
      'wheat flour, sugar, salt'
    )
  })

  it('disables submit button when manual text is empty', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: 'OCR failed',
          code: 'OCR_EXTRACTION_FAILED',
          retryable: true,
        }),
    })

    render(<IngredientCapture {...defaultProps} />)

    const fileInput = screen.getByLabelText('Capture ingredient label')
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [createMockFile()] } })
    })

    await waitFor(() => {
      expect(screen.getByText('Submit')).toBeDisabled()
    })
  })

  it('returns to idle state when Try Again is clicked', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: 'OCR failed',
          code: 'OCR_EXTRACTION_FAILED',
          retryable: true,
        }),
    })

    render(<IngredientCapture {...defaultProps} />)

    const fileInput = screen.getByLabelText('Capture ingredient label')
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [createMockFile()] } })
    })

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Try Again'))
    })

    expect(screen.getByText('Capture Ingredient Label')).toBeInTheDocument()
  })

  it('trims whitespace from manual entries', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: 'OCR failed',
          code: 'OCR_EXTRACTION_FAILED',
          retryable: true,
        }),
    })

    render(<IngredientCapture {...defaultProps} />)

    const fileInput = screen.getByLabelText('Capture ingredient label')
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [createMockFile()] } })
    })

    await waitFor(() => {
      expect(screen.getByLabelText('Manual ingredient entry')).toBeInTheDocument()
    })

    const textarea = screen.getByLabelText('Manual ingredient entry')
    await act(async () => {
      fireEvent.change(textarea, { target: { value: '  wheat flour ,  sugar  , , salt  ' } })
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Submit'))
    })

    expect(defaultProps.onIngredientsExtracted).toHaveBeenCalledWith(
      ['wheat flour', 'sugar', 'salt'],
      'wheat flour ,  sugar  , , salt'
    )
  })

  it('does not submit when manual text is only whitespace', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: 'OCR failed',
          code: 'OCR_EXTRACTION_FAILED',
          retryable: true,
        }),
    })

    render(<IngredientCapture {...defaultProps} />)

    const fileInput = screen.getByLabelText('Capture ingredient label')
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [createMockFile()] } })
    })

    await waitFor(() => {
      expect(screen.getByLabelText('Manual ingredient entry')).toBeInTheDocument()
    })

    const textarea = screen.getByLabelText('Manual ingredient entry')
    await act(async () => {
      fireEvent.change(textarea, { target: { value: '   ' } })
    })

    expect(screen.getByText('Submit')).toBeDisabled()
  })

  it('does nothing when no file is selected', async () => {
    render(<IngredientCapture {...defaultProps} />)

    const fileInput = screen.getByLabelText('Capture ingredient label')
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [] } })
    })

    // Should remain in idle state
    expect(screen.getByText('Capture Ingredient Label')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('always shows the tip text regardless of state', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: 'OCR failed',
          code: 'OCR_EXTRACTION_FAILED',
          retryable: true,
        }),
    })

    render(<IngredientCapture {...defaultProps} />)

    // Tip visible in idle state
    expect(screen.getByText('Make sure the text is well-lit and in focus')).toBeInTheDocument()

    // Trigger OCR failure to go to manual entry
    const fileInput = screen.getByLabelText('Capture ingredient label')
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [createMockFile()] } })
    })

    await waitFor(() => {
      expect(screen.getByLabelText('Manual ingredient entry')).toBeInTheDocument()
    })

    // Tip still visible in manual entry state
    expect(screen.getByText('Make sure the text is well-lit and in focus')).toBeInTheDocument()
  })
})
