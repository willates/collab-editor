import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/session'
import DocumentDashboard from '@/components/DocumentDashboard'

export default async function DashboardPage() {
  const auth = await requireAuth()
  if (!auth) redirect('/login')

  return <DocumentDashboard userEmail={auth.email} />
}
