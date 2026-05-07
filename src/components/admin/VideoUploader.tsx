'use client'

import { useState, useRef } from 'react'
import { Video, Upload, X, Play, Link, Loader2, AlertCircle } from 'lucide-react'

interface Props {
  value:    string
  onChange: (url: string) => void
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VideoUploader({ value, onChange }: Props) {
  const [isDragging,  setIsDragging]  = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [fileInfo,    setFileInfo]    = useState<{ name: string; size: number } | null>(null)
  const [showUrl,     setShowUrl]     = useState(false)
  const [urlInput,    setUrlInput]    = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function uploadWithProgress(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText)
          resolve(data.url)
        } else {
          try { reject(new Error(JSON.parse(xhr.responseText).error ?? 'Upload failed')) }
          catch { reject(new Error('Upload failed')) }
        }
      }
      xhr.onerror  = () => reject(new Error('Network error'))
      xhr.onabort  = () => reject(new Error('Upload cancelled'))
      xhr.open('POST', '/api/admin/upload')
      xhr.send(formData)
    })
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith('video/')) {
      setUploadError('Please select a video file (MP4, MOV, WebM)'); return
    }
    if (file.size > 200 * 1024 * 1024) {
      setUploadError('Video too large (max 200 MB)'); return
    }
    setUploading(true); setUploadError(''); setProgress(0)
    setFileInfo({ name: file.name, size: file.size })
    try {
      const url = await uploadWithProgress(file)
      onChange(url)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
      setFileInfo(null)
    }
    setUploading(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false)
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('video/'))
    if (file) handleFile(file)
    else setUploadError('Please drop a video file')
  }

  function addUrl() {
    const u = urlInput.trim()
    if (u) { onChange(u); setUrlInput(''); setShowUrl(false) }
  }

  function remove() { onChange(''); setFileInfo(null); setProgress(0) }

  // ── Has a video ────────────────────────────────────────────────────────────
  if (value && !uploading) {
    const isYouTube  = value.includes('youtube.com') || value.includes('youtu.be')
    const isVimeo    = value.includes('vimeo.com')
    const isExternal = isYouTube || isVimeo

    return (
      <div className="space-y-3">
        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-black relative group">
          {isExternal ? (
            <div className="aspect-video flex items-center justify-center bg-slate-900">
              <div className="text-center text-white/70">
                <Play size={32} className="mx-auto mb-2 text-white" />
                <p className="text-sm font-medium">{isYouTube ? 'YouTube' : 'Vimeo'} video linked</p>
                <a href={value} target="_blank" rel="noopener"
                  className="text-xs text-primary hover:underline mt-1 block">{value.slice(0, 50)}…</a>
              </div>
            </div>
          ) : (
            <video
              src={value}
              controls
              className="w-full aspect-video object-contain bg-black"
              preload="metadata"
            />
          )}
          <button type="button" onClick={remove}
            className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-red-600 text-white rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
            <X size={14} />
          </button>
        </div>
        {fileInfo && (
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Video size={11} /> {fileInfo.name} · {formatSize(fileInfo.size)}
          </p>
        )}
        <button type="button" onClick={remove}
          className="text-xs text-red-500 hover:text-red-700 cursor-pointer transition-colors">
          Remove video
        </button>
      </div>
    )
  }

  // ── Uploading ──────────────────────────────────────────────────────────────
  if (uploading) {
    return (
      <div className="rounded-2xl border-2 border-primary/30 bg-primary-bg p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <Loader2 size={18} className="animate-spin text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">{fileInfo?.name}</p>
            <p className="text-xs text-slate-500">{fileInfo ? formatSize(fileInfo.size) : ''} · Uploading to Supabase Storage…</p>
          </div>
          <span className="font-extrabold text-primary text-sm">{progress}%</span>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-400 text-center">
          Large videos may take a minute — please keep this tab open
        </p>
      </div>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 h-40 rounded-2xl border-2 border-dashed transition-all cursor-pointer
          ${isDragging ? 'border-primary bg-primary-bg scale-[1.01]' : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'}`}
      >
        <input ref={fileRef} type="file" accept="video/*" className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? 'bg-primary/15' : 'bg-slate-100'}`}>
          <Video size={22} className={isDragging ? 'text-primary' : 'text-slate-400'} />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-600">Drag & drop a video here</p>
          <p className="text-xs text-slate-400 mt-0.5">or click to browse · MP4, MOV, WebM · max 200 MB</p>
        </div>
      </div>

      {uploadError && (
        <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">
          <AlertCircle size={12} /> {uploadError}
        </p>
      )}

      {/* URL / YouTube / Vimeo alternative */}
      {!showUrl ? (
        <button type="button" onClick={() => setShowUrl(true)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary transition-colors cursor-pointer">
          <Link size={11} /> Add YouTube, Vimeo, or direct video URL instead
        </button>
      ) : (
        <div className="flex gap-2">
          <input autoFocus value={urlInput} onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addUrl())}
            placeholder="https://youtube.com/watch?v=... or https://..."
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
          <button type="button" onClick={addUrl}
            className="px-3 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark cursor-pointer transition-colors">Add</button>
          <button type="button" onClick={() => setShowUrl(false)}
            className="px-3 py-2 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50"><X size={14} /></button>
        </div>
      )}

      <p className="text-[10px] text-slate-400">
        Video is optional · Shown in the "Watch & Learn" section on the product page
      </p>
    </div>
  )
}
