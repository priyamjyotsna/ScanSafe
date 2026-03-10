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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <AppHeader />

      <main className="mx-auto max-w-lg px-5 pb-10 pt-12">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl">
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Your Health Matters</h2>
          <p className="mt-3 text-base text-gray-600">
            Tell us what condition you&apos;re managing, and we&apos;ll create a personalized diet plan to help you make safer food choices.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border-2 border-emerald-200 bg-white p-6 shadow-lg">
            <label className="mb-3 block text-sm font-semibold text-gray-700">Search for your condition</label>
            <DiseaseSearchInput onSelect={handleSelect} />
          </div>

          {/* Saved diseases (logged-in users) */}
          {showSavedDiseases && (
            <div className="rounded-2xl border-2 border-blue-200 bg-white p-6 shadow-lg">
              <p className="mb-3 text-sm font-semibold text-gray-700">Your Saved Conditions</p>
              <div className="space-y-2">
                {savedDiseases.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    disabled={switching === d.diseaseName}
                    onClick={() => handleQuickSelect(d)}
                    className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3.5 text-left text-sm font-medium transition-all
                      ${d.isActive
                        ? 'border-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 shadow-md'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md'
                      }`}
                  >
                    <span>{d.diseaseName}</span>
                    {d.isActive && (
                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
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
            <div className="rounded-2xl border-2 border-purple-200 bg-white p-6 shadow-lg">
              <p className="mb-3 text-sm font-semibold text-gray-700">Recently Searched</p>
              <div className="flex flex-wrap gap-2">
                {recentDiseases.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleGuestQuickSelect(d)}
                    className="rounded-full border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-2 text-sm font-medium text-purple-700 transition-all hover:border-purple-400 hover:shadow-md"
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
            className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-4 text-base font-semibold text-white shadow-lg transition-all hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500 disabled:shadow-none"
          >
            {selectedDisease ? `Continue with ${selectedDisease}` : 'Select a condition to continue'}
          </button>

          <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-md">
            <MedicalDisclaimer />
          </div>
        </div>
      </main>
    </div>
  )
}
