'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Library, Upload, Search, Loader2, ImageOff, Trash2, AlertCircle,
  ChevronRight, Sparkles, Check,
} from 'lucide-react'
import type { MediaAssetRow } from '@/components/admin/GalleryPickerModal'

type Kind = 'image' | 'video'

export default function MediaLibraryClient() {
  const [kind, setKind]             = useState<Kind>('image')
  const [search, setSearch]         = useState('')
  const [debounced, setDebounced]   = useState('')
  const [items, setItems]           = useState<MediaAssetRow[]>([])
  const [loading, setLoading]       = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [backfilling, setBackfilling] = useState(false)
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 250)
    return () => clearTimeout(id)
  }, [search])

  const load = useCallback(async (opts: { append?: boolean; cursor?: string | null } = {}) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ kind, take: '60' })
      if (debounced)   params.set('search', debounced)
      if (opts.cursor) params.set('cursor', opts.cursor)
      const res  = await fetch(`/api/admin/media?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
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

  useEffect(() => {
    load({ append: false, cursor: null })
  }, [load])

  async function deleteAsset(asset: MediaAssetRow) {
    if (!window.confirm(`Delete "${asset.filename ?? asset.url}"?\n\nThis removes the file permanently. References to it in products will become broken images.`)) return
    setDeletingId(asset.id)
    try {
      const res = await fetch(`/api/admin/media/${asset.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      setItems(prev => prev.filter(it => it.id !== asset.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeletingId(null)
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files as FileList)
    if (!list.length) return
    setUploading(true)
    setUploadProgress(0)
    setError(null)
    try {
      for (let i = 0; i < list.length; i++) {
        const fd = new FormData()
        fd.append('file', list[i])
        const res  = await fetch('/api/admin/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Upload failed')
        setUploadProgress(Math.round(((i + 1) / list.length) * 100))
      }
      await load({ append: false, cursor: null })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  async function runBackfill() {
    if (!window.confirm('Scan existing products, categories, profile avatars, and store settings for image URLs and add any missing ones to the library?')) return
    setBackfilling(true)
    setBackfillMsg(null)
    try {
      const res  = await fetch('/api/admin/media/backfill', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Backfill failed')
      setBackfillMsg(`Scanned ${data.scanned}, inserted ${data.inserted}, skipped ${data.skipped} duplicates.`)
      await load({ append: false, cursor: null })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBackfilling(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
      <header className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg,#16A34A,#0EA5E9)' }}>
          <Library size={22} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-slate-900">Media Library</h1>
          <p className="text-sm text-slate-500 mt-1">
            Every image and video you've uploaded. Reuse across products, categories, and settings.
          </p>
        </div>
        <button
          onClick={runBackfill}
          disabled={backfilling}
          className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-700 text-sm font-bold ring-1 ring-slate-200 hover:bg-slate-50 cursor-pointer transition disabled:opacity-60"
        >
          {backfilling ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {backfilling ? 'Scanning…' : 'Backfill from existing'}
        </button>
      </header>

      {backfillMsg && (
        <div className="flex items-start gap-2 rounded-xl bg-cyan-50 text-cyan-800 text-xs font-semibold p-3 ring-1 ring-cyan-200">
          <Check size={14} className="shrink-0 mt-0.5" />
          {backfillMsg}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center bg-white rounded-xl ring-1 ring-slate-200 p-1">
          {(['image', 'video'] as Kind[]).map(k => (
            <button key={k} onClick={() => setKind(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize cursor-pointer transition ${
                kind === k ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}>
              {k === 'image' ? 'Images' : 'Videos'}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            type="search"
            placeholder="Search filename or alt text…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        <label
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold cursor-pointer transition ml-auto ${
            uploading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-800'
          }`}
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? `Uploading… ${uploadProgress}%` : 'Upload'}
          <input
            type="file"
            accept={kind === 'video' ? 'video/*' : 'image/*'}
            multiple={kind === 'image'}
            disabled={uploading}
            className="hidden"
            onChange={e => e.target.files && uploadFiles(e.target.files)}
          />
        </label>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-rose-50 text-rose-700 text-sm font-semibold p-3 ring-1 ring-rose-200">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <SkeletonGrid />
      ) : items.length === 0 ? (
        <EmptyState onBackfill={runBackfill} />
      ) : (
        <>
          <p className="text-xs font-semibold text-slate-500">
            {items.length} {kind}{items.length === 1 ? '' : 's'}
            {nextCursor ? ' (more available)' : ''}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {items.map(asset => (
              <AssetCard
                key={asset.id}
                asset={asset}
                deleting={deletingId === asset.id}
                onDelete={() => deleteAsset(asset)}
              />
            ))}
          </div>
          {nextCursor && (
            <div className="text-center pt-2">
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
  )
}

function AssetCard({ asset, deleting, onDelete }: { asset: MediaAssetRow; deleting: boolean; onDelete: () => void }) {
  const isVideo = asset.kind === 'video' || (asset.mimeType ?? '').startsWith('video/')
  const created = new Date(asset.createdAt).toLocaleDateString()
  return (
    <div className="group relative rounded-xl overflow-hidden bg-slate-100 ring-1 ring-slate-200 hover:ring-slate-300 transition">
      <div className="aspect-square relative">
        {isVideo ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            <ImageOff size={28} />
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={asset.url} alt={asset.alt ?? asset.filename ?? ''}
            className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        )}
        <button
          onClick={onDelete}
          disabled={deleting}
          aria-label="Delete asset"
          className="absolute top-2 right-2 w-8 h-8 rounded-md bg-white/90 backdrop-blur text-rose-600 hover:bg-rose-600 hover:text-white shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition cursor-pointer disabled:opacity-50"
        >
          {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
      <div className="p-2">
        <p className="text-xs font-semibold text-slate-800 truncate">{asset.filename ?? '—'}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{created}</p>
      </div>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-slate-100 ring-1 ring-slate-200 overflow-hidden">
          <div className="aspect-square animate-pulse bg-slate-200" />
          <div className="p-2 space-y-1">
            <div className="h-3 w-3/4 bg-slate-200 rounded animate-pulse" />
            <div className="h-2 w-1/2 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onBackfill }: { onBackfill: () => void }) {
  return (
    <div className="text-center py-20 px-6 rounded-3xl bg-white ring-1 ring-slate-200">
      <div className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-3 bg-slate-100">
        <ImageOff size={22} className="text-slate-400" />
      </div>
      <h3 className="font-heading font-bold text-slate-900 text-lg mb-1">No media yet</h3>
      <p className="text-sm text-slate-500 mb-5 max-w-md mx-auto">
        Upload your first one above — or scan your existing products, categories, and store settings to seed the library from URLs already in use.
      </p>
      <button
        onClick={onBackfill}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 cursor-pointer transition"
      >
        <Sparkles size={14} />
        Backfill from existing
      </button>
    </div>
  )
}
