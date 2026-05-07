import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/session'

export default async function Home() {
  const auth = await requireAuth()
  redirect(auth ? '/dashboard' : '/login')
}
