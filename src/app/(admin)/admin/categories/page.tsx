'use client'

import { useEffect, useState, useRef } from 'react'
import { Tag, Plus, Edit2, Loader2, X, Upload, Check, Library } from 'lucide-react'
import Image from 'next/image'
import GalleryPickerModal from '@/components/admin/GalleryPickerModal'

interface Category {
  id: string; name: string; slug: string; color: string
  icon: string | null; image: string | null
  seoIntro?: string | null
  _count?: { products: number }
}

const PRESET_EMOJIS = ['📱','💻','🎧','📷','💄','🏠','⚽','🧸','🔧','👗','🛒','🎮','📺','🔋','🌿','💊','🚗','🎨','📚','🍳']
const PRESET_COLORS = ['#16A34A','#6366F1','#3B82F6','#8B5CF6','#EC4899','#F59E0B','#EF4444','#06B6D4','#F97316','#64748B']

function EditModal({ cat, onSave, onClose }: {
  cat: Category
  onSave: (updated: Category) => void
  onClose: () => void
}) {
  const [name,     setName]     = useState(cat.name)
  const [color,    setColor]    = useState(cat.color)
  const [icon,     setIcon]     = useState(cat.icon ?? '')
  const [image,    setImage]    = useState(cat.image ?? '')
  const [seoIntro, setSeoIntro] = useState(cat.seoIntro ?? '')
  const [aiLoading,setAiLoading]= useState(false)
  const [aiError,  setAiError]  = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [uploading,setUploading]= useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function generateIntroAI() {
    setAiLoading(true); setAiError(null)
    try {
      const res  = await fetch('/api/admin/ai/category-intro', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ categoryId: cat.id, save: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setSeoIntro(data.intro ?? '')
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e))
    } finally {
      setAiLoading(false)
    }
  }

  async function uploadImage(file: File) {
    setUploading(true)
    const form = new FormData(); form.append('file', file)
    const res  = await fetch('/api/admin/upload', { method: 'POST', body: form })
    const data = await res.json()
    if (data.url) setImage(data.url)
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/admin/categories', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cat.id, name, color, icon: icon || null, image: image || null, seoIntro: seoIntro.trim() || null }),
    })
    const updated = await res.json()
    if (res.ok) onSave({ ...cat, ...updated })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-slate-900">Edit Category</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={18} /></button>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-md"
            style={{ background: image ? 'transparent' : color + '20', border: `2px solid ${color}40` }}>
            {image ? (
              <Image src={image} alt={name} width={56} height={56} className="object-cover w-full h-full rounded-xl" />
            ) : icon ? (
              <span className="text-2xl">{icon}</span>
            ) : (
              <div className="w-6 h-6 rounded-full" style={{ background: color }} />
            )}
          </div>
          <div>
            <p className="font-bold text-slate-800">{name || 'Category Name'}</p>
            <p className="text-xs text-slate-400 mt-0.5">Preview</p>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm border border-slate-200 bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
        </div>

        {/* Emoji icon */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Emoji Icon</label>
          <div className="flex items-center gap-2 mb-2">
            <input value={icon} onChange={e => setIcon(e.target.value)} maxLength={4}
              placeholder="Type or pick emoji…"
              className="flex-1 px-3 py-2 rounded-xl text-sm border border-slate-200 bg-white outline-none focus:border-primary" />
            {icon && <button type="button" onClick={() => setIcon('')} className="text-slate-400 hover:text-red-500 cursor-pointer"><X size={14} /></button>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_EMOJIS.map(e => (
              <button key={e} type="button" onClick={() => setIcon(e)}
                className={`w-8 h-8 rounded-lg text-base flex items-center justify-center cursor-pointer transition-all
                  ${icon === e ? 'bg-primary-bg ring-2 ring-primary' : 'bg-slate-50 hover:bg-slate-100'}`}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Image */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Image (overrides emoji)</label>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors disabled:opacity-60">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Upload image
            </button>
            <button type="button" onClick={() => setPickerOpen(true)}
              className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
              <Library size={14} /> From library
            </button>
            {image && (
              <div className="flex items-center gap-2">
                <Image src={image} alt="preview" width={32} height={32} className="w-8 h-8 rounded-lg object-cover" />
                <button type="button" onClick={() => setImage('')} className="text-red-400 hover:text-red-600 cursor-pointer"><X size={14} /></button>
              </div>
            )}
          </div>
          <GalleryPickerModal
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={(urls) => { if (urls[0]) setImage(urls[0]) }}
            mode="single"
            kind="image"
            initiallySelected={image ? [image] : []}
            title="Pick a category image"
          />
        </div>

        {/* Color */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Color</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-lg cursor-pointer transition-all ${color === c ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : 'hover:scale-105'}`}
                style={{ background: c }} />
            ))}
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              className="w-7 h-7 rounded-lg cursor-pointer border border-slate-200" title="Custom color" />
          </div>
        </div>

        {/* SEO intro — shown above product grid when filtering by this category */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">SEO intro (optional)</label>
            <button type="button" onClick={generateIntroAI} disabled={aiLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-600 text-white text-[11px] font-bold hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition">
              {aiLoading ? <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : '✨'}
              {aiLoading ? 'Generating…' : 'Generate with AI'}
            </button>
          </div>
          <textarea value={seoIntro} onChange={e => setSeoIntro(e.target.value)} rows={4}
            placeholder="60–110 word paragraph shown above the product grid when shoppers filter by this category. Boosts category landing-page SEO."
            className="w-full px-3 py-2.5 rounded-xl text-sm border border-slate-200 bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 leading-relaxed" />
          {aiError && (
            <p className="mt-1 text-[11px] font-semibold text-rose-700">{aiError}</p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-bold text-sm rounded-xl cursor-pointer transition-colors">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading,    setLoading]    = useState(true)
  const [editing,    setEditing]    = useState<Category | null>(null)
  const [newName,    setNewName]    = useState('')
  const [creating,   setCreating]   = useState(false)

  useEffect(() => {
    fetch('/api/admin/categories').then(r => r.json())
      .then(d => setCategories(d.categories ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function createCategory() {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/admin/categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const cat = await res.json()
    if (res.ok) { setCategories(prev => [...prev, cat]); setNewName('') }
    setCreating(false)
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-7">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900">Categories</h1>
          <p className="text-slate-500 text-sm mt-0.5">{categories.length} categories · click to add icon or image</p>
        </div>
        <div className="flex gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createCategory()}
            placeholder="New category name…"
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-48 transition-all" />
          <button onClick={createCategory} disabled={creating || !newName.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-primary/20">
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
          <Tag size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">No categories yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map(cat => (
            <div key={cat.id}
              className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-primary/30 hover:shadow-md transition-all group cursor-pointer"
              onClick={() => setEditing(cat)}>
              <div className="flex items-start justify-between mb-4">
                {/* Icon / Image */}
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shadow-sm"
                  style={{ background: cat.image ? 'transparent' : cat.color + '20', border: `2px solid ${cat.color}30` }}>
                  {cat.image ? (
                    <Image src={cat.image} alt={cat.name} width={56} height={56} className="object-cover w-full h-full" />
                  ) : cat.icon ? (
                    <span className="text-2xl">{cat.icon}</span>
                  ) : (
                    <div className="w-6 h-6 rounded-full" style={{ background: cat.color }} />
                  )}
                </div>

                <button type="button"
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                  <Edit2 size={13} />
                </button>
              </div>

              <p className="font-bold text-slate-800">{cat.name}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-400">
                  {cat._count?.products ?? 0} products
                </p>
                {!cat.icon && !cat.image && (
                  <span className="text-[10px] text-slate-300 font-medium">+ Add icon</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditModal
          cat={editing}
          onSave={updated => {
            setCategories(prev => prev.map(c => c.id === updated.id ? updated : c))
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
