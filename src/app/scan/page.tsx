'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ScanModeToggle } from '@/components/scanner/ScanModeToggle'
import { CameraViewfinder } from '@/components/scanner/CameraViewfinder'
import { IngredientCapture } from '@/components/scanner/IngredientCapture'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { AppHeader } from '@/components/ui/AppHeader'
import { useScanCount } from '@/hooks/useScanCount'
import { useGuestState } from '@/hooks/useGuestState'
import AuthPromptModal from '@/components/auth/AuthPromptModal'
import type { BarcodeLookupResponse, VerdictResponse } from '@/types/api'
import type { ProductData } from '@/types/scan'

const BarcodeScannerComponent = dynamic(
  () => import('@/components/scanner/BarcodeScanner').then((mod) => mod.BarcodeScannerComponent),
  { ssr: false }
)

type ScanPhase = 'idle' | 'looking-up' | 'analyzing' | 'barcode-not-found' | 'error'

export default function ScanPage() {
  const router = useRouter()
  const { disease, dietPlan, isHydrated } = useGuestState()
  const { shouldShowSoftPrompt, shouldShowHardGate, increment } = useScanCount()

  const [mode, setMode] = useState<'barcode' | 'ingredient'>('barcode')
  const [phase, setPhase] = useState<ScanPhase>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'soft' | 'hard'>('soft')

  const checkAuthGate = useCallback((): boolean => {
    if (shouldShowHardGate) {
      setAuthMode('hard')
      setShowAuthModal(true)
      return true
    }
    return false
  }, [shouldShowHardGate])

  const showPostScanPrompt = useCallback(() => {
    increment()
    if (shouldShowSoftPrompt) {
      setAuthMode('soft')
      setShowAuthModal(true)
    }
  }, [increment, shouldShowSoftPrompt])

  const navigateToResult = useCallback(
    (verdict: VerdictResponse, product?: ProductData) => {
      const resultData = { verdict, product: product || null }
      sessionStorage.setItem('dietscan_scan_result', JSON.stringify(resultData))
      showPostScanPrompt()
      router.push('/scan/result')
    },
    [router, showPostScanPrompt]
  )

  const getVerdict = useCallback(
    async (product: { name: string; ingredients: string[]; nutrients: ProductData['nutrients'] }): Promise<VerdictResponse> => {
      const res = await fetch('/api/scan/verdict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diseaseName: disease,
          dietPlan,
          product,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to analyze product')
      }
      return res.json()
    },
    [disease, dietPlan]
  )

  const handleBarcodeDecode = useCallback(
    async (barcode: string) => {
      if (checkAuthGate()) return

      setPhase('looking-up')
      setErrorMessage('')

      try {
        const lookupRes = await fetch('/api/scan/barcode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barcode }),
        })

        if (!lookupRes.ok) {
          const err = await lookupRes.json()
          throw new Error(err.error || 'Product lookup failed')
        }

        const lookupData: BarcodeLookupResponse = await lookupRes.json()

        if (!lookupData.found || !lookupData.product) {
          setPhase('barcode-not-found')
          return
        }

        setPhase('analyzing')
        const product = lookupData.product
        const verdict = await getVerdict({
          name: product.name,
          ingredients: product.ingredients,
          nutrients: product.nutrients,
        })

        navigateToResult(verdict, product)
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Something went wrong')
        setPhase('error')
      }
    },
    [checkAuthGate, getVerdict, navigateToResult]
  )

  const handleIngredientsExtracted = useCallback(
    async (ingredients: string[], rawText: string) => {
      if (checkAuthGate()) return

      setPhase('analyzing')
      setErrorMessage('')

      try {
        const verdict = await getVerdict({
          name: 'Scanned Ingredients',
          ingredients,
          nutrients: { sodium: 0, sugar: 0, carbohydrates: 0, fat: 0, protein: 0, fiber: 0, saturatedFat: 0, transFat: 0 },
        })

        navigateToResult(verdict)
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Something went wrong')
        setPhase('error')
      }
    },
    [checkAuthGate, getVerdict, navigateToResult]
  )

  const handleSwitchToIngredient = useCallback(() => {
    setMode('ingredient')
    setPhase('idle')
    setErrorMessage('')
  }, [])

  const handleRetry = useCallback(() => {
    setPhase('idle')
    setErrorMessage('')
  }, [])

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafaf8]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!disease || !dietPlan) {
    router.push('/setup')
    return null
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-[#fafaf8]">
      <AppHeader title="Scan Food" />
      <div className="flex justify-center bg-white/80 px-4 pb-3">
        <ScanModeToggle mode={mode} onModeChange={(m) => { setMode(m); setPhase('idle'); setErrorMessage('') }} />
      </div>

      <main className="flex flex-1 flex-col gap-4 p-4">
        {(phase === 'looking-up' || phase === 'analyzing') && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-600">
              {phase === 'looking-up' ? 'Looking up product...' : 'Analyzing against your diet plan...'}
            </p>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
            <p className="text-center text-sm text-red-600" role="alert">{errorMessage}</p>
            <Button onClick={handleRetry}>Try Again</Button>
          </div>
        )}

        {phase === 'barcode-not-found' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">Product not found</p>
              <p className="mt-1 text-sm text-gray-600">
                This barcode isn&apos;t in our database. You can scan the ingredient label instead.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleRetry}>Scan Again</Button>
              <Button onClick={handleSwitchToIngredient}>Scan Ingredients</Button>
            </div>
          </div>
        )}

        {phase === 'idle' && mode === 'barcode' && (
          <div className="relative overflow-hidden rounded-xl">
            <BarcodeScannerComponent
              onDecode={handleBarcodeDecode}
              onError={(err) => { setErrorMessage(err.message); setPhase('error') }}
            />
            <CameraViewfinder active={true} />
          </div>
        )}

        {phase === 'idle' && mode === 'ingredient' && (
          <IngredientCapture
            onIngredientsExtracted={handleIngredientsExtracted}
            onError={(err) => setErrorMessage(err)}
          />
        )}
      </main>

      {showAuthModal && (
        <AuthPromptModal
          mode={authMode}
          onSignIn={() => setShowAuthModal(false)}
          onDismiss={() => setShowAuthModal(false)}
        />
      )}
    </div>
  )
}
