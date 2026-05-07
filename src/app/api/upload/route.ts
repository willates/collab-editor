import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, unauthorized } from '@/lib/session'

/** Convert plain text lines to a minimal Tiptap JSON document. */
function textToTiptap(text: string) {
  const lines = text.split(/\r?\n/)
  const content = lines.map((line) => ({
    type: 'paragraph',
    content: line.trim() ? [{ type: 'text', text: line }] : [],
  }))
  return { type: 'doc', content }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth) return unauthorized()

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const filename = file.name.toLowerCase()
  if (!filename.endsWith('.txt') && !filename.endsWith('.md')) {
    return NextResponse.json(
      { error: 'Unsupported file type. Only .txt and .md are accepted.' },
      { status: 400 }
    )
  }

  const text = await file.text()
  const content = textToTiptap(text)
  const title = file.name.replace(/\.(txt|md)$/i, '')

  const doc = await prisma.document.create({
    data: { title, content, ownerId: auth.userId },
  })

  return NextResponse.json(doc, { status: 201 })
}
