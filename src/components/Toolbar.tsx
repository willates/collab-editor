'use client'

import { Editor } from '@tiptap/react'
import { useState } from 'react'

interface Props {
  editor: Editor | null
}

interface BtnProps {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
  disabled?: boolean
}

function Btn({ onClick, active, title, children, disabled }: BtnProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={`px-2 py-1 rounded text-sm font-medium transition-colors disabled:opacity-30 ${
        active
          ? 'bg-blue-100 text-blue-700 border border-blue-300'
          : 'text-gray-600 hover:bg-gray-100 border border-transparent'
      }`}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <span className="w-px h-5 bg-gray-200 mx-1 shrink-0" />
}

const FONT_SIZES = ['8','9','10','11','12','14','16','18','20','24','28','32','36','48','72']

const TEXT_COLORS = [
  { label: 'Default',  value: '#000000' },
  { label: 'White',    value: '#ffffff' },
  { label: 'Grey',     value: '#6b7280' },
  { label: 'Red',      value: '#dc2626' },
  { label: 'Orange',   value: '#ea580c' },
  { label: 'Yellow',   value: '#ca8a04' },
  { label: 'Green',    value: '#16a34a' },
  { label: 'Blue',     value: '#2563eb' },
  { label: 'Purple',   value: '#9333ea' },
  { label: 'Pink',     value: '#db2777' },
]

const HIGHLIGHT_COLORS = [
  { label: 'None',     value: '' },
  { label: 'Yellow',   value: '#fef08a' },
  { label: 'Green',    value: '#bbf7d0' },
  { label: 'Cyan',     value: '#a5f3fc' },
  { label: 'Pink',     value: '#fbcfe8' },
  { label: 'Orange',   value: '#fed7aa' },
  { label: 'Purple',   value: '#e9d5ff' },
  { label: 'Red',      value: '#fecaca' },
  { label: 'Blue',     value: '#bfdbfe' },
]

const LINE_HEIGHTS = [
  { label: '1',    value: '1' },
  { label: '1.15', value: '1.15' },
  { label: '1.5',  value: '1.5' },
  { label: '2',    value: '2' },
]

const HEADING_OPTIONS = [
  { label: 'Normal',    level: 0 },
  { label: 'Heading 1', level: 1 },
  { label: 'Heading 2', level: 2 },
  { label: 'Heading 3', level: 3 },
]

