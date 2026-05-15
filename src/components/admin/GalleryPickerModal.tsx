'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Upload, Library, Search, X, Check, Loader2, ImageOff,
  ChevronRight, Trash2, AlertCircle,
} from 'lucide-react'

export interface MediaAssetRow {
  id:        string
  url:       string
  filename:  string | null
  mimeType:  string | null
  sizeBytes: number | null
  width:     number | null
  height:    number | null
  kind:      string
  alt:       string | null
  createdAt: string
}

interface Props {
  open:        boolean
  onClose:     () => void
  onSelect:    (urls: string[]) => void
  /** 'single' returns at most 1 URL. 'multi' returns N URLs. */
  mode:        'single' | 'multi'
  /** Restrict to image or video assets. Defaults to 'image'. */
  kind?:       'image' | 'video'
  /** Optional cap on multi-select count (e.g. remaining slots in a gallery). */
  maxSelect?:  number
  /** Pre-selected URLs (used to show existing selections in multi mode). */
  initiallySelected?: string[]
  /** Header copy override. */
  title?:      string
}

type Tab = 'upload' | 'library'

export default function GalleryPickerModal({
  open, onClose, onSelect, mode,
  kind = 'image',
  maxSelect,
  initiallySelected = [],
  title,
}: Props) {
  const [tab, setTab]               = useState<Tab>('library')
  const [items, setItems]           = useState<MediaAssetRow[]>([])
  const [loading, setLoading]       = useState(false)
  const [search, setSearch]         = useState('')
  const [debounced, setDebounced]   = useState('')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [selected, setSelected]     = useState<Set<string>>(new Set(initiallySelected))
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)
  const [progress, setProgress]     = useState(0)

  const headingId = 'gallery-picker-heading'
  const dialogRef = useRef<HTMLDivElement>(null)

  // Reset state on open
  useEffect(() => {
    if (!open) return
    setTab('library')
    setSelected(new Set(initiallySelected))
    setSearch('')
    setDebounced('')
    setNextCursor(null)
    setError(null)
    // initiallySelected intentionally referenced once at open time — re-running
    // on every keystroke would steal the user's mid-session picks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 250)
    return () => clearTimeout(id)
  }, [search])

  const load = useCallback(async (opts: { append?: boolean; cursor?: string | null } = {}) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ kind, take: '60' })
      if (debounced)        params.set('search', debounced)
      if (opts.cursor)      params.set('cursor', opts.cursor)
      const res = await fetch(`/api/admin/media?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load library')
      if (data.error) setError(data.error)
      const incoming: MediaAssetRow[] = data.items ?? []
      setItems(prev => opts.append ? [...prev, ...incoming] : incoming)
      setNextCursor(data.nextCursor ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [kind, debounced])

  // Initial + search-debounced reload
  useEffect(() => {
    if (!open || tab !== 'library') return
    load({ append: false, cursor: null })
  }, [open, tab, debounced, load])

  // Esc to close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Auto-focus dialog so first Tab lands inside it
  useEffect(() => {
    if (open) dialogRef.current?.focus()
  }, [open])

  function toggle(url: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (mode === 'single') {
        next.clear()
        next.add(url)
        return next
      }
      if (next.has(url)) {
        next.delete(url)
      } else {
        if (maxSelect != null && next.size >= maxSelect) return next
        next.add(url)
      }
      return next
    })
  }

  function confirm() {
    onSelect(Array.from(selected))
    onClose()
  }

  async function uploadFiles(files: FileList | File[]) {
    if (!files || (files as FileList).length === 0) return
    setUploading(true)
    setProgress(0)
    setError(null)
    const list = Array.from(files as FileList)
    const newUrls: string[] = []
    try {
      for (let i = 0; i < list.length; i++) {
        const fd = new FormData()
        fd.append('file', list[i])
        const res  = await fetch('/api/admin/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed')
        newUrls.push(data.url)
        setProgress(Math.round(((i + 1) / list.length) * 100))
      }
      // Switch to library and pre-select the new uploads
      setTab('library')
      await load({ append: false, cursor: null })
      setSelected(prev => {
        const next = new Set(prev)
        if (mode === 'single') {
          next.clear()
          if (newUrls.length) next.add(newUrls[newUrls.length - 1])
        } else {
          for (const u of newUrls) {
            if (maxSelect != null && next.size >= maxSelect) break
            next.add(u)
          }
        }
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  async function deleteAsset(asset: MediaAssetRow) {
    if (!confirmDelete(asset)) return
    setDeletingId(asset.id)
    try {
      const res  = await fetch(`/api/admin/media/${asset.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      setItems(prev => prev.filter(it => it.id !== asset.id))
      setSelected(prev => {
        const next = new Set(prev)
        next.delete(asset.url)
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeletingId(null)
    }
  }

  function confirmDelete(asset: MediaAssetRow): boolean {
    return window.confirm(`Delete "${asset.filename ?? asset.url}"?\n\nThis removes the file permanently. References to it in products will become broken images.`)
  }

  if (!open) return null

  const selectedCount = selected.size
  const canConfirm    = selectedCount > 0

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
      style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(6px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col outline-none"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#16A34A,#0EA5E9)' }}>
              <Library size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 id={headingId} className="font-heading font-bold text-slate-900 text-base sm:text-lg truncate">
                {title ?? (mode === 'single' ? 'Pick an image' : 'Pick images')}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {mode === 'single' ? 'Select one' : maxSelect ? `Select up to ${maxSelect}` : 'Select any number'}
                {' · '}upload new or pick from your library
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close picker"
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors duration-150"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 sm:px-6 pt-3 border-b border-slate-200">
          <TabButton active={tab === 'library'} onClick={() => setTab('library')} icon={<Library size={14} />}>Library</TabButton>
          <TabButton active={tab === 'upload'}  onClick={() => setTab('upload')}  icon={<Upload  size={14} />}>Upload</TabButton>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {tab === 'library' ? (
            <>
              <div className="px-5 sm:px-6 py-3 border-b border-slate-100">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    type="search"
                    placeholder="Search by filename or alt text…"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    aria-label="Search library"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
                {error && (
                  <div className="mb-3 flex items-start gap-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold p-2.5 ring-1 ring-rose-200">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                {loading && items.length === 0 ? (
                  <SkeletonGrid />
                ) : items.length === 0 ? (
                  <EmptyLibrary onUploadClick={() => setTab('upload')} />
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {items.map(asset => (
                        <AssetCard
                          key={asset.id}
                          asset={asset}
                          selected={selected.has(asset.url)}
                          onToggle={() => toggle(asset.url)}
                          onDelete={() => deleteAsset(asset)}
                          deleting={deletingId === asset.id}
                        />
                      ))}
                    </div>
                    {nextCursor && (
                      <div className="text-center pt-5">
                        <button
                          onClick={() => load({ append: true, cursor: nextCursor })}
                          disabled={loading}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold cursor-pointer transition disabled:opacity-50"
                        >
                          {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                          Load more
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <UploadTab
              kind={kind}
              uploading={uploading}
              progress={progress}
              error={error}
              onFiles={uploadFiles}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 border-t border-slate-200 bg-slate-50">
          <p className="text-xs font-semibold text-slate-600">
            {selectedCount > 0 ? (
              <>
                <span className="text-slate-900">{selectedCount}</span> selected
                {maxSelect != null && <span className="text-slate-400"> / {maxSelect}</span>}
              </>
            ) : (
              <span className="text-slate-400">Nothing selected yet</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white text-slate-700 text-sm font-bold ring-1 ring-slate-200 hover:bg-slate-100 cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              onClick={confirm}
              disabled={!canConfirm}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
            >
              <Check size={14} />
              {mode === 'single' ? 'Use this image' : `Use ${selectedCount || ''} image${selectedCount === 1 ? '' : 's'}`.trim()}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition cursor-pointer ${
        active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {icon}
      {children}
      {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-slate-900 rounded-full" />}
    </button>
  )
}

function AssetCard({
  asset, selected, onToggle, onDelete, deleting,
}: { asset: MediaAssetRow; selected: boolean; onToggle: () => void; onDelete: () => void; deleting: boolean }) {
  const isVideo = asset.kind === 'video' || (asset.mimeType ?? '').startsWith('video/')
  return (
    <div
      className={`group relative rounded-xl overflow-hidden bg-slate-100 ring-2 transition-all duration-150 ${
        selected ? 'ring-primary shadow-md' : 'ring-transparent hover:ring-slate-300'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        role="checkbox"
        aria-checked={selected}
        aria-label={`Select ${asset.filename ?? 'image'}`}
        className="block w-full aspect-square relative cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
      >
        {isVideo ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            <ImageOff size={28} />
          </div>
        ) : (
          // Use plain <img> not next/image — Image requires explicit width or
          // remotePattern config for every domain, but library images come
          // from /uploads which is local and unconstrained.
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={asset.url}
            alt={asset.alt ?? asset.filename ?? ''}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-90"
            loading="lazy"
          />
        )}

        {/* Selection chip */}
        <div
          className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center shadow-sm transition-all duration-150 ${
            selected
              ? 'bg-primary text-white scale-100'
              : 'bg-white/85 backdrop-blur text-transparent scale-90 group-hover:scale-100 group-hover:text-slate-400'
          }`}
        >
          <Check size={14} strokeWidth={3} />
        </div>
      </button>

      {/* Filename strip */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-slate-900/85 to-transparent pointer-events-none">
        <p className="text-[11px] text-white/95 font-semibold truncate">{asset.filename ?? '—'}</p>
      </div>

      {/* Delete (admin-only — hidden until hover) */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        disabled={deleting}
        aria-label="Delete asset"
        className="absolute top-2 right-2 w-7 h-7 rounded-md bg-white/90 backdrop-blur text-rose-600 hover:bg-rose-600 hover:text-white shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150 cursor-pointer disabled:opacity-50"
      >
        {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
      </button>
    </div>
  )
}

function UploadTab({
  kind, uploading, progress, error, onFiles,
}: { kind: 'image' | 'video'; uploading: boolean; progress: number; error: string | null; onFiles: (files: FileList | File[]) => void }) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (uploading) return
    if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files)
  }

  function handlePaste(e: React.ClipboardEvent) {
    if (uploading) return
    const files = Array.from(e.clipboardData?.files ?? [])
    if (files.length) onFiles(files)
  }

  const accept = kind === 'video' ? 'video/*' : 'image/*'
  const sizeHint = kind === 'video' ? 'Max 200 MB · MP4, WebM, MOV' : 'Max 10 MB · PNG, JPG, WebP, GIF'

  return (
    <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onPaste={handlePaste}
        tabIndex={0}
        className={`rounded-2xl border-2 border-dashed transition-colors duration-150 ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
        }`}
      >
        <div className="text-center py-12 px-6">
          <div className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg,#16A34A,#0EA5E9)' }}>
            <Upload size={22} className="text-white" />
          </div>
          <h3 className="font-heading font-bold text-slate-900 text-lg mb-1">
            Drop {kind === 'video' ? 'video' : 'images'} here
          </h3>
          <p className="text-sm text-slate-500 mb-5">
            or click to browse · or paste from clipboard
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? `Uploading… ${progress}%` : 'Choose files'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={kind === 'image'}
            className="hidden"
            onChange={e => e.target.files && onFiles(e.target.files)}
          />
          <p className="text-xs text-slate-400 mt-4">{sizeHint}</p>
        </div>
      </div>

      {uploading && (
        <div className="mt-4 h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-cyan-500 transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 text-rose-700 text-sm font-semibold p-3 ring-1 ring-rose-200">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="aspect-square rounded-xl bg-slate-100 animate-pulse" />
      ))}
    </div>
  )
}

function EmptyLibrary({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-3 bg-slate-100">
        <ImageOff size={22} className="text-slate-400" />
      </div>
      <h3 className="font-heading font-bold text-slate-900 text-lg mb-1">No images yet</h3>
      <p className="text-sm text-slate-500 mb-5">
        Upload your first one — it'll show up here for reuse on every product.
      </p>
      <button
        onClick={onUploadClick}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 cursor-pointer transition"
      >
        <Upload size={14} />
        Upload now
      </button>
    </div>
  )
}

// Suppress next/image suggestion linter for plain <img> — we use plain img on
// purpose for /uploads/* assets that aren't whitelisted in next.config.ts.
