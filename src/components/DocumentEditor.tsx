'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { Extension } from '@tiptap/core'
import Toolbar from './Toolbar'

// ─── Type declarations ────────────────────────────────────────────────────────
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineHeight: { setLineHeight: (value: string) => ReturnType }
    fontSize:   { setFontSize: (size: string) => ReturnType; unsetFontSize: () => ReturnType }
  }
}

// ─── Font size extension ──────────────────────────────────────────────────────
const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el) => el.style.fontSize || null,
          renderHTML: (attrs) => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
        },
      },
    }]
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ chain }: any) =>
        chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }: any) =>
        chain().setMark('textStyle', { fontSize: null }).run(),
    } as any
  },
})

// ─── Tab key handler ─────────────────────────────────────────────────────────
const TabHandler = Extension.create({
  name: 'tabHandler',
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.commands.sinkListItem('listItem')) return true
        // Insert a real tab via the ProseMirror transaction API so it is
        // a single character that is removed with one Backspace.
        return this.editor.commands.command(({ tr, dispatch }) => {
          if (dispatch) tr.insertText('\t')
          return true
        })
      },
      'Shift-Tab': () => {
        return this.editor.commands.liftListItem('listItem')
      },
      Backspace: () => {
        const { selection } = this.editor.state
        const { empty, $anchor } = selection

        // Case 1: cursor at the very start of a list item → lift to paragraph
        if (empty && $anchor.parentOffset === 0 && this.editor.isActive('listItem')) {
          return this.editor.commands.liftListItem('listItem')
        }

        // Case 2: cursor in a completely empty block directly after a list.
        // joinBackward would join it into the list (creating a spurious bullet).
        // Use a raw transaction so the handler always returns true and
        // joinBackward never gets a chance to run.
        if (empty && $anchor.parent.content.size === 0 && $anchor.depth >= 1) {
          const from = $anchor.before($anchor.depth)
          const to   = $anchor.after($anchor.depth)
          const nodeBefore = this.editor.state.doc.resolve(from).nodeBefore
          if (
            nodeBefore?.type.name === 'bulletList' ||
            nodeBefore?.type.name === 'orderedList'
          ) {
            return this.editor.commands.command(({ tr, dispatch }) => {
              if (dispatch) dispatch(tr.delete(from, to))
              return true
            })
          }
        }

        return false
      },
    }
  },
})

const LineHeight = Extension.create({
  name: 'lineHeight',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          lineHeight: {
            default: '1.15',
            renderHTML: (attrs) =>
              attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
            parseHTML: (el) => el.style.lineHeight || '1.15',
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setLineHeight:
        (value: string) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (['paragraph', 'heading'].includes(node.type.name)) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, lineHeight: value })
            }
          })
          if (dispatch) dispatch(tr)
          return true
        },
    }
  },
})

// ─── Markdown export helper ───────────────────────────────────────────────────
function tiptapToMarkdown(doc: Record<string, unknown>): string {
  function inline(nodes: unknown[]): string {
    return (nodes || [])
      .map((n: unknown) => {
        const node = n as Record<string, unknown>
        if (node.type === 'text') {
          let t = (node.text as string) || ''
          const marks = (node.marks as Array<{ type: string }>) || []
          if (marks.some((m) => m.type === 'bold')) t = `**${t}**`
          if (marks.some((m) => m.type === 'italic')) t = `*${t}*`
          if (marks.some((m) => m.type === 'underline')) t = `<u>${t}</u>`
          return t
        }
        return ''
      })
      .join('')
  }

  function block(n: Record<string, unknown>): string {
    const content = n.content as unknown[] || []
    switch (n.type) {
      case 'heading': {
        const level = (n.attrs as Record<string, number>)?.level || 1
        return '#'.repeat(level) + ' ' + inline(content)
      }
      case 'paragraph':
        return inline(content)
      case 'bulletList':
        return content
          .map((li) => {
            const item = li as Record<string, unknown>
            const inner = ((item.content as unknown[]) || [])
              .map((p) => inline((p as Record<string, unknown[]>).content || []))
              .join(' ')
            return `- ${inner}`
          })
          .join('\n')
      case 'orderedList':
        return content
          .map((li, i) => {
            const item = li as Record<string, unknown>
            const inner = ((item.content as unknown[]) || [])
              .map((p) => inline((p as Record<string, unknown[]>).content || []))
              .join(' ')
            return `${i + 1}. ${inner}`
          })
          .join('\n')
      default:
        return inline(content)
    }
  }

  return ((doc.content as unknown[]) || [])
    .map((n) => block(n as Record<string, unknown>))
    .join('\n\n')
}

