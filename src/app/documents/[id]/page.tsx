import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import DocumentEditor from '@/components/DocumentEditor'

export const dynamic = 'force-dynamic'

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth) redirect('/login')

  const { id } = await params
  const docId = Number(id)
  if (isNaN(docId)) redirect('/dashboard')

  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: { sharedAccess: true },
  })

  if (!doc) redirect('/dashboard')

  const isOwner = doc.ownerId === auth.userId
  const sharedEntry = doc.sharedAccess.find((s) => s.userId === auth.userId)
  const hasAccess = isOwner || !!sharedEntry
  if (!hasAccess) redirect('/dashboard')

  const canEdit = isOwner || sharedEntry?.permission === 'EDIT'

  return (
    <DocumentEditor
      doc={{
        id: doc.id,
        title: doc.title,
        content: doc.content as object,
      }}
      isOwner={isOwner}
      canEdit={canEdit}
      userEmail={auth.email}
    />
  )
}
