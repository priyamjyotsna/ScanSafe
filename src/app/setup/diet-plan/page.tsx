'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { DietPlanCard } from '@/components/diet-plan/DietPlanCard'
import { MedicalDisclaimer } from '@/components/ui/MedicalDisclaimer'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { AppHeader } from '@/components/ui/AppHeader'
import { useGuestState } from '@/hooks/useGuestState'
import type { DietPlan } from '@/types/diet'
import type { DietPlanGenerateResponse, ApiErrorResponse } from '@/types/api'

type PageState = 'loading' | 'ready' | 'saving' | 'error'

export default function DietPlanReviewPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { disease, setDietPlan } = useGuestState()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [plan, setPlan] = useState<DietPlan | null>(null)
  const [isCustomized, setIsCustomized] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  async function fetchDietPlan(diseaseName: string) {
    setPageState('loading')
    setErrorMessage('')
    try {
      const res = await fetch('/api/diet-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diseaseName }),
      })
      if (!res.ok) {
        const err: ApiErrorResponse = await res.json()
        throw new Error(err.error || 'Failed to generate diet plan')
      }
      const data: DietPlanGenerateResponse = await res.json()
      setPlan(data.dietPlan)
      setPageState('ready')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
      setPageState('error')
    }
  }

  useEffect(() => {
    if (disease) fetchDietPlan(disease)
  }, [disease])

  function handleSave(updatedPlan: DietPlan, customized: boolean) {
    setPlan(updatedPlan)
    setIsCustomized(customized)
  }

  async function handleConfirm() {
    if (!plan || !disease) return
    setPageState('saving')

    // Always save to localStorage for guest/offline use
    setDietPlan(plan)

    // If logged in, also persist to DB
    if (session?.user) {
      try {
        const res = await fetch('/api/diet-plan/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ diseaseName: disease, dietPlan: plan, isCustomized }),
        })
        if (!res.ok) {
          const err: ApiErrorResponse = await res.json()
          throw new Error(err.error || 'Failed to save')
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Could not save to your account.')
        setPageState('error')
        return
      }
    }

    router.push('/scan')
  }

  if (disease === null) return null

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      <AppHeader title="Your Diet Plan" backHref="/setup" />

      <main className="mx-auto max-w-md px-5 pb-10 pt-6">
        <p className="mb-5 text-center text-sm text-gray-500">
          Personalized for <span className="font-medium text-gray-700">{disease}</span>
        </p>

        {(pageState === 'loading' || pageState === 'saving') && (
          <div className="space-y-4">
            <div className="animate-pulse space-y-3 rounded-2xl border border-gray-100 bg-white p-5">
              <div className="h-4 w-32 rounded bg-gray-100" />
              <div className="flex gap-2">
                <div className="h-7 w-20 rounded-full bg-gray-100" />
                <div className="h-7 w-24 rounded-full bg-gray-100" />
                <div className="h-7 w-16 rounded-full bg-gray-100" />
              </div>
              <div className="h-4 w-40 rounded bg-gray-100" />
              <div className="flex gap-2">
                <div className="h-7 w-28 rounded-full bg-gray-100" />
                <div className="h-7 w-20 rounded-full bg-gray-100" />
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 py-3">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-gray-400">
                {pageState === 'saving' ? 'Saving your plan…' : 'Generating your plan…'}
              </span>
            </div>
          </div>
        )}

        {pageState === 'error' && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <p className="mb-4 text-sm text-red-700">{errorMessage}</p>
            <Button variant="primary" onClick={() => disease && fetchDietPlan(disease)}>
              Retry
            </Button>
          </div>
        )}

        {pageState === 'ready' && plan && (
          <div className="space-y-4">
            <DietPlanCard plan={plan} editable onSave={handleSave} />
            <MedicalDisclaimer />
            <Button variant="primary" className="w-full py-3" onClick={handleConfirm}>
              Save &amp; Start Scanning
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
