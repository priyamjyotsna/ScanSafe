import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BarcodeScannerComponent } from './BarcodeScanner'

// Mock callback for decodeFromVideoElementContinuously
let decodeCallback: ((result: unknown, error: unknown) => void) | null = null
const mockReset = vi.fn()
const mockDecodeFromVideoElementContinuously = vi.fn((_videoEl: unknown, callback: (result: unknown, error: unknown) => void) => {
  decodeCallback = callback
})

vi.mock('@zxing/library', () => {
  class MockBrowserMultiFormatReader {
    decodeFromVideoElementContinuously = mockDecodeFromVideoElementContinuously
    reset = mockReset
  }
  return { BrowserMultiFormatReader: MockBrowserMultiFormatReader }
})

// Mock getUserMedia
const mockGetUserMedia = vi.fn()
const mockTrackStop = vi.fn()

function createMockStream() {
  return {
    getTracks: () => [{ stop: mockTrackStop }],
  }
}

// Mock HTMLVideoElement play
const mockPlay = vi.fn().mockResolvedValue(undefined)

describe('BarcodeScannerComponent', () => {
  const defaultProps = {
    onDecode: vi.fn(),
    onError: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    decodeCallback = null

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
      configurable: true,
    })

    // Mock video element play
    vi.spyOn(HTMLVideoElement.prototype, 'play').mockImplementation(mockPlay)

    mockGetUserMedia.mockResolvedValue(createMockStream())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the video element for camera viewfinder', async () => {
    render(<BarcodeScannerComponent {...defaultProps} />)
    const video = screen.getByLabelText('Camera viewfinder for barcode scanning')
    expect(video).toBeInTheDocument()
    expect(video.tagName).toBe('VIDEO')
  })

  it('shows initializing state before camera starts', () => {
    mockGetUserMedia.mockReturnValue(new Promise(() => {})) // never resolves
    render(<BarcodeScannerComponent {...defaultProps} />)
    expect(screen.getByText('Starting camera...')).toBeInTheDocument()
  })

  it('requests camera with environment facing mode', async () => {
    render(<BarcodeScannerComponent {...defaultProps} />)

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: { facingMode: 'environment' },
      })
    })
  })

  it('starts decoding from video element after camera starts', async () => {
    render(<BarcodeScannerComponent {...defaultProps} />)

    await waitFor(() => {
      expect(mockDecodeFromVideoElementContinuously).toHaveBeenCalled()
    })
  })

  it('calls onDecode with barcode string when a barcode is decoded', async () => {
    render(<BarcodeScannerComponent {...defaultProps} />)

    await waitFor(() => {
      expect(decodeCallback).not.toBeNull()
    })

    act(() => {
      decodeCallback!({ getText: () => '8901058852429' }, null)
    })

    expect(defaultProps.onDecode).toHaveBeenCalledWith('8901058852429')
  })

  it('stops camera tracks after successful decode', async () => {
    render(<BarcodeScannerComponent {...defaultProps} />)

    await waitFor(() => {
      expect(decodeCallback).not.toBeNull()
    })

    act(() => {
      decodeCallback!({ getText: () => '1234567890' }, null)
    })

    expect(mockTrackStop).toHaveBeenCalled()
    expect(mockReset).toHaveBeenCalled()
  })

  it('only decodes once even if multiple results arrive', async () => {
    render(<BarcodeScannerComponent {...defaultProps} />)

    await waitFor(() => {
      expect(decodeCallback).not.toBeNull()
    })

    act(() => {
      decodeCallback!({ getText: () => 'first' }, null)
    })
    act(() => {
      decodeCallback!({ getText: () => 'second' }, null)
    })

    expect(defaultProps.onDecode).toHaveBeenCalledTimes(1)
    expect(defaultProps.onDecode).toHaveBeenCalledWith('first')
  })

  it('shows error message when camera permission is denied', async () => {
    const notAllowedError = Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })
    mockGetUserMedia.mockRejectedValue(notAllowedError)

    render(<BarcodeScannerComponent {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Camera access was denied'
      )
    })

    expect(defaultProps.onError).toHaveBeenCalledWith(notAllowedError)
  })

  it('shows error message when no camera is found', async () => {
    const notFoundError = Object.assign(new Error('No camera'), { name: 'NotFoundError' })
    mockGetUserMedia.mockRejectedValue(notFoundError)

    render(<BarcodeScannerComponent {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No camera found on this device'
      )
    })

    expect(defaultProps.onError).toHaveBeenCalledWith(notFoundError)
  })

  it('shows generic error message for unknown camera errors', async () => {
    const genericError = new Error('Something went wrong')
    mockGetUserMedia.mockRejectedValue(genericError)

    render(<BarcodeScannerComponent {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'An error occurred while accessing the camera'
      )
    })

    expect(defaultProps.onError).toHaveBeenCalledWith(genericError)
  })

  it('calls codeReader.reset() on unmount to release camera', async () => {
    const { unmount } = render(<BarcodeScannerComponent {...defaultProps} />)

    await waitFor(() => {
      expect(mockDecodeFromVideoElementContinuously).toHaveBeenCalled()
    })

    unmount()

    expect(mockReset).toHaveBeenCalled()
  })
})
