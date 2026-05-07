import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, unauthorized } from '@/lib/session'

type Params = { params: Promise<{ id: string }> }

async function getOwnedDoc(userId: number, docId: number) {
  const doc = await prisma.document.findUnique({ where: { id: docId } })
  if (!doc || doc.ownerId !== userId) return null
  return doc
}

/** List people this doc is shared with */
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth) return unauthorized()

  const { id } = await params
  const docId = Number(id)
  if (!await getOwnedDoc(auth.userId, docId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const accesses = await prisma.sharedAccess.findMany({
    where: { documentId: docId },
    include: { user: { select: { id: true, email: true } } },
  })

  return NextResponse.json(
    accesses.map((a) => ({
      userId: a.userId,
      email: a.user.email,
      permission: a.permission,
      grantedAt: a.grantedAt,
    }))
  )
}

/** Share with a user (or update existing share) */
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth) return unauthorized()

  const { id } = await params
  const docId = Number(id)
  if (!await getOwnedDoc(auth.userId, docId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, permission = 'VIEW' } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
  if (!['VIEW', 'EDIT'].includes(permission)) {
    return NextResponse.json({ error: 'Invalid permission' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { email } })
  if (!target) return NextResponse.json({ error: `No user found: ${email}` }, { status: 404 })
  if (target.id === auth.userId) {
    return NextResponse.json({ error: 'Cannot share with yourself' }, { status: 400 })
  }

  await prisma.sharedAccess.upsert({
    where: { documentId_userId: { documentId: docId, userId: target.id } },
    update: { permission },
    create: { documentId: docId, userId: target.id, permission },
  })

  return NextResponse.json({ ok: true, sharedWith: target.email, permission })
}

/** Update permission for a shared user */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth) return unauthorized()

  const { id } = await params
  const docId = Number(id)
  if (!await getOwnedDoc(auth.userId, docId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, permission } = await req.json()
  if (!['VIEW', 'EDIT'].includes(permission)) {
    return NextResponse.json({ error: 'Invalid permission' }, { status: 400 })
  }

  await prisma.sharedAccess.updateMany({
    where: { documentId: docId, userId: Number(userId) },
    data: { permission },
  })

  return NextResponse.json({ ok: true })
}

/** Remove a user's access */
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if (!auth) return unauthorized()

  const { id } = await params
  const docId = Number(id)
  if (!await getOwnedDoc(auth.userId, docId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await req.json()
  await prisma.sharedAccess.deleteMany({
    where: { documentId: docId, userId: Number(userId) },
  })

  return NextResponse.json({ ok: true })
}
