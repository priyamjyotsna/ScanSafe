'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { VerdictBanner } from '@/components/verdict/VerdictBanner'
import { ProductCard } from '@/components/verdict/ProductCard'
import { NutrientBreakdown } from '@/components/verdict/NutrientBreakdown'
import { MedicalDisclaimer } from '@/components/ui/MedicalDisclaimer'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AppHeader } from '@/components/ui/AppHeader'
import type { VerdictResponse } from '@/types/api'
import type { ProductData } from '@/types/scan'

interface ScanResultData {
  verdict: VerdictResponse
  product: ProductData | null
}

export default function ScanResultPage() {
  const router = useRouter()
  const [resultData, setResultData] = useState<ScanResultData | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('dietscan_scan_result')
    if (stored) {
      try {
        setResultData(JSON.parse(stored) as ScanResultData)
      } catch {
        router.push('/scan')
      }
    } else {
      router.push('/scan')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveToHistory = async () => {
    if (!resultData || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/scan/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: resultData.product?.name || 'Scanned Ingredients',
          brand: resultData.product?.brand || '',
          scanMethod: resultData.product ? 'BARCODE' : 'INGREDIENT_OCR',
          verdict: resultData.verdict.verdict,
          verdictDetail: {
            reason: resultData.verdict.reason,
            flaggedNutrients: resultData.verdict.flaggedNutrients,
          },
        }),
      })
      if (res.ok) {
        setSaved(true)
      }
    } catch {
      // Silently fail — history save is non-critical
    } finally {
      setSaving(false)
    }
  }

  const handleScanAnother = () => {
    sessionStorage.removeItem('dietscan_scan_result')
    router.push('/scan')
  }

  if (!resultData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafaf8]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const { verdict, product } = resultData
  const hasNutrients = product && Object.values(product.nutrients).some((v) => v > 0)

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-[#fafaf8]">
      <AppHeader title="Scan Result" backHref="/scan" />

      <main className="flex flex-1 flex-col gap-4 p-4">
        <VerdictBanner
          verdict={verdict.verdict}
          reason={verdict.reason}
          safeAlternative={verdict.safeAlternative}
        />

        {product && (
          <ProductCard name={product.name} brand={product.brand} />
        )}

        {hasNutrients && product && (
          <NutrientBreakdown
            nutrients={product.nutrients}
            flaggedNutrients={verdict.flaggedNutrients}
          />
        )}

        <MedicalDisclaimer />

        <div className="flex flex-col gap-3 pb-6">
          <Button onClick={handleScanAnother} className="w-full">
            Scan Another
          </Button>
          {!saved ? (
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleSaveToHistory}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save to History'}
            </Button>
          ) : (
            <p className="text-center text-sm text-green-600">✓ Saved to history</p>
          )}
        </div>
      </main>
    </div>
  )
}
