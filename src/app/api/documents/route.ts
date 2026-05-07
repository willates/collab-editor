import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, unauthorized } from '@/lib/session'

export async function GET() {
  const auth = await requireAuth()
  if (!auth) return unauthorized()

  const [owned, shared] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: auth.userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true, ownerId: true },
    }),
    prisma.document.findMany({
      where: { sharedAccess: { some: { userId: auth.userId } } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        ownerId: true,
        owner: { select: { email: true } },
      },
    }),
  ])

  return NextResponse.json({ owned, shared })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth) return unauthorized()

  const { title, content } = await req.json()

  const doc = await prisma.document.create({
    data: {
      title: title ?? 'Untitled',
      content: content ?? { type: 'doc', content: [] },
      ownerId: auth.userId,
    },
  })

  return NextResponse.json(doc, { status: 201 })
}