// ─── Page layout constants ────────────────────────────────────────────────────
const PAGE_W    = 816
const PAGE_H    = 1056
const PAGE_PAD  = 96
const PAGE_GAP  = 16
const CONTENT_H = PAGE_H - PAGE_PAD * 2   // 864 px usable per page

// ─── Types ────────────────────────────────────────────────────────────────────
interface DocData { id: number; title: string; content: object }

interface SharedUser {
  userId: number
  email: string
  permission: 'VIEW' | 'EDIT'
  grantedAt: string
}

interface Props {
  doc: DocData
  isOwner: boolean
  canEdit: boolean
  userEmail: string
}

type SaveStatus = 'saved' | 'unsaved' | 'saving'

// ─── Component ────────────────────────────────────────────────────────────────
export default function DocumentEditor({ doc, isOwner, canEdit, userEmail }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(doc.title)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [showShare, setShowShare] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [sharePermission, setSharePermission] = useState<'VIEW' | 'EDIT'>('VIEW')
  const [shareMsg, setShareMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([])
  const [pendingPermissions, setPendingPermissions] = useState<Record<number, 'VIEW' | 'EDIT'>>({})
  const [permSaveMsg, setPermSaveMsg] = useState<Record<number, string>>({})
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [numPages, setNumPages] = useState(1)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const contentRef = useRef<object>(doc.content)
  const titleRef = useRef(doc.title)
  const exportRef = useRef<HTMLDivElement>(null)
  // Close export dropdown on outside click
  useEffect(() => {
    if (!showExport) return
    function handle(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showExport])

  // Fetch shared users when share panel opens
  useEffect(() => {
    if (!showShare || !isOwner) return
    fetch(`/api/documents/${doc.id}/share`)
      .then((r) => r.json())
      .then(setSharedUsers)
      .catch(() => {})
  }, [showShare, doc.id, isOwner])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      LineHeight,
      TabHandler,
    ],
    content: doc.content,
    editable: canEdit,
    editorProps: {
      attributes: {
        class:
          'prose prose-base max-w-none focus:outline-none min-h-[864px] [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2',
      },
      // handleKeyDown runs before ALL plugin keymaps (including baseKeymap's
      // joinBackward), so returning true here definitively blocks joinBackward
      // from converting an empty post-list paragraph into a list item.
      handleKeyDown(view, event) {
        if (event.key !== 'Backspace') return false
        const { selection } = view.state
        const { empty, $anchor } = selection
        if (!empty || $anchor.depth < 1 || $anchor.parent.content.size !== 0) return false
        const from = $anchor.before($anchor.depth)
        const nodeBefore = view.state.doc.resolve(from).nodeBefore
        if (
          nodeBefore?.type.name === 'bulletList' ||
          nodeBefore?.type.name === 'orderedList'
        ) {
          view.dispatch(view.state.tr.delete(from, $anchor.after($anchor.depth)))
          return true
        }
        return false
      },
    },
    onCreate({ editor }) {
      const h = editor.view.dom.offsetHeight
      setNumPages(Math.max(1, Math.ceil(h / CONTENT_H)))
    },
    onUpdate({ editor }) {
      const json = editor.getJSON()
      contentRef.current = json
      scheduleSave()
      const h = editor.view.dom.offsetHeight
      setNumPages(Math.max(1, Math.ceil(h / CONTENT_H)))
    },
  })

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setEditable(canEdit)
  }, [editor, canEdit])

  const persist = useCallback(async () => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleRef.current, content: contentRef.current }),
      })
      if (res.ok) {
        setSaveStatus('saved')
        setLastSaved(new Date())
      } else {
        setSaveStatus('unsaved')
      }
    } catch {
      setSaveStatus('unsaved')
    }
  }, [doc.id])

  function scheduleSave() {
    setSaveStatus('unsaved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(persist, 1500)
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    titleRef.current = e.target.value
    setTitle(e.target.value)
    scheduleSave()
  }

  // ── Sharing ────────────────────────────────────────────────────────────────
  async function handleShare(e: React.FormEvent) {
    e.preventDefault()
    setShareMsg(null)
    const res = await fetch(`/api/documents/${doc.id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: shareEmail, permission: sharePermission }),
    })
    const data = await res.json()
    if (res.ok) {
      setShareMsg({ text: `Shared with ${shareEmail}`, ok: true })
      setShareEmail('')
      fetch(`/api/documents/${doc.id}/share`)
        .then((r) => r.json())
        .then(setSharedUsers)
    } else {
      setShareMsg({ text: data.error ?? 'Failed to share', ok: false })
    }
  }

  async function removeShared(userId: number) {
    await fetch(`/api/documents/${doc.id}/share`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    setSharedUsers((prev) => prev.filter((u) => u.userId !== userId))
    setPendingPermissions((prev) => { const n = { ...prev }; delete n[userId]; return n })
  }

  function handlePermissionChange(userId: number, permission: 'VIEW' | 'EDIT') {
    setPendingPermissions((prev) => ({ ...prev, [userId]: permission }))
    setPermSaveMsg((prev) => { const n = { ...prev }; delete n[userId]; return n })
  }

  async function savePermission(userId: number) {
    const permission = pendingPermissions[userId]
    if (!permission) return
    const res = await fetch(`/api/documents/${doc.id}/share`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, permission }),
    })
    if (res.ok) {
      setSharedUsers((prev) =>
        prev.map((u) => (u.userId === userId ? { ...u, permission } : u))
      )
      setPendingPermissions((prev) => { const n = { ...prev }; delete n[userId]; return n })
      setPermSaveMsg((prev) => ({ ...prev, [userId]: 'Saved' }))
    } else {
      setPermSaveMsg((prev) => ({ ...prev, [userId]: 'Failed' }))
    }
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  function exportPDF() {
    setShowExport(false)
    setTimeout(() => window.print(), 100)
  }

  function exportMarkdown() {
    if (!editor) return
    const json = editor.getJSON()
    const md = `# ${title}\n\n${tiptapToMarkdown(json as Record<string, unknown>)}`
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || 'document'}.md`
    a.click()
    URL.revokeObjectURL(url)
    setShowExport(false)
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const statusColor =
    saveStatus === 'saved'
      ? 'text-green-600'
      : saveStatus === 'saving'
      ? 'text-blue-500'
      : 'text-amber-500'

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="no-print flex items-center gap-3 px-4 py-2 border-b bg-white shrink-0 z-20">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          title="Back to dashboard"
        >
          ←
        </button>

        {/* Doc title */}
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          readOnly={!canEdit}
          className="flex-1 min-w-0 text-base font-medium bg-transparent border-none outline-none truncate placeholder-gray-300"
          placeholder="Untitled document"
        />

        <span className={`text-xs shrink-0 ${statusColor}`}>
          {saveStatus === 'saving'
            ? 'Saving…'
            : saveStatus === 'unsaved'
            ? 'Unsaved changes'
            : lastSaved
            ? `Saved at ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Saved'}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Export dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setShowExport((v) => !v)}
              className="border rounded px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
            >
              Export ▾
            </button>
            {showExport && (
              <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-xl z-50 min-w-[160px]">
                <button
                  onClick={exportPDF}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50"
                >
                  Export as PDF
                </button>
                <button
                  onClick={exportMarkdown}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50"
                >
                  Export as Markdown
                </button>
              </div>
            )}
          </div>

          {isOwner && (
            <button
              onClick={() => {
                setShowShare((v) => !v)
                setShareMsg(null)
              }}
              className="bg-[#1a73e8] text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Share
            </button>
          )}

          <span className="text-xs text-gray-400 hidden lg:inline">{userEmail}</span>

          <button
            onClick={logout}
            className="border rounded px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* ── Share panel ─────────────────────────────────────────────────── */}
      {showShare && isOwner && (
        <div className="no-print border-b bg-white px-6 py-4 shrink-0 shadow-sm z-10">
          <div className="max-w-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Share document</h3>
              <button
                onClick={() => setShowShare(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleShare} className="flex gap-2 mb-3">
              <input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="Add email address"
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <select
                value={sharePermission}
                onChange={(e) => setSharePermission(e.target.value as 'VIEW' | 'EDIT')}
                className="border rounded-lg px-2 py-2 text-sm"
              >
                <option value="VIEW">Viewer</option>
                <option value="EDIT">Editor</option>
              </select>
              <button
                type="submit"
                className="bg-[#1a73e8] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Share
              </button>
            </form>

            {shareMsg && (
              <p className={`text-sm mb-3 ${shareMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                {shareMsg.text}
              </p>
            )}

            {sharedUsers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  People with access
                </p>
                <ul className="space-y-2">
                  {sharedUsers.map((u) => {
                    const pending = pendingPermissions[u.userId]
                    const hasPending = pending !== undefined && pending !== u.permission
                    const msg = permSaveMsg[u.userId]
                    return (
                      <li key={u.userId} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-700 truncate">{u.email}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={pending ?? u.permission}
                            onChange={(e) =>
                              handlePermissionChange(u.userId, e.target.value as 'VIEW' | 'EDIT')
                            }
                            className="border rounded px-2 py-1 text-xs"
                          >
                            <option value="VIEW">Viewer</option>
                            <option value="EDIT">Editor</option>
                          </select>
                          {hasPending && (
                            <button
                              onClick={() => savePermission(u.userId)}
                              className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                            >
                              Save
                            </button>
                          )}
                          {msg && (
                            <span className={`text-xs ${msg === 'Saved' ? 'text-green-600' : 'text-red-500'}`}>
                              {msg}
                            </span>
                          )}
                          <button
                            onClick={() => removeShared(u.userId)}
                            className="text-red-400 hover:text-red-600 text-xs font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Viewer banner ────────────────────────────────────────────────── */}
      {!canEdit && (
        <div className="no-print shrink-0 bg-blue-50 border-b border-blue-200 text-blue-700 text-sm text-center py-2">
          You can only view this document — contact the owner to request edit access
        </div>
      )}

      {/* ── Formatting toolbar ───────────────────────────────────────────── */}
      {canEdit && (
        <div className="no-print shrink-0 z-10">
          <Toolbar editor={editor} />
        </div>
      )}

      {/* ── Page scroll area ─────────────────────────────────────────────── */}
      <main
        id="doc-scroll-area"
        className="flex-1 overflow-auto bg-[#e8eaed]"
        onClick={() => setShowExport(false)}
      >
        <div className="py-8 flex justify-center">
          <div
            style={{
              position: 'relative',
              width: PAGE_W,
              minHeight: numPages * PAGE_H + (numPages - 1) * PAGE_GAP,
            }}
          >
            {/* Layer 1 – white paper sheets */}
            {Array.from({ length: numPages }, (_, i) => (
              <div
                key={i}
                className="no-print"
                style={{
                  position: 'absolute',
                  top: i * (PAGE_H + PAGE_GAP),
                  left: 0,
                  width: PAGE_W,
                  height: PAGE_H,
                  backgroundColor: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                  pointerEvents: 'none',
                }}
              />
            ))}

            {/* Layer 2 – editor content (transparent so sheets show through) */}
            <div
              id="doc-page"
              style={{
                position: 'relative',
                zIndex: 1,
                width: PAGE_W,
                minHeight: numPages * PAGE_H + (numPages - 1) * PAGE_GAP,
                padding: PAGE_PAD,
                backgroundColor: 'transparent',
              }}
            >
              <EditorContent editor={editor} />

              {!canEdit && (
                <p className="mt-12 text-xs text-gray-300 text-center select-none">
                  View only — you do not have edit access
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
