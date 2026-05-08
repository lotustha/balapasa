'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Upload, FileSpreadsheet, Play, Pause, CheckCircle2,
  XCircle, Loader2, AlertTriangle, ChevronDown, ChevronUp,
  ArrowRight, RefreshCw,
} from 'lucide-react'

// ── Daraz → Store category mapping (edit to customise) ────────────────────────
const L1_TO_STORE: Record<string, string> = {
  'Mobiles & Tablets':                      'Mobiles & Accessories',
  'Computers & Laptops':                    'Computers & Laptops',
  'TV, Audio / Video, Gaming & Wearables':  'Audio & Wearables',
  'Cameras':                                'Cameras',
  'Health & Beauty':                        'Beauty & Personal Care',
  'Home Appliances':                        'Home & Kitchen',
  'Kitchen & Dining':                       'Home & Kitchen',
  'Bedding & Bath':                         'Home & Kitchen',
  'Laundry & Cleaning':                     'Home & Kitchen',
  'Furniture & Decor':                      'Home & Kitchen',
  'Sports & Outdoors':                      'Sports & Fitness',
  'Toys & Games':                           'Toys & Baby',
  'Mother & Baby':                          'Toys & Baby',
  'Tools, DIY & Outdoor':                   'Tools & DIY',
  'Stationery & Craft':                     'Tools & DIY',
  'Fashion':                                'Fashion & Lifestyle',
  'Bags and Travel':                        'Fashion & Lifestyle',
  'Motors':                                 'Fashion & Lifestyle',
  'Pet Supplies':                           'Fashion & Lifestyle',
  'Groceries':                              'Fashion & Lifestyle',
}

const CAT_COLORS: Record<string, string> = {
  'Mobiles & Accessories':  '#6366F1',
  'Computers & Laptops':    '#3B82F6',
  'Audio & Wearables':      '#8B5CF6',
  'Cameras':                '#06B6D4',
  'Beauty & Personal Care': '#EC4899',
  'Home & Kitchen':         '#F59E0B',
  'Sports & Fitness':       '#16A34A',
  'Toys & Baby':            '#F97316',
  'Tools & DIY':            '#64748B',
  'Fashion & Lifestyle':    '#EF4444',
}

interface DarazProduct {
  catId:     string
  nameEn:    string
  images:    string[]
  price:     number
  salePrice: number | null
  stock:     number
  sku:       string | null
}

interface ParsedData {
  darazCatMap:  Record<string, { l1: string; l2: string }>
  products:     DarazProduct[]
  storeCatMap:  Record<string, string>  // storeCatName → count
}

interface ImportResult {
  name:     string
  status:   'pending' | 'uploading' | 'saving' | 'done' | 'failed'
  images:   number
  uploaded: number
  error?:   string
}

// ── Excel reader (client-side) ────────────────────────────────────────────────
async function readExcel(file: File) {
  const XLSX = await import('xlsx')
  const buf  = await file.arrayBuffer()
  const wb   = XLSX.read(buf, { type: 'array' })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)
}

