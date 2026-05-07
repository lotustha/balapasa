'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit        from '@tiptap/starter-kit'
import Underline         from '@tiptap/extension-underline'
import TextAlign         from '@tiptap/extension-text-align'
import Link              from '@tiptap/extension-link'
import Placeholder       from '@tiptap/extension-placeholder'
import { TextStyle }     from '@tiptap/extension-text-style'
import { useEffect, useCallback, useState } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  LinkIcon, Undo2, Redo2, Code, RemoveFormatting,
} from 'lucide-react'

interface Props {
  value:    string
  onChange: (html: string) => void
  placeholder?: string
}

// ── Toolbar button ────────────────────────────────────────────────────────────

function TB({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      disabled={disabled}
      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all cursor-pointer text-[13px]
        ${active  ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )
}

function Sep() { return <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" /> }

// ── Editor component ──────────────────────────────────────────────────────────

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const [mounted, setMounted] = useState(false)
  const [charCount, setCharCount] = useState(0)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading:   { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: 'rte-code-block' } },
      }),
      Underline,
      TextStyle,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'rte-link', target: '_blank', rel: 'noopener' } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write a compelling product description…' }),
    ],
    content:   value || '',
    onUpdate:  ({ editor }) => {
      const html = editor.getHTML()
      onChange(html === '<p></p>' ? '' : html)
      setCharCount(editor.getText().length)
    },
    editorProps: {
      attributes: { class: 'rte-content focus:outline-none' },
    },
  })

  useEffect(() => { setMounted(true) }, [])

  // Sync external value (e.g. AI generation)
  useEffect(() => {
    if (!editor || editor.isFocused) return
    const current = editor.getHTML()
    if (value !== current && value !== (current === '<p></p>' ? '' : current)) {
      editor.commands.setContent(value || '', false)
    }
  }, [value, editor])

  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href ?? ''
    const url  = window.prompt('Enter URL:', prev)
    if (url === null) return
    if (!url) { editor.chain().focus().unsetLink().run(); return }
    editor.chain().focus().setLink({ href: url }).run()
  }, [editor])

  if (!mounted || !editor) {
    return (
      <div className="h-48 rounded-2xl border border-slate-200 bg-slate-50 animate-pulse" />
    )
  }

  const can = editor.can().chain().focus()

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${editor.isFocused ? 'border-primary ring-2 ring-primary/15' : 'border-slate-200'}`}>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-slate-50 border-b border-slate-100">

        {/* Text style */}
        <TB title="Bold (Ctrl+B)"      onClick={() => editor.chain().focus().toggleBold().run()}          active={editor.isActive('bold')}>          <Bold          size={13} /></TB>
        <TB title="Italic (Ctrl+I)"    onClick={() => editor.chain().focus().toggleItalic().run()}        active={editor.isActive('italic')}>        <Italic        size={13} /></TB>
        <TB title="Underline (Ctrl+U)" onClick={() => editor.chain().focus().toggleUnderline().run()}     active={editor.isActive('underline')}>     <UnderlineIcon  size={13} /></TB>
        <TB title="Strikethrough"      onClick={() => editor.chain().focus().toggleStrike().run()}        active={editor.isActive('strike')}>        <Strikethrough  size={13} /></TB>
        <TB title="Inline code"        onClick={() => editor.chain().focus().toggleCode().run()}          active={editor.isActive('code')}>          <Code           size={13} /></TB>

        <Sep />

        {/* Headings */}
        <TB title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}><Heading1 size={14} /></TB>
        <TB title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}><Heading2 size={14} /></TB>
        <TB title="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}><Heading3 size={14} /></TB>

        <Sep />

        {/* Lists */}
        <TB title="Bullet list"   onClick={() => editor.chain().focus().toggleBulletList().run()}   active={editor.isActive('bulletList')}>  <List         size={14} /></TB>
        <TB title="Ordered list"  onClick={() => editor.chain().focus().toggleOrderedList().run()}  active={editor.isActive('orderedList')}> <ListOrdered  size={14} /></TB>
        <TB title="Blockquote"    onClick={() => editor.chain().focus().toggleBlockquote().run()}   active={editor.isActive('blockquote')}>  <Quote        size={13} /></TB>
        <TB title="Divider line"  onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={13} /></TB>

        <Sep />

        {/* Alignment */}
        <TB title="Align left"    onClick={() => editor.chain().focus().setTextAlign('left').run()}    active={editor.isActive({ textAlign: 'left'    })}><AlignLeft    size={13} /></TB>
        <TB title="Align center"  onClick={() => editor.chain().focus().setTextAlign('center').run()}  active={editor.isActive({ textAlign: 'center'  })}><AlignCenter  size={13} /></TB>
        <TB title="Align right"   onClick={() => editor.chain().focus().setTextAlign('right').run()}   active={editor.isActive({ textAlign: 'right'   })}><AlignRight   size={13} /></TB>
        <TB title="Justify"       onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })}><AlignJustify size={13} /></TB>

        <Sep />

        {/* Link */}
        <TB title="Insert / edit link" onClick={setLink} active={editor.isActive('link')}><LinkIcon size={13} /></TB>

        <Sep />

        {/* Clear + Undo/Redo */}
        <TB title="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
          <RemoveFormatting size={13} />
        </TB>
        <TB title="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!can.undo().run()}><Undo2 size={13} /></TB>
        <TB title="Redo (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()} disabled={!can.redo().run()}><Redo2 size={13} /></TB>
      </div>

      {/* ── Editor area ── */}
      <style>{`
        .rte-content {
          min-height: 200px;
          padding: 16px 18px;
          font-size: 0.9rem;
          line-height: 1.7;
          color: #1e293b;
        }
        .rte-content p { margin: 0 0 0.75em; }
        .rte-content p:last-child { margin-bottom: 0; }
        .rte-content h1 { font-size: 1.5rem; font-weight: 800; margin: 1.2em 0 0.5em; color: #0f172a; }
        .rte-content h2 { font-size: 1.25rem; font-weight: 700; margin: 1em 0 0.4em; color: #0f172a; }
        .rte-content h3 { font-size: 1.05rem; font-weight: 700; margin: 0.8em 0 0.3em; color: #0f172a; }
        .rte-content ul { list-style: disc; padding-left: 1.5em; margin: 0.5em 0; }
        .rte-content ol { list-style: decimal; padding-left: 1.5em; margin: 0.5em 0; }
        .rte-content li { margin: 0.2em 0; }
        .rte-content blockquote { border-left: 3px solid #16a34a; padding-left: 1em; margin: 0.75em 0; color: #475569; font-style: italic; }
        .rte-content hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.2em 0; }
        .rte-content code { background: #f1f5f9; border-radius: 4px; padding: 0.15em 0.4em; font-family: monospace; font-size: 0.85em; color: #be185d; }
        .rte-code-block { background: #1e293b; color: #e2e8f0; border-radius: 10px; padding: 1em; font-family: monospace; font-size: 0.85em; margin: 0.75em 0; white-space: pre; overflow-x: auto; }
        .rte-link { color: #16a34a; text-decoration: underline; cursor: pointer; }
        .rte-content p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #94a3b8; pointer-events: none; float: left; height: 0; }
      `}</style>
      <EditorContent editor={editor} />

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          <span>{charCount} chars</span>
          <span>{editor.getText().trim().split(/\s+/).filter(Boolean).length} words</span>
        </div>
        <p className="text-[10px] text-slate-400 hidden sm:block">
          Ctrl+B bold · Ctrl+I italic · Ctrl+K link
        </p>
      </div>
    </div>
  )
}