export default function Toolbar({ editor }: Props) {
  const [showHeading,   setShowHeading]   = useState(false)
  const [showSpacing,   setShowSpacing]   = useState(false)
  const [showFormat,    setShowFormat]    = useState(false)
  const [showColor,     setShowColor]     = useState(false)
  const [showHighlight, setShowHighlight] = useState(false)
  const [fontSize,      setFontSize]      = useState('12')
  const [textColor,     setTextColor]     = useState('#000000')
  const [hlColor,       setHlColor]       = useState('#fef08a')

  if (!editor) return null

  function currentHeadingLabel() {
    if (editor!.isActive('heading', { level: 1 })) return 'Heading 1'
    if (editor!.isActive('heading', { level: 2 })) return 'Heading 2'
    if (editor!.isActive('heading', { level: 3 })) return 'Heading 3'
    return 'Normal'
  }

  function applyFontSize(size: string) {
    setFontSize(size)
    editor!.chain().focus().setFontSize(`${size}pt`).run()
  }

  function applyColor(color: string) {
    setTextColor(color)
    editor!.chain().focus().setColor(color).run()
    setShowColor(false)
  }

  function applyHighlight(color: string) {
    setHlColor(color)
    if (color === '') {
      editor!.chain().focus().unsetHighlight().run()
    } else {
      editor!.chain().focus().setHighlight({ color }).run()
    }
    setShowHighlight(false)
  }

  function closeAll() {
    setShowHeading(false)
    setShowSpacing(false)
    setShowFormat(false)
    setShowColor(false)
    setShowHighlight(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5 bg-[#f8f9fa] border-b border-gray-200 no-print">

      {/* Undo / Redo */}
      <Btn onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)" disabled={!editor.can().undo()}>↩</Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)"  disabled={!editor.can().redo()}>↪</Btn>
      <Sep />

      {/* Paragraph / Heading style */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); closeAll(); setShowHeading(v => !v) }}
          className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
        >
          <span className="min-w-[72px] text-left">{currentHeadingLabel()}</span>
          <span className="text-xs text-gray-400">▾</span>
        </button>
        {showHeading && (
          <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[140px]">
            {HEADING_OPTIONS.map(({ label, level }) => (
              <button
                key={level}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  if (level === 0) editor.chain().focus().setParagraph().run()
                  else editor.chain().focus().toggleHeading({ level: level as 1|2|3 }).run()
                  setShowHeading(false)
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                  currentHeadingLabel() === label ? 'font-semibold text-blue-600' : ''
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Font size */}
      <select
        value={fontSize}
        onChange={(e) => applyFontSize(e.target.value)}
        className="border rounded px-1 py-0.5 text-sm w-14 text-gray-600"
        title="Font size"
      >
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <Sep />

      {/* Text formatting */}
      <Btn onClick={() => editor.chain().focus().toggleBold().run()}      active={editor.isActive('bold')}      title="Bold (Ctrl+B)"><strong>B</strong></Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()}    active={editor.isActive('italic')}    title="Italic (Ctrl+I)"><em>I</em></Btn>
      <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)"><span className="underline">U</span></Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()}    active={editor.isActive('strike')}    title="Strikethrough"><span className="line-through">S</span></Btn>

      <Sep />

      {/* Text color */}
      <div className="relative">
        <button
          type="button"
          title="Text color"
          onMouseDown={(e) => { e.preventDefault(); closeAll(); setShowColor(v => !v) }}
          className="flex flex-col items-center px-1.5 py-0.5 rounded hover:bg-gray-100"
        >
          <span className="text-sm font-bold leading-tight" style={{ color: textColor }}>A</span>
          <span className="w-4 h-1 rounded-sm mt-0.5" style={{ backgroundColor: textColor }} />
        </button>
        {showColor && (
          <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 p-3 min-w-[160px]">
            <p className="text-xs font-medium text-gray-500 mb-2">Text color</p>
            <div className="grid grid-cols-5 gap-1.5">
              {TEXT_COLORS.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  title={label}
                  onMouseDown={(e) => { e.preventDefault(); applyColor(value) }}
                  className="w-8 h-8 rounded hover:scale-110 transition-all"
                  style={{
                    backgroundColor: value,
                    border: value === '#ffffff' ? '2px solid #d1d5db' : '2px solid transparent',
                    outline: '1px solid #e5e7eb',
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Highlight */}
      <div className="relative">
        <button
          type="button"
          title="Highlight color"
          onMouseDown={(e) => { e.preventDefault(); closeAll(); setShowHighlight(v => !v) }}
          className="flex flex-col items-center px-1.5 py-0.5 rounded hover:bg-gray-100"
        >
          <span className="text-sm font-bold leading-tight px-0.5" style={{ backgroundColor: hlColor || 'transparent' }}>H</span>
          <span className="w-4 h-1 rounded-sm mt-0.5" style={{ backgroundColor: hlColor || '#e5e7eb' }} />
        </button>
        {showHighlight && (
          <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 p-3 min-w-[180px]">
            <p className="text-xs font-medium text-gray-500 mb-2">Highlight color</p>
            <div className="grid grid-cols-5 gap-1.5">
              {HIGHLIGHT_COLORS.map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  title={label}
                  onMouseDown={(e) => { e.preventDefault(); applyHighlight(value) }}
                  className="w-8 h-8 rounded border-2 border-gray-200 hover:border-blue-400 hover:scale-110 transition-all flex items-center justify-center"
                  style={{ backgroundColor: value || 'white' }}
                >
                  {value === '' && <span className="text-xs text-gray-500 font-bold">✕</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Sep />

      {/* Alignment */}
      <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()}    active={editor.isActive({ textAlign: 'left' })}    title="Align left">≡L</Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()}  active={editor.isActive({ textAlign: 'center' })}  title="Center">≡C</Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()}   active={editor.isActive({ textAlign: 'right' })}   title="Align right">≡R</Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify">≡J</Btn>

      <Sep />

      {/* Line spacing */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); closeAll(); setShowSpacing(v => !v) }}
          className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
          title="Line spacing"
        >
          <span>↕</span>
          <span className="text-xs text-gray-400">▾</span>
        </button>
        {showSpacing && (
          <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[80px]">
            {LINE_HEIGHTS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setLineHeight(value).run(); setShowSpacing(false) }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <Sep />

      {/* Lists */}
      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()}  active={editor.isActive('bulletList')}  title="Bullet list">• List</Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">1. List</Btn>

      <Sep />

      {/* Format dropdown */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); closeAll(); setShowFormat(v => !v) }}
          className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
        >
          Format <span className="text-xs text-gray-400">▾</span>
        </button>
        {showFormat && (
          <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[180px]">
            <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleSubscript().run();   setShowFormat(false) }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${editor.isActive('subscript')   ? 'text-blue-600 font-medium' : ''}`}>Subscript (x₂)</button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleSuperscript().run(); setShowFormat(false) }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${editor.isActive('superscript') ? 'text-blue-600 font-medium' : ''}`}>Superscript (x²)</button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCode().run();        setShowFormat(false) }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 font-mono ${editor.isActive('code')        ? 'text-blue-600 font-medium' : ''}`}>Inline Code</button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCodeBlock().run();   setShowFormat(false) }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 font-mono ${editor.isActive('codeBlock')   ? 'text-blue-600 font-medium' : ''}`}>Code Block</button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run();  setShowFormat(false) }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${editor.isActive('blockquote')  ? 'text-blue-600 font-medium' : ''}`}>Blockquote</button>
            <div className="border-t my-1" />
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().clearNodes().unsetAllMarks().run(); setShowFormat(false) }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-500"
            >
              Clear Formatting
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
