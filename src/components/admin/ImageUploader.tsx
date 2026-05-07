'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, X, Link, Loader2, Star, GripVertical, Image as ImageIcon, Clipboard } from 'lucide-react'

interface Props {
  images:   string[]
  onChange: (imgs: string[]) => void
  max?:     number
}

async function uploadFile(file: File): Promise<string | null> {
  const form = new FormData()
  form.append('file', file)
  const res  = await fetch('/api/admin/upload', { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Upload failed')
  return data.url
}

export default function ImageUploader({ images, onChange, max = 10 }: Props) {
  const [isDragging,  setIsDragging]  = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [showUrl,     setShowUrl]     = useState(false)
  const [pasteHint,   setPasteHint]   = useState(false)
  const [urlInput,    setUrlInput]    = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const dragOver = useRef<number | null>(null)   // drag-over index for reordering

  async function handleFiles(files: File[]) {
    if (!files.length) return
    setUploading(true); setUploadError('')
    try {
      const urls = await Promise.all(files.slice(0, max - images.length).map(uploadFile))
      onChange([...images, ...urls.filter(Boolean) as string[]])
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
    }
    setUploading(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length) handleFiles(files)
  }

  // Global paste listener — works anywhere on the page when this component is mounted
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (images.length >= max) return
      const items = Array.from(e.clipboardData?.items ?? [])
      const imageItems = items.filter(item => item.type.startsWith('image/'))
      if (!imageItems.length) return
      e.preventDefault()
      const files = imageItems.map(item => item.getAsFile()).filter(Boolean) as File[]
      if (files.length) { setPasteHint(false); handleFiles(files) }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, max])

  function addUrl() {
    const u = urlInput.trim()
    if (u && !images.includes(u)) onChange([...images, u])
    setUrlInput(''); setShowUrl(false)
  }

  function remove(i: number) { onChange(images.filter((_, j) => j !== i)) }

  function setPrimary(i: number) {
    const next = [...images]
    const [item] = next.splice(i, 1)
    next.unshift(item)
    onChange(next)
  }

  // Drag-to-reorder within the grid
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  function onItemDragStart(i: number) { setDragIdx(i) }
  function onItemDragOver(e: React.DragEvent, i: number) {
    e.preventDefault(); dragOver.current = i
  }
  function onItemDrop(e: React.DragEvent, i: number) {
    e.preventDefault(); e.stopPropagation()
    if (dragIdx === null || dragIdx === i) return
    const next = [...images]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(i, 0, moved)
    onChange(next); setDragIdx(null)
  }

  const canAdd = images.length < max

  return (
    <div className="space-y-3">
      {/* Drop zone — shows large when empty, compact when has images */}
      {canAdd && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-all cursor-pointer
            ${images.length === 0 ? 'h-36' : 'h-20'}
            ${isDragging ? 'border-primary bg-primary-bg scale-[1.01]' : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'}`}
        >
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => e.target.files && handleFiles(Array.from(e.target.files))} />

          {uploading ? (
            <><Loader2 size={22} className="animate-spin text-primary" /><p className="text-sm text-primary font-semibold">Uploading…</p></>
          ) : (
            <>
              <div className={`flex items-center justify-center rounded-xl ${isDragging ? 'bg-primary/10' : 'bg-slate-100'} ${images.length === 0 ? 'w-12 h-12' : 'w-8 h-8'}`}>
                <Upload size={images.length === 0 ? 20 : 14} className={isDragging ? 'text-primary' : 'text-slate-400'} />
              </div>
              {images.length === 0 ? (
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-slate-600">Drag & drop images here</p>
                  <p className="text-xs text-slate-400">or click to browse · JPG, PNG, WebP · max 10 MB</p>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-1">
                    <Clipboard size={11} />
                    <span>or <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono font-semibold">Ctrl+V</kbd> to paste from clipboard</span>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-500">Add more images</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">or <kbd className="px-1 py-0.5 bg-slate-100 rounded font-mono">Ctrl+V</kbd> to paste</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl flex items-center gap-1.5">
          <X size={12} /> {uploadError}
        </p>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((img, i) => (
            <div key={img + i}
              draggable
              onDragStart={() => onItemDragStart(i)}
              onDragOver={e => onItemDragOver(e, i)}
              onDrop={e => onItemDrop(e, i)}
              className={`relative rounded-xl overflow-hidden border-2 bg-slate-100 group cursor-grab aspect-square
                ${i === 0 ? 'border-primary shadow-md shadow-primary/15' : 'border-slate-200 hover:border-slate-300'}
                ${dragIdx === i ? 'opacity-50' : 'opacity-100'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="w-full h-full object-cover"
                onError={e => ((e.target as HTMLElement).style.opacity = '0.3')} />

              {/* Primary badge */}
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-primary text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  Primary
                </span>
              )}

              {/* Drag handle */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/40 rounded-lg p-0.5 cursor-grab">
                  <GripVertical size={10} className="text-white" />
                </div>
              </div>

              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-1 pb-1.5">
                {i !== 0 && (
                  <button type="button" onClick={() => setPrimary(i)}
                    title="Set as primary" className="bg-white/90 hover:bg-white rounded-lg p-1 cursor-pointer transition-colors">
                    <Star size={11} className="text-amber-500" />
                  </button>
                )}
                <button type="button" onClick={() => remove(i)}
                  className="bg-red-500 hover:bg-red-600 rounded-lg p-1 cursor-pointer transition-colors">
                  <X size={11} className="text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* URL input toggle */}
      <div>
        {!showUrl ? (
          <button type="button" onClick={() => setShowUrl(true)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary transition-colors cursor-pointer">
            <Link size={11} /> Add image by URL instead
          </button>
        ) : (
          <div className="flex gap-2">
            <input autoFocus value={urlInput} onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addUrl())}
              placeholder="https://example.com/image.jpg"
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
            <button type="button" onClick={addUrl}
              className="px-3 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark cursor-pointer transition-colors">Add</button>
            <button type="button" onClick={() => setShowUrl(false)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {images.length > 0 && (
        <p className="text-[10px] text-slate-400">
          {images.length}/{max} images · First image is the primary · Drag to reorder · ☆ to set primary
        </p>
      )}
    </div>
  )
}
