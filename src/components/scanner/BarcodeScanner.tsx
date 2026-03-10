'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface BarcodeScannerProps {
  onDecode: (barcode: string) => void
  onError?: (error: Error) => void
}

type ScannerStatus = 'initializing' | 'scanning' | 'decoded' | 'no-camera' | 'error'

// Type for the native BarcodeDetector API
interface DetectedBarcode {
  rawValue: string
  format: string
}

interface BarcodeDetectorAPI {
  detect(source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<DetectedBarcode[]>
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats: string[] }): BarcodeDetectorAPI
      getSupportedFormats?: () => Promise<string[]>
    }
  }
}

export function BarcodeScannerComponent({ onDecode, onError }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<ScannerStatus>('initializing')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const decodedRef = useRef(false)
  const cleanedUpRef = useRef(false)

  const handleError = useCallback(
    (error: unknown) => {
      if (cleanedUpRef.current) return
      const err = error instanceof Error ? error : new Error(String(error))
      if (err.name === 'AbortError' || err.message.includes('aborted')) return

      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMessage(
          'Camera requires a secure connection (HTTPS). On mobile, please access this app via HTTPS. On desktop, use localhost.'
        )
        setStatus('no-camera')
      } else if (err.name === 'NotAllowedError') {
        setErrorMessage('Camera access was denied. Please allow camera permission in your browser settings.')
        setStatus('error')
      } else if (err.name === 'NotFoundError') {
        setErrorMessage('No camera found on this device.')
        setStatus('error')
      } else {
        setErrorMessage('Could not start the camera. Please try again.')
        setStatus('error')
      }
      onError?.(err)
    },
    [onError]
  )

  useEffect(() => {
    cleanedUpRef.current = false
    decodedRef.current = false

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(
        'Camera requires a secure connection (HTTPS). On mobile, please access this app via HTTPS. On desktop, use localhost.'
      )
      setStatus('no-camera')
      return
    }

    let stream: MediaStream | null = null
    let animFrameId: number | null = null
    let zxingReader: import('@zxing/library').BrowserMultiFormatReader | null = null

    const startScanning = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        if (cleanedUpRef.current || !videoRef.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        const video = videoRef.current
        video.srcObject = stream

        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => {
            video.play().then(resolve).catch(reject)
          }
          video.onerror = () => reject(new Error('Video element error'))
        })

        if (cleanedUpRef.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        setStatus('scanning')

        // Try native BarcodeDetector first (much more reliable)
        if (window.BarcodeDetector) {
          try {
            const detector = new window.BarcodeDetector({
              formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'itf', 'qr_code'],
            })

            const scanWithNative = async () => {
              if (decodedRef.current || cleanedUpRef.current) return
              try {
                const barcodes = await detector.detect(video)
                if (barcodes.length > 0 && barcodes[0].rawValue && !decodedRef.current) {
                  decodedRef.current = true
                  setStatus('decoded')
                  stream?.getTracks().forEach((t) => t.stop())
                  onDecode(barcodes[0].rawValue)
                  return
                }
              } catch {
                // detect() can throw if video not ready — ignore
              }
              if (!decodedRef.current && !cleanedUpRef.current) {
                animFrameId = requestAnimationFrame(scanWithNative)
              }
            }

            animFrameId = requestAnimationFrame(scanWithNative)
            return // native detector is running, skip zxing
          } catch {
            // BarcodeDetector constructor failed, fall through to zxing
          }
        }

        // Fallback: use @zxing/library with frame-by-frame decode
        const { BrowserMultiFormatReader } = await import('@zxing/library')
        zxingReader = new BrowserMultiFormatReader()

        const scanWithZxing = () => {
          if (decodedRef.current || cleanedUpRef.current) return

          if (video.videoWidth > 0 && video.videoHeight > 0) {
            try {
              const result = zxingReader!.decode(video)
              if (result && result.getText() && !decodedRef.current) {
                decodedRef.current = true
                setStatus('decoded')
                stream?.getTracks().forEach((t) => t.stop())
                onDecode(result.getText())
                return
              }
            } catch {
              // No barcode found in this frame — expected, keep scanning
            }
          }

          if (!decodedRef.current && !cleanedUpRef.current) {
            animFrameId = requestAnimationFrame(scanWithZxing)
          }
        }

        animFrameId = requestAnimationFrame(scanWithZxing)
      } catch (error) {
        if (!cleanedUpRef.current) {
          handleError(error)
        }
      }
    }

    startScanning()

    return () => {
      cleanedUpRef.current = true
      if (animFrameId !== null) cancelAnimationFrame(animFrameId)
      try { zxingReader?.reset() } catch { /* ignore */ }
      if (stream) stream.getTracks().forEach((t) => t.stop())
      if (videoRef.current?.srcObject) {
        const s = videoRef.current.srcObject as MediaStream
        s.getTracks().forEach((t) => t.stop())
      }
    }
  }, [onDecode, handleError])

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black">
      {(status === 'error' || status === 'no-camera') ? (
        <div className="flex min-h-[300px] items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              </svg>
            </div>
            <p className="text-sm text-white" role="alert">{errorMessage}</p>
            <p className="mt-3 text-xs text-gray-400">
              Switch to Ingredient mode to upload a photo instead.
            </p>
          </div>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            style={{ minHeight: 300 }}
            playsInline
            muted
            aria-label="Camera viewfinder for barcode scanning"
          />
          {status === 'initializing' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <p className="text-sm text-white">Starting camera...</p>
            </div>
          )}
          {status === 'scanning' && (
            <div className="absolute bottom-3 left-0 right-0 text-center">
              <p className="text-xs text-white/80 drop-shadow">Point at a barcode</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default BarcodeScannerComponent
