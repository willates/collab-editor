'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface DocMeta {
  id: number
  title: string
  createdAt: string
  updatedAt: string
  ownerId: number
  owner?: { email: string }
}

export default function DocumentDashboard({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<'owned' | 'shared'>('owned')
  const [owned, setOwned] = useState<DocMeta[]>([])
  const [shared, setShared] = useState<DocMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/documents')
      if (res.ok) {
        const data = await res.json()
        setOwned(data.owned)
        setShared(data.shared)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  async function createDoc() {
    setCreating(true)
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled', content: { type: 'doc', content: [] } }),
      })
      if (res.ok) {
        const doc = await res.json()
        router.push(`/documents/${doc.id}`)
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        router.push(`/documents/${data.id}`)
      } else {
        alert(data.error ?? 'Upload failed')
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function deleteDoc(id: number) {
    if (!confirm('Delete this document? This cannot be undone.')) return
    await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    setOwned((prev) => prev.filter((d) => d.id !== id))
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const docs = tab === 'owned' ? owned : shared

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Documents</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-400 hidden sm:inline">{userEmail}</span>

          {/* Upload */}
          <label className="cursor-pointer">
            <span
              className={`inline-block border rounded px-3 py-1.5 text-sm hover:bg-gray-100 transition-colors ${
                uploading ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              {uploading ? 'Uploading…' : 'Upload .txt/.md'}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md"
              className="sr-only"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>

          <button
            onClick={createDoc}
            disabled={creating}
            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {creating ? 'Creating…' : '+ New Document'}
          </button>

          <button
            onClick={logout}
            className="border rounded px-3 py-1.5 text-sm hover:bg-gray-100 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b mb-5">
        {(['owned', 'shared'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'owned' ? 'My Documents' : 'Shared with Me'}
            <span className="ml-1.5 text-xs rounded-full bg-gray-100 px-1.5 py-0.5">
              {t === 'owned' ? owned.length : shared.length}
            </span>
          </button>
        ))}
      </div>

      {/* Doc list */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">
            {tab === 'owned' ? 'No documents yet' : 'Nothing shared with you yet'}
          </p>
          {tab === 'owned' && (
            <p className="text-sm">Create a new document or upload a file to get started.</p>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-stretch bg-white border rounded-lg hover:shadow-sm transition-shadow group">
              <a
                href={`/documents/${doc.id}`}
                className="flex flex-1 items-center justify-between px-4 py-3 min-w-0"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate group-hover:text-blue-600 transition-colors">
                    {doc.title || 'Untitled'}
                  </p>
                  {tab === 'shared' && doc.owner && (
                    <p className="text-xs text-gray-400 mt-0.5">by {doc.owner.email}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0 ml-4">
                  {new Date(doc.updatedAt).toLocaleDateString()}
                </span>
              </a>
              {tab === 'owned' && (
                <button
                  onClick={() => deleteDoc(doc.id)}
                  title="Delete document"
                  className="px-3 text-gray-300 hover:text-red-500 border-l transition-colors shrink-0"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
