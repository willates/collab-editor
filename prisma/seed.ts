import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('password123', 10)

  const alice = await prisma.user.upsert({
    where: { email: 'alice@test.com' },
    update: {},
    create: { email: 'alice@test.com', passwordHash: hash },
  })

  const bob = await prisma.user.upsert({
    where: { email: 'bob@test.com' },
    update: {},
    create: { email: 'bob@test.com', passwordHash: hash },
  })

  // Sample document owned by Alice
  const welcomeDoc = await prisma.document.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      title: 'Welcome Document',
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Welcome to Collab Editor' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'This document is owned by Alice and shared with Bob.',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  { type: 'paragraph', content: [{ type: 'text', text: 'Bold, italic, underline formatting' }] },
                ],
              },
              {
                type: 'listItem',
                content: [
                  { type: 'paragraph', content: [{ type: 'text', text: 'Headings H1 and H2' }] },
                ],
              },
              {
                type: 'listItem',
                content: [
                  { type: 'paragraph', content: [{ type: 'text', text: 'Auto-saving every 1.5 seconds' }] },
                ],
              },
            ],
          },
        ],
      },
      ownerId: alice.id,
    },
  })

  // Share Alice's doc with Bob
  await prisma.sharedAccess.upsert({
    where: { documentId_userId: { documentId: welcomeDoc.id, userId: bob.id } },
    update: {},
    create: { documentId: welcomeDoc.id, userId: bob.id },
  })

  console.log('Seeded users:', { alice: alice.email, bob: bob.email })
  console.log('Seeded document:', welcomeDoc.title, '(shared with bob)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
