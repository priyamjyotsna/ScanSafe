import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function Home() {
  const session = await auth()

  if (session?.user?.id) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    if (profile) {
      redirect('/scan')
    }
  }

  redirect('/setup')
}