// ── Images: server-side attempt first, browser-side fallback ─────────────────
// Server may be blocked by Daraz CDN (datacenter IP). Browser (user's machine)
// uses a residential IP so it can fetch CDN images directly.
async function findAndUploadImages(productName: string, excelImageUrls: string[]): Promise<{ urls: string[]; count: number }> {
  // 1. Server-side: use Excel URLs or fall back to Daraz name search
  let serverUrls: string[] = []
  try {
    const body = excelImageUrls.length > 0 ? { imageUrls: excelImageUrls } : { productName }
    const res  = await fetch('/api/admin/find-images', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    serverUrls = data.images ?? []
  } catch { }

  // 2. Browser-side fallback: for any CDN URL the server couldn't download,
  //    fetch it from the browser (not blocked) and POST bytes to server
  const finalUrls = await Promise.all(serverUrls.map(async (url) => {
    if (url.startsWith('/uploads/')) return url
    try {
      const res = await fetch(url)
      if (!res.ok) return url
      const ct = res.headers.get('content-type') ?? 'image/jpeg'
      if (!ct.startsWith('image/')) return url
      const buf = await res.arrayBuffer()
      const up  = await fetch('/api/upload/image', {
        method: 'POST', headers: { 'content-type': ct }, body: buf,
      })
      if (!up.ok) return url
      return (await up.json()).url ?? url
    } catch { return url }
  }))

  // 3. If server found nothing (search blocked entirely), try Excel URLs in browser
  if (finalUrls.length === 0 && excelImageUrls.length > 0) {
    const browserUrls = await Promise.all(excelImageUrls.map(async (url) => {
      try {
        const res = await fetch(url)
        if (!res.ok) return url
        const ct = res.headers.get('content-type') ?? 'image/jpeg'
        if (!ct.startsWith('image/')) return url
        const buf = await res.arrayBuffer()
        const up  = await fetch('/api/upload/image', {
          method: 'POST', headers: { 'content-type': ct }, body: buf,
        })
        if (!up.ok) return url
        return (await up.json()).url ?? url
      } catch { return url }
    }))
    return { urls: browserUrls, count: browserUrls.filter(u => u.startsWith('/uploads')).length }
  }

  return { urls: finalUrls, count: finalUrls.filter(u => u.startsWith('/uploads')).length }
}

// ── Ensure category exists in DB ──────────────────────────────────────────────
const catCache: Record<string, string> = {}
async function ensureCategory(name: string, color: string): Promise<string> {
  if (catCache[name]) return catCache[name]
  // Try to get existing
  const get = await fetch('/api/admin/categories')
  const { categories } = await get.json()
  const existing = categories.find((c: { name: string; id: string }) => c.name === name)
  if (existing) { catCache[name] = existing.id; return existing.id }
  // Create new
  const res  = await fetch('/api/admin/categories', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  })
  const cat  = await res.json()
  catCache[cat.id] = cat.id
  catCache[name]   = cat.id
  return cat.id
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ImportPage() {
  const [step,         setStep]         = useState<'upload' | 'preview' | 'importing' | 'done'>('upload')
  const [catFile,      setCatFile]      = useState<File | null>(null)
  const [prodFile,     setProdFile]     = useState<File | null>(null)
  const [parsed,       setParsed]       = useState<ParsedData | null>(null)
  const [parsing,      setParsing]      = useState(false)
  const [results,      setResults]      = useState<ImportResult[]>([])
  const [current,      setCurrent]      = useState(0)
  const [running,      setRunning]      = useState(false)
  const [showMapping,  setShowMapping]  = useState(false)
  const cancelRef = useRef(false)

  // ── Step 1: Parse Excel files ──────────────────────────────────────────────
  async function handleParse() {
    if (!prodFile) return
    setParsing(true)
    try {
      const darazCatMap: Record<string, { l1: string; l2: string }> = {}

      if (catFile) {
        const catRows = await readExcel(catFile)
        for (const r of catRows) {
          const id = String(r['Category Id'] ?? '')
          darazCatMap[id] = {
            l1: String(r['Category Level 1'] ?? '').trim(),
            l2: String(r['Category Level 2'] ?? '').trim(),
          }
        }
      }

      const prodRows = await readExcel(prodFile)
      const products: DarazProduct[] = []

      for (const r of prodRows) {
        const name = String(r['Product Name(English)'] ?? r['*Product Name(Nepali) look function'] ?? '').trim()
        if (!name) continue
        const images = ['im1','im2','im3','im4','im5','im6','im7','im8']
          .map(k => String(r[k] ?? '').trim()).filter(Boolean)
        products.push({
          catId:     String(r.catId ?? ''),
          nameEn:    name,
          images,
          price:     Number(String(r['*Price'] ?? '0').replace(/[^0-9.]/g, '')) || 0,
          salePrice: r['SpecialPrice'] ? (Number(String(r['SpecialPrice']).replace(/[^0-9.]/g, '')) || null) : null,
          stock:     Number(r['*Quantity'] ?? 0),
          sku:       r['tr(s-wb-product@md5key)'] ? String(r['tr(s-wb-product@md5key)']).slice(0, 20) : null,
        })
      }

      // Build store category counts
      const storeCatMap: Record<string, string> = {}
      for (const p of products) {
        const d = darazCatMap[p.catId]
        const storeCat = d ? (L1_TO_STORE[d.l1] ?? d.l2) : 'Uncategorised'
        storeCatMap[storeCat] = storeCatMap[storeCat] ? storeCatMap[storeCat] + ',' + p.catId : p.catId
      }

      setParsed({ darazCatMap, products, storeCatMap })
      setResults(products.map(p => ({ name: p.nameEn, status: 'pending', images: p.images.length, uploaded: 0 })))
      setStep('preview')
    } catch (e) {
      alert('Parse error: ' + (e instanceof Error ? e.message : String(e)))
    }
    setParsing(false)
  }

  // ── Step 2: Run import ─────────────────────────────────────────────────────
  const runImport = useCallback(async () => {
    if (!parsed) return
    setRunning(true); cancelRef.current = false; setStep('importing')

    for (let i = current; i < parsed.products.length; i++) {
      if (cancelRef.current) break
      setCurrent(i)

      const p       = parsed.products[i]
      const d       = parsed.darazCatMap[p.catId]
      const storeCat = d ? (L1_TO_STORE[d.l1] ?? d.l2) : 'Uncategorised'
      const color    = CAT_COLORS[storeCat] ?? '#16A34A'

      setResults(prev => {
        const next = [...prev]
        next[i] = { ...next[i], status: 'uploading' }
        return next
      })

      // Use Excel CDN URLs directly; fall back to Daraz name search if none
      const { urls: uploadedUrls, count: uploadedCount } = await findAndUploadImages(p.nameEn, p.images)
      setResults(prev => {
        const next = [...prev]
        next[i] = { ...next[i], uploaded: uploadedCount, images: uploadedUrls.length }
        return next
      })

      setResults(prev => {
        const next = [...prev]
        next[i] = { ...next[i], status: 'saving' }
        return next
      })

      try {
        const catId = await ensureCategory(storeCat, color)

        // Save category mapping
        await fetch('/api/admin/category-mappings', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'daraz', externalName: storeCat, externalId: p.catId, categoryId: catId }),
        })

        const slug = p.nameEn.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim()
          .replace(/\s+/g, '-').replace(/-+/g, '-') + '-' + Math.random().toString(36).slice(2, 7)

        const res = await fetch('/api/products', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: p.nameEn, slug,
            description: `${p.nameEn} — Available at Balapasa, Nepal's trusted electronics and lifestyle store.`,
            price: p.price, salePrice: p.salePrice,
            stock: p.stock, images: uploadedUrls,
            categoryId: catId, tags: [], isActive: true,
            isNew: true, isFeatured: false, isTaxable: true,
            trackInventory: true, sku: p.sku,
          }),
        })

        let ok = res.ok
        if (res.ok) {
          setResults(prev => {
            const next = [...prev]; next[i] = { ...next[i], status: 'done', uploaded: uploadedUrls.filter(u => u.startsWith('/uploads')).length }
            return next
          })
        } else {
          const err = await res.json()
          // SKU conflict → find existing product and update it instead
          if (p.sku && err.error?.toLowerCase().includes('sku')) {
            const listRes = await fetch(`/api/products?search=${encodeURIComponent(p.sku)}&admin=true&limit=5`)
            if (listRes.ok) {
              const { products: existing } = await listRes.json()
              const match = existing?.find((x: { sku: string | null }) => x.sku === p.sku)
              if (match) {
                const patchRes = await fetch(`/api/products/${match.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: p.nameEn, price: p.price, salePrice: p.salePrice, stock: p.stock, images: uploadedUrls }),
                })
                ok = patchRes.ok
              }
            }
          }
          if (ok) {
            setResults(prev => {
              const next = [...prev]; next[i] = { ...next[i], status: 'done', uploaded: uploadedUrls.filter(u => u.startsWith('/uploads')).length }
              return next
            })
          } else {
            setResults(prev => {
              const next = [...prev]; next[i] = { ...next[i], status: 'failed', error: err.error }
              return next
            })
          }
        }
      } catch (e) {
        setResults(prev => {
          const next = [...prev]; next[i] = { ...next[i], status: 'failed', error: e instanceof Error ? e.message : String(e) }
          return next
        })
      }
    }

    setRunning(false)
    if (!cancelRef.current) setStep('done')
  }, [parsed, current])

  // ── Computed stats ─────────────────────────────────────────────────────────
  const done   = results.filter(r => r.status === 'done').length
  const failed = results.filter(r => r.status === 'failed').length
  const pct    = results.length ? Math.round(((done + failed) / results.length) * 100) : 0

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-7">
        <h1 className="font-heading font-extrabold text-2xl text-slate-900 flex items-center gap-2">
          <Upload size={22} className="text-primary" /> Daraz Product Import
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Upload your Daraz seller export → images are fetched from your browser and saved to local storage
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-7">
        {(['upload','preview','importing','done'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${step === s ? 'bg-primary text-white' : (['preview','importing','done'].indexOf(s) <= ['upload','preview','importing','done'].indexOf(step)) ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {i + 1}
            </div>
            <span className={`text-xs font-semibold capitalize ${step === s ? 'text-primary' : 'text-slate-400'}`}>{s}</span>
            {i < 3 && <ArrowRight size={12} className="text-slate-300" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Upload ─────────────────────────────────────────────── */}
      {step === 'upload' && (
        <div className="space-y-5">
          {[
            { label: 'Category File', hint: 'category_daraz.xlsx', setter: setCatFile, file: catFile, required: false },
            { label: 'Product List',  hint: 'product_list_to_import.xlsx', setter: setProdFile, file: prodFile, required: true  },
          ].map(({ label, hint, setter, file, required }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                {label} {required && <span className="text-red-400">*</span>}
                <span className="ml-2 font-normal text-slate-300 normal-case">{hint}</span>
              </label>
              <div
                className={`flex items-center justify-center h-24 rounded-2xl border-2 border-dashed transition-all cursor-pointer
                  ${file ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'}`}
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'; input.accept = '.xlsx,.xls'
                  input.onchange = e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) setter(f) }
                  input.click()
                }}
              >
                {file ? (
                  <div className="flex items-center gap-3 text-green-700">
                    <FileSpreadsheet size={22} />
                    <div>
                      <p className="font-bold text-sm">{file.name}</p>
                      <p className="text-xs opacity-70">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <CheckCircle2 size={18} className="text-green-500" />
                  </div>
                ) : (
                  <div className="text-center text-slate-400">
                    <Upload size={18} className="mx-auto mb-1" />
                    <p className="text-xs">Click to upload {hint}</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          <button onClick={handleParse} disabled={!prodFile || parsing}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-2xl transition-colors cursor-pointer shadow-md shadow-primary/20">
            {parsing ? <><Loader2 size={16} className="animate-spin" /> Parsing files…</> : <>Parse & Preview <ArrowRight size={16} /></>}
          </button>
        </div>
      )}

      {/* ── Step 2: Preview ────────────────────────────────────────────── */}
      {step === 'preview' && parsed && (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Products',   value: parsed.products.length,              color: 'text-primary'     },
              { label: 'Categories', value: Object.keys(parsed.storeCatMap).length, color: 'text-violet-600'  },
              { label: 'Images',     value: parsed.products.reduce((s,p) => s + p.images.length, 0), color: 'text-blue-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 text-center">
                <p className={`font-extrabold text-3xl ${color}`}>{value.toLocaleString()}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Category mapping */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <button type="button" onClick={() => setShowMapping(s => !s)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer">
              <span className="font-bold text-slate-800 text-sm">Category Mapping ({Object.keys(parsed.storeCatMap).length} store categories)</span>
              {showMapping ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>
            {showMapping && (
              <div className="px-5 pb-4 space-y-2 border-t border-slate-50">
                {Object.entries(parsed.storeCatMap).map(([name, catIds]) => {
                  const count = catIds.split(',').reduce((s, id) => s + parsed.products.filter(p => p.catId === id).length, 0)
                  return (
                    <div key={name} className="flex items-center gap-3 py-1.5">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: CAT_COLORS[name] ?? '#94a3b8' }} />
                      <span className="text-sm font-semibold text-slate-700 flex-1">{name}</span>
                      <span className="text-xs text-slate-400">{count} products</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sample products */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <p className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">First 5 products</p>
            {parsed.products.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-slate-50 last:border-0">
                {p.images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0]} alt="" className="w-10 h-10 rounded-xl object-cover bg-slate-100" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{p.nameEn}</p>
                  <p className="text-xs text-slate-400">Rs. {p.price} · {p.images.length} images</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('upload')}
              className="px-5 py-3 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
              ← Back
            </button>
            <button onClick={runImport}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl transition-colors cursor-pointer shadow-md shadow-primary/20">
              <Play size={16} /> Start Import ({parsed.products.length} products)
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Importing ──────────────────────────────────────────── */}
      {(step === 'importing' || step === 'done') && (
        <div className="space-y-5">
          {/* Overall progress */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-slate-900">{step === 'done' ? 'Import Complete' : 'Importing…'}</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  {done} done · {failed} failed · {results.length - done - failed} remaining
                </p>
              </div>
              <span className="font-extrabold text-2xl text-primary">{pct}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #16A34A, #06B6D4)' }} />
            </div>

            <div className="flex gap-3 mt-4">
              {running ? (
                <button onClick={() => { cancelRef.current = true; setRunning(false) }}
                  className="flex items-center gap-2 px-4 py-2 border border-amber-200 bg-amber-50 text-amber-700 font-bold text-sm rounded-xl cursor-pointer">
                  <Pause size={14} /> Pause
                </button>
              ) : step !== 'done' && (
                <button onClick={runImport}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold text-sm rounded-xl cursor-pointer hover:bg-primary-dark transition-colors">
                  <Play size={14} /> Resume
                </button>
              )}
              {step === 'done' && (
                <button onClick={() => { setStep('upload'); setCatFile(null); setProdFile(null); setParsed(null); setResults([]); setCurrent(0) }}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 font-bold text-sm rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <RefreshCw size={14} /> New Import
                </button>
              )}
            </div>
          </div>

          {/* Product list */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="max-h-[480px] overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className={`flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0 transition-colors
                  ${i === current && running ? 'bg-primary-bg' : ''}`}>
                  <div className="shrink-0">
                    {r.status === 'done'      && <CheckCircle2 size={16} className="text-green-500" />}
                    {r.status === 'failed'    && <XCircle      size={16} className="text-red-500" />}
                    {r.status === 'uploading' && <Loader2      size={16} className="animate-spin text-primary" />}
                    {r.status === 'saving'    && <Loader2      size={16} className="animate-spin text-violet-500" />}
                    {r.status === 'pending'   && <div className="w-4 h-4 rounded-full border-2 border-slate-200" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{r.name}</p>
                    {r.status === 'uploading' && (
                      <p className="text-[10px] text-primary">Uploading images {r.uploaded}/{r.images}…</p>
                    )}
                    {r.status === 'saving' && <p className="text-[10px] text-violet-600">Saving to database…</p>}
                    {r.status === 'done'   && <p className="text-[10px] text-green-600">{r.uploaded} images saved locally</p>}
                    {r.status === 'failed' && <p className="text-[10px] text-red-500 truncate">{r.error}</p>}
                    {r.status === 'pending' && <p className="text-[10px] text-slate-400">Waiting…</p>}
                  </div>
                  <div className="shrink-0 text-[10px] font-bold text-slate-400">
                    {r.status === 'done' && `${r.uploaded}/${r.images}`}
                    {r.status === 'uploading' && (
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${r.images ? (r.uploaded / r.images) * 100 : 0}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {step === 'done' && (
            <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border ${failed ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
              {failed ? <AlertTriangle size={18} className="text-amber-600" /> : <CheckCircle2 size={18} className="text-green-600" />}
              <div>
                <p className="font-bold text-sm text-slate-800">
                  {done} products imported · {failed} failed
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visit <a href="/admin/products" className="text-primary underline cursor-pointer">Products page</a> to see your imported catalog.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
