import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppHeader } from '@/components/ui/AppHeader'

export default async function Home() {
  const session = await auth()

  if (session?.user?.id) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, diseaseName: true },
    })

    if (profile) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
          <AppHeader />
          <main className="mx-auto max-w-4xl px-5 py-12">
            <div className="mb-12 text-center">
              <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl">
                <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <h1 className="mb-3 text-4xl font-bold tracking-tight text-gray-900">Your Health Journey</h1>
              <p className="text-lg text-gray-600">Managing {profile.diseaseName} with smart food choices</p>
            </div>

            <div className="mb-10 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-white shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="mb-2 text-2xl font-bold">Ready to scan?</h2>
                  <p className="mb-6 text-emerald-100">Get instant verdicts on any food product</p>
                  <Link
                    href="/scan"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-emerald-700 shadow-lg transition-all hover:bg-emerald-50 hover:shadow-xl"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                    Start Scanning
                  </Link>
                </div>
                <div className="hidden sm:block">
                  <svg className="h-32 w-32 opacity-20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                    <path d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Link href="/scan" className="group rounded-2xl border-2 border-emerald-100 bg-white p-6 shadow-sm transition-all hover:border-emerald-300 hover:shadow-lg">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 transition-transform group-hover:scale-110">
                  <svg className="h-7 w-7 text-emerald-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Barcode Scanner</h3>
                <p className="text-sm text-gray-600">Scan product barcodes for instant nutritional analysis</p>
              </Link>

              <Link href="/scan" className="group rounded-2xl border-2 border-amber-100 bg-white p-6 shadow-sm transition-all hover:border-amber-300 hover:shadow-lg">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 transition-transform group-hover:scale-110">
                  <svg className="h-7 w-7 text-amber-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Ingredient Reader</h3>
                <p className="text-sm text-gray-600">Capture ingredient lists with OCR technology</p>
              </Link>

              <Link href="/profile" className="group rounded-2xl border-2 border-blue-100 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-lg">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 transition-transform group-hover:scale-110">
                  <svg className="h-7 w-7 text-blue-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Scan History</h3>
                <p className="text-sm text-gray-600">Review your past scans and decisions</p>
              </Link>
            </div>
          </main>
        </div>
      )
    }
  }

  // Landing page for non-authenticated or new users
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-5 py-16">
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-2xl">
            <svg className="h-14 w-14 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </div>
          
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-gray-900">
            Your Health, Your Choices
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-xl text-gray-600">
            Living with a health condition? Get personalized food guidance instantly. Scan products, understand ingredients, and make confident dietary decisions.
          </p>

          <Link
            href="/setup"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-10 py-4 text-lg font-semibold text-white shadow-xl transition-all hover:from-emerald-700 hover:to-teal-700 hover:shadow-2xl"
          >
            Start Your Journey
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        <div className="mb-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border-2 border-emerald-200 bg-white p-6 text-center shadow-md">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200">
              <svg className="h-8 w-8 text-emerald-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-bold text-gray-900">Quick Scan</h3>
            <p className="text-sm text-gray-600">Barcode or ingredient photo in seconds</p>
          </div>

          <div className="rounded-2xl border-2 border-blue-200 bg-white p-6 text-center shadow-md">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200">
              <svg className="h-8 w-8 text-blue-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-bold text-gray-900">Safe or Avoid</h3>
            <p className="text-sm text-gray-600">Clear verdicts for your condition</p>
          </div>

          <div className="rounded-2xl border-2 border-amber-200 bg-white p-6 text-center shadow-md">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200">
              <svg className="h-8 w-8 text-amber-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-bold text-gray-900">AI Diet Plans</h3>
            <p className="text-sm text-gray-600">Personalized to your needs</p>
          </div>

          <div className="rounded-2xl border-2 border-purple-200 bg-white p-6 text-center shadow-md">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200">
              <svg className="h-8 w-8 text-purple-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-bold text-gray-900">Track Progress</h3>
            <p className="text-sm text-gray-600">Review your scan history</p>
          </div>
        </div>

        <div className="mb-16 overflow-hidden rounded-3xl bg-gradient-to-br from-white to-emerald-50 p-10 shadow-xl">
          <h2 className="mb-8 text-center text-3xl font-bold text-gray-900">How It Works</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white">1</div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Tell Us Your Condition</h3>
              <p className="text-sm text-gray-600">Share your health condition like diabetes, hypertension, or allergies</p>
            </div>
            <div className="text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-xl font-bold text-white">2</div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Scan Any Product</h3>
              <p className="text-sm text-gray-600">Use your camera to scan barcodes or capture ingredient lists</p>
            </div>
            <div className="text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-cyan-600 text-xl font-bold text-white">3</div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Get Instant Guidance</h3>
              <p className="text-sm text-gray-600">Receive personalized verdicts and nutritional insights</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-10 text-center shadow-lg">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">Medical Disclaimer</p>
          <p className="text-gray-700">
            This app provides dietary guidance based on general nutritional information and should not replace professional medical advice. Always consult your healthcare provider before making significant dietary changes.
          </p>
        </div>
      </main>
    </div>
  )
}
