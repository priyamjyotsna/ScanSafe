'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { IngredientOCRResponse, ApiErrorResponse } from '@/types/api'

export interface IngredientCaptureProps {
  onIngredientsExtracted: (ingredients: string[], rawText: string) => void
  onError?: (error: string) => void
}

type CaptureState = 'idle' | 'camera' | 'processing' | 'manual-entry'

export function IngredientCapture({ onIngredientsExtracted, onError }: IngredientCaptureProps) {
  const [state, setState] = useState<CaptureState>('idle')
  const [manualText, setManualText] = useState('')
  const [cameraError, setCameraError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [hasCamera, setHasCamera] = useState(false)
  const [pendingStream, setPendingStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    setHasCamera(!!navigator.mediaDevices?.getUserMedia)
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setPendingStream(null)
  }, [])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  // Attach stream to video element once the camera view is rendered
  useEffect(() => {
    if (state === 'camera' && pendingStream && videoRef.current) {
      const video = videoRef.current
      video.srcObject = pendingStream
      video.onloadedmetadata = () => {
        video.play().catch(() => {
          // play() can fail if user navigates away quickly
        })
      }
      setPendingStream(null)
    }
  }, [state, pendingStream])

  const processImage = useCallback(async (base64: string) => {
    setState('processing')
    try {
      const response = await fetch('/api/scan/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      })

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json()
        onError?.(errorData.error)
        setState('manual-entry')
        return
      }

      const data: IngredientOCRResponse = await response.json()
      onIngredientsExtracted(data.ingredients, data.rawText)
      setState('idle')
    } catch {
      onError?.('Failed to process image. Please try again.')
      setState('manual-entry')
    }
  }, [onIngredientsExtracted, onError])

  const startCamera = useCallback(async () => {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera not available. Use HTTPS or upload an image instead.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      setPendingStream(stream)
      setState('camera')
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      if (error.name === 'NotAllowedError') {
        setCameraError('Camera access denied. Please allow camera permission.')
      } else if (error.name === 'NotFoundError') {
        setCameraError('No camera found on this device.')
      } else {
        setCameraError('Could not access camera. Try uploading an image instead.')
      }
    }
  }, [])

  const captureFromCamera = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    if (video.videoWidth === 0 || video.videoHeight === 0) return
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    stopCamera()
    const base64 = canvas.toDataURL('image/jpeg', 0.85)
    processImage(base64)
  }, [stopCamera, processImage])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await fileToBase64(file)
      processImage(base64)
    } catch {
      onError?.('Failed to read the image file.')
    }
  }, [processImage, onError])

  const handleManualSubmit = useCallback(() => {
    const trimmed = manualText.trim()
    if (!trimmed) return
    const ingredients = trimmed
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    onIngredientsExtracted(ingredients, trimmed)
  }, [manualText, onIngredientsExtracted])

  const handleRetryCapture = useCallback(() => {
    setCameraError('')
    setState('idle')
  }, [])

  const handleCancelCamera = useCallback(() => {
    stopCamera()
    setState('idle')
  }, [stopCamera])

  if (state === 'processing') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-gray-600">Reading ingredients...</p>
      </div>
    )
  }

  if (state === 'camera') {
    return (
      <div className="flex flex-col gap-3">
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            style={{ minHeight: 300 }}
            playsInline
            muted
            autoPlay
            aria-label="Camera viewfinder for ingredient label"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleCancelCamera} className="flex-1">
            Cancel
          </Button>
          <Button onClick={captureFromCamera} className="flex-1">
            Capture
          </Button>
        </div>
      </div>
    )
  }

  if (state === 'manual-entry') {
    return (
      <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm font-medium text-gray-900">Type or paste ingredients</p>
          <p className="mt-1 text-xs text-gray-500">Separate each ingredient with a comma or new line.</p>
        </div>
        <textarea
          className="min-h-[120px] w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          placeholder="e.g. sugar, palm oil, wheat flour, salt..."
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          aria-label="Ingredient list"
        />
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleRetryCapture} className="flex-1">
            Back
          </Button>
          <Button onClick={handleManualSubmit} disabled={!manualText.trim()} className="flex-1">
            Analyze
          </Button>
        </div>
      </div>
    )
  }

  // idle state
  return (
    <div className="flex flex-col gap-4">
      {cameraError && (
        <div className="rounded-lg bg-red-50 p-3">
          <p className="text-sm text-red-700" role="alert">{cameraError}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl bg-white p-6 shadow-sm">
        <p className="text-center text-sm text-gray-600">
          Take a photo of the ingredient label or upload an image
        </p>

        <div className="flex flex-col gap-2">
          {hasCamera && (
            <Button onClick={startCamera} className="w-full">
              Open Camera
            </Button>
          )}

          <Button
            variant={hasCamera ? 'secondary' : 'primary'}
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            Upload Image
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
            aria-label="Upload ingredient image"
          />
        </div>

        <button
          type="button"
          className="mt-2 text-sm text-green-600 hover:text-green-700"
          onClick={() => setState('manual-entry')}
        >
          Type ingredients manually
        </button>
      </div>
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
