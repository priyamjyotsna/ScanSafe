'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/ui/AppHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { MedicalDisclaimer } from '@/components/ui/MedicalDisclaimer'
import type { UserProfileResponse, UserDiseaseEntry, ScanHistoryEntry } from '@/types/api'
import type { DietPlan } from '@/types/diet'

type Tab = 'conditions' | 'history'

const VERDICT_STYLES = {
  SAFE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Safe' },
  CAUTION: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Caution' },
  AVOID: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Avoid' },
}

function DiseaseCard({ entry, onSetActive }: { entry: UserDiseaseEntry; onSetActive: (name: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const plan = entry.dietPlan as DietPlan

  return (
    <div className={`rounded-2xl border bg-white transition-all ${entry.isActive ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-gray-100'}`}>
      <button
        className="flex w-full items-center justify-between px-4 py-3.5 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2.5">
          {entry.isActive && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </span>
          )}
          <span className="font-medium text-gray-900">{entry.diseaseName}</span>
          {entry.isActive && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">Active</span>}
        </div>
        <svg className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
          {plan.avoid?.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-red-500">Avoid</p>
              <div className="flex flex-wrap gap-1.5">
                {plan.avoid.map((item) => (
                  <span key={item} className="rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs text-red-700">{item}</span>
                ))}
              </div>
            </div>
          )}
          {plan.prefer?.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-600">Recommended</p>
              <div className="flex flex-wrap gap-1.5">
                {plan.prefer.map((item) => (
                  <span key={item} className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">{item}</span>
                ))}
              </div>
            </div>
          )}
          {plan.watch?.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600">Watch</p>
              <div className="flex flex-wrap gap-1.5">
                {plan.watch.map((item) => (
                  <span key={item} className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs text-amber-700">{item}</span>
                ))}
              </div>
            </div>
          )}
          {!entry.isActive && (
            <button
              onClick={() => onSetActive(entry.diseaseName)}
              className="mt-1 w-full rounded-xl border border-emerald-200 py-2 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-50"
            >
              Set as active
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function HistoryItem({ item }: { item: ScanHistoryEntry }) {
  const style = VERDICT_STYLES[item.verdict]
  const date = new Date(item.scannedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3">
      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text} ${style.border}`}>
        {style.label}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{item.productName || 'Scanned Ingredients'}</p>
        {item.brand && <p className="truncate text-xs text-gray-400">{item.brand}</p>}
      </div>
      <span className="shrink-0 text-xs text-gray-400">{date}</span>
    </div>
  )
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('conditions')
  const [switching, setSwitching] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/setup'); return }
    if (status !== 'authenticated') return

    fetch('/api/user/profile')
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: UserProfileResponse) => { setProfile(data); setLoading(false) })
      .catch(() => { setError('Could not load your profile.'); setLoading(false) })
  }, [status, router])

  async function handleSetActive(diseaseName: string) {
    if (!profile) return
    setSwitching(diseaseName)
    await fetch('/api/user/active-disease', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diseaseName }),
    })
    setProfile({
      ...profile,
      diseaseName,
      diseases: profile.diseases.map((d) => ({ ...d, isActive: d.diseaseName === diseaseName })),
    })
    setSwitching(null)
  }

  if (status === 'loading' || loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#fafaf8]"><LoadingSpinner size="lg" /></div>
  }

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      <AppHeader title="Profile" backHref="/scan" />

      <main className="mx-auto max-w-md px-5 pb-10 pt-6">
        {/* User card */}
        <div className="mb-5 flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4">
          {session?.user?.image ? (
            <img src={session.user.image} alt="" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full object-cover ring-2 ring-gray-100" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl font-semibold text-emerald-700">
              {session?.user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{session?.user?.name}</p>
            <p className="truncate text-sm text-gray-500">{session?.user?.email}</p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {/* Tabs */}
        <div className="mb-4 flex rounded-xl border border-gray-200 bg-white p-1">
          {(['conditions', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${tab === t ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'conditions' ? `Conditions${profile ? ` (${profile.diseases.length})` : ''}` : `History${profile ? ` (${profile.scanHistory.length})` : ''}`}
            </button>
          ))}
        </div>

        {profile && tab === 'conditions' && (
          <div className="space-y-3">
            {profile.diseases.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">No conditions saved yet.</p>
            )}
            {profile.diseases.map((d) => (
              <DiseaseCard
                key={d.id}
                entry={switching === d.diseaseName ? { ...d, isActive: true } : d}
                onSetActive={handleSetActive}
              />
            ))}
            <MedicalDisclaimer />
          </div>
        )}

        {profile && tab === 'history' && (
          <div className="space-y-2">
            {profile.scanHistory.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">No scans saved yet.</p>
            )}
            {profile.scanHistory.map((item) => (
              <HistoryItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
