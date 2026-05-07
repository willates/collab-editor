import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, unauthorized } from '@/lib/session'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth) return unauthorized()

  const { id } = await params
  const docId = Number(id)
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: { sharedAccess: true },
  })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const hasAccess =
    doc.ownerId === auth.userId || doc.sharedAccess.some((s) => s.userId === auth.userId)
  if (!hasAccess) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(doc)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth) return unauthorized()

  const { id } = await params
  const docId = Number(id)
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: { sharedAccess: true },
  })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Owner can always edit; shared users need EDIT permission
  const sharedEntry = doc.sharedAccess.find((s) => s.userId === auth.userId)
  const canEdit = doc.ownerId === auth.userId || sharedEntry?.permission === 'EDIT'
  if (!canEdit) {
    return NextResponse.json({ error: 'You have view-only access' }, { status: 403 })
  }

  const { title, content } = await req.json()

  const updated = await prisma.document.update({
    where: { id: docId },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth) return unauthorized()

  const { id } = await params
  const docId = Number(id)
  const doc = await prisma.document.findUnique({ where: { id: docId } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (doc.ownerId !== auth.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.document.delete({ where: { id: docId } })
  return NextResponse.json({ ok: true })
}
