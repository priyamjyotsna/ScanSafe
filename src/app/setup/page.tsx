'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { DiseaseSearchInput } from '@/components/disease/DiseaseSearchInput'
import { MedicalDisclaimer } from '@/components/ui/MedicalDisclaimer'
import { AppHeader } from '@/components/ui/AppHeader'
import { useGuestState } from '@/hooks/useGuestState'
import type { UserDiseaseEntry } from '@/types/api'

export default function DiseaseSelectionPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { setDisease, recentDiseases } = useGuestState()
  const [selectedDisease, setSelectedDisease] = useState<string | null>(null)
  const [savedDiseases, setSavedDiseases] = useState<UserDiseaseEntry[]>([])
  const [switching, setSwitching] = useState<string | null>(null)

  // Fetch saved diseases from DB for logged-in users
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/user/profile')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.diseases) setSavedDiseases(data.diseases) })
      .catch(() => {})
  }, [status])

  function handleSelect(disease: string) {
    setSelectedDisease(disease)
  }

  function handleContinue() {
    if (!selectedDisease) return
    setDisease(selectedDisease)
    router.push('/setup/diet-plan')
  }

  async function handleQuickSelect(disease: UserDiseaseEntry) {
    setSwitching(disease.diseaseName)
    if (session) {
      // Switch active disease in DB, then go straight to scan
      await fetch('/api/user/active-disease', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diseaseName: disease.diseaseName }),
      })
    }
    setDisease(disease.diseaseName)
    router.push('/scan')
  }

  async function handleGuestQuickSelect(disease: string) {
    setDisease(disease)
    router.push('/setup/diet-plan')
  }

  // Diseases to show: DB list for logged-in, localStorage list for guests
  const showSavedDiseases = status === 'authenticated' && savedDiseases.length > 0
  const showRecentDiseases = status !== 'authenticated' && recentDiseases.length > 0

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      <AppHeader />

      <main className="mx-auto max-w-md px-5 pb-10 pt-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
            <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">What condition are you managing?</h2>
          <p className="mt-1.5 text-sm text-gray-500">
            We&apos;ll create a personalized diet plan to help you make safer food choices.
          </p>
        </div>

        <div className="space-y-5">
          <DiseaseSearchInput onSelect={handleSelect} />

          {/* Saved diseases (logged-in users) */}
          {showSavedDiseases && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Your conditions</p>
              <div className="space-y-2">
                {savedDiseases.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    disabled={switching === d.diseaseName}
                    onClick={() => handleQuickSelect(d)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-all
                      ${d.isActive
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50'
                      }`}
                  >
                    <span className="font-medium">{d.diseaseName}</span>
                    {d.isActive && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        Active
                      </span>
                    )}
                    {switching === d.diseaseName && (
                      <span className="text-xs text-gray-400">Switching…</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent diseases (guest users) */}
          {showRecentDiseases && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Recent</p>
              <div className="flex flex-wrap gap-2">
                {recentDiseases.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleGuestQuickSelect(d)}
                    className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm text-gray-700 transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={!selectedDisease}
            onClick={handleContinue}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            Continue
          </button>

          <MedicalDisclaimer />
        </div>
      </main>
    </div>
  )
}
