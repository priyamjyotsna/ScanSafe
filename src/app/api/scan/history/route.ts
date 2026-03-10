import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type ScanMethod = 'BARCODE' | 'INGREDIENT_OCR'
type Verdict = 'SAFE' | 'CAUTION' | 'AVOID'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { productName, brand, scanMethod, verdict, verdictDetail } = body

  if (!scanMethod || !verdict) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const entry = await prisma.scanHistory.create({
    data: {
      userId: session.user.id,
      productName: productName || null,
      brand: brand || null,
      scanMethod: scanMethod as ScanMethod,
      verdict: verdict as Verdict,
      verdictDetail: verdictDetail || null,
    },
  })

  return NextResponse.json({ id: entry.id }, { status: 201 })
}
