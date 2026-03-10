import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { diseaseName } = await req.json()
  if (!diseaseName) return NextResponse.json({ error: 'diseaseName required' }, { status: 400 })

  await prisma.$transaction([
    prisma.userDisease.updateMany({ where: { userId }, data: { isActive: false } }),
    prisma.userDisease.updateMany({ where: { userId, diseaseName }, data: { isActive: true } }),
  ])

  return NextResponse.json({ success: true })
}
