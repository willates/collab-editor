'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { useEffect, useRef } from 'react'
import Toolbar from './Toolbar'

interface Props {
  content: object
  onUpdate: (content: object) => void
  editable?: boolean
}

export default function Editor({ content, onUpdate, editable = true }: Props) {
  // Keep onUpdate stable without triggering re-init
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content,
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose max-w-none focus:outline-none p-4 min-h-[400px]',
      },
    },
    onUpdate({ editor }) {
      onUpdateRef.current(editor.getJSON())
    },
  })

  // Sync external content changes (e.g. initial server data) without infinite loop
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const incoming = JSON.stringify(content)
    const current = JSON.stringify(editor.getJSON())
    if (incoming !== current) {
      editor.commands.setContent(content, false)
    }
  }, [editor, content])

  // Sync editable state
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setEditable(editable)
  }, [editor, editable])

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}
