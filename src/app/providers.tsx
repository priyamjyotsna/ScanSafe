'use client'

import { SessionProvider, useSession } from 'next-auth/react'
import { useMigration } from '@/hooks/useMigration'

function MigrationWrapper({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  useMigration(status === 'authenticated')
  return <>{children}</>
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MigrationWrapper>{children}</MigrationWrapper>
    </SessionProvider>
  )
}
