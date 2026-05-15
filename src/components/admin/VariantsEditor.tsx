'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, X, GripVertical, ChevronDown, ChevronUp, Upload, Loader2, Image as ImageIcon, Library } from 'lucide-react'
import GalleryPickerModal from './GalleryPickerModal'

async function uploadVariantImage(file: File): Promise<string | null> {
  const form = new FormData()
  form.append('file', file)
  const res  = await fetch('/api/admin/upload', { method: 'POST', body: form })
  const data = await res.json()
  return res.ok ? data.url : null
}

function VariantImageCell({
  value, onChange, productImages,
}: {
  value: string; onChange: (url: string) => void; productImages: string[]
}) {
  const [open, setOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <div className="flex items-center justify-center">
      {/* Trigger */}
      <button type="button" onClick={() => setOpen(true)}
        className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-dashed border-slate-200 hover:border-primary/50 transition-colors cursor-pointer group"
        title="Pick image from product images">
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ImageIcon size={10} className="text-white" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-50 group-hover:bg-primary-bg transition-colors">
            <ImageIcon size={12} className="text-slate-400 group-hover:text-primary transition-colors" />
          </div>
        )}
      </button>

      {/* Modal */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 pointer-events-auto animate-fade-in-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-sm">Select Variant Image</h3>
                <button type="button" onClick={() => setOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                  <X size={14} />
                </button>
              </div>

              {productImages.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <ImageIcon size={28} className="mx-auto mb-2 text-slate-200" />
                  <p className="text-sm font-medium">No product images uploaded yet</p>
                  <p className="text-xs mt-1">Upload images in the Product Images section first</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {productImages.map((img, i) => (
                    <button key={i} type="button"
                      onClick={() => { onChange(img); setOpen(false) }}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer hover:scale-105 ${value === img ? 'border-primary shadow-md shadow-primary/25 scale-105' : 'border-transparent hover:border-slate-300'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                      {value === img && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <svg viewBox="0 0 10 8" className="w-3 h-3"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none"/></svg>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button type="button"
                  onClick={() => { setOpen(false); setPickerOpen(true) }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200">
                  <Library size={12} /> Pick from full library
                </button>
                {value && (
                  <button type="button" onClick={() => { onChange(''); setOpen(false) }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-red-100">
                    <X size={12} /> Remove image
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <GalleryPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(urls) => { if (urls[0]) onChange(urls[0]) }}
        mode="single"
        kind="image"
        initiallySelected={value ? [value] : []}
        title="Pick a variant image"
      />
    </div>
  )

}

export interface VOption  { name: string; values: string[] }
export interface VVariant {
  title:   string
  options: Record<string, string>
  sku:     string
  price:   string
  stock:   string
  image:   string
}

interface Props {
  basePrice:       string
  baseSku:         string
  productImages:   string[]
  onChange:        (options: VOption[], variants: VVariant[]) => void
  initialOptions?: VOption[]
}

const COMMON_OPTIONS = ['Size', 'Color', 'Material', 'Storage', 'Style', 'Length', 'Width']

function cartesian(arrays: string[][]): string[][] {
  if (!arrays.length) return [[]]
  return arrays.reduce<string[][]>(
    (acc, arr) => acc.flatMap(x => arr.map(y => [...x, y])),
    [[]]
  )
}

function generateTitle(combo: string[]) { return combo.join(' / ') }

function generateSKU(baseSku: string, index: number) {
  const code = baseSku ? baseSku.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6) : 'VAR'
  return `${code}-${String(index + 1).padStart(3, '0')}`
}

// ── Option row ──────────────────────────────────────────────────────────────

function OptionRow({
  opt, index, total,
  onChange, onRemove, onMoveUp, onMoveDown,
}: {
  opt: VOption; index: number; total: number
  onChange: (o: VOption) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [valInput, setValInput] = useState('')
  const [showSugg, setShowSugg] = useState(false)

  function addValue(v: string) {
    const trimmed = v.trim()
    if (trimmed && !opt.values.includes(trimmed)) {
      onChange({ ...opt, values: [...opt.values, trimmed] })
    }
    setValInput('')
  }

  return (
    <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
      <div className="flex items-center gap-2">
        <GripVertical size={14} className="text-slate-300 cursor-grab shrink-0" />

        {/* Option name */}
        <div className="relative flex-1">
          <input
            value={opt.name}
            onChange={e => onChange({ ...opt, name: e.target.value })}
            onFocus={() => setShowSugg(true)}
            onBlur={() => setTimeout(() => setShowSugg(false), 150)}
            placeholder="Option name (e.g. Size)"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 font-semibold"
          />
          {showSugg && (
            <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {COMMON_OPTIONS.filter(s => !s.toLowerCase().startsWith(opt.name.toLowerCase()) || opt.name === '').map(s => (
                <button key={s} type="button" onMouseDown={() => { onChange({ ...opt, name: s }); setShowSugg(false) }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Move up/down */}
        <div className="flex gap-0.5">
          <button type="button" onClick={onMoveUp} disabled={index === 0}
            className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer transition-colors">
            <ChevronUp size={14} />
          </button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1}
            className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer transition-colors">
            <ChevronDown size={14} />
          </button>
        </div>

        <button type="button" onClick={onRemove} className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Values */}
      <div className="flex flex-wrap gap-1.5">
        {opt.values.map(v => (
          <span key={v} className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg">
            {v}
            <button type="button" onClick={() => onChange({ ...opt, values: opt.values.filter(x => x !== v) })}
              className="text-slate-400 hover:text-red-500 cursor-pointer">
              <X size={9} />
            </button>
          </span>
        ))}
        <div className="flex gap-1">
          <input
            value={valInput}
            onChange={e => setValInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addValue(valInput) } }}
            placeholder={opt.name ? `Add ${opt.name} value…` : 'Add value…'}
            className="px-2.5 py-1 text-xs border border-dashed border-slate-300 rounded-lg bg-white outline-none focus:border-primary w-36"
          />
          <button type="button" onClick={() => addValue(valInput)}
            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg cursor-pointer transition-colors">
            <Plus size={11} />
          </button>
        </div>
      </div>

      {opt.values.length === 0 && (
        <p className="text-[11px] text-slate-400">Type values and press Enter or comma to add</p>
      )}
    </div>
  )
}

// ── Main VariantsEditor ─────────────────────────────────────────────────────

export default function VariantsEditor({ basePrice, baseSku, productImages, onChange, initialOptions }: Props) {
  const [enabled, setEnabled] = useState(false)
  const [options,  setOptions]  = useState<VOption[]>(initialOptions?.length ? initialOptions : [{ name: '', values: [] }])

  // Activate and populate when initialOptions are injected from import
  useEffect(() => {
    if (initialOptions?.length) {
      setOptions(initialOptions)
      setEnabled(true)
    }
  }, [initialOptions])
  const [variants, setVariants] = useState<VVariant[]>([])
  // Ref so updateVariant/deleteVariant can read current variants without stale closure
  const variantsRef = useRef<VVariant[]>([])
  useEffect(() => { variantsRef.current = variants }, [variants])

  // Re-generate variant combinations whenever options change
  useEffect(() => {
    if (!enabled) { onChange([], []); return }

    const validOpts = options.filter(o => o.name.trim() && o.values.length > 0)
    if (!validOpts.length) { onChange(options, []); return }

    const combos = cartesian(validOpts.map(o => o.values))
    const newVariants: VVariant[] = combos.map((combo, i) => {
      const title   = generateTitle(combo)
      const optMap  = Object.fromEntries(validOpts.map((o, j) => [o.name, combo[j]]))
      const existing = variantsRef.current.find(v => v.title === title)
      return existing ?? {
        title, options: optMap,
        sku:   generateSKU(baseSku, i),
        price: '',
        stock: '0',
        image: productImages[0] ?? '',  // auto-select first product image
      }
    })

    setVariants(newVariants)
    onChange(validOpts, newVariants)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, enabled, baseSku])

  // Don't call onChange inside setState updater — compute next state directly
  const updateVariant = useCallback((index: number, patch: Partial<VVariant>) => {
    const next = [...variantsRef.current]
    next[index] = { ...next[index], ...patch }
    setVariants(next)
    onChange(options.filter(o => o.name.trim() && o.values.length), next)
  }, [options, onChange])

  function addOption() {
    setOptions(o => [...o, { name: '', values: [] }])
  }

  function updateOption(i: number, opt: VOption) {
    setOptions(prev => prev.map((o, j) => j === i ? opt : o))
  }

  function removeOption(i: number) {
    setOptions(prev => prev.filter((_, j) => j !== i))
  }

  function moveOption(i: number, dir: -1 | 1) {
    setOptions(prev => {
      const arr = [...prev]
      const tmp = arr[i]; arr[i] = arr[i + dir]; arr[i + dir] = tmp
      return arr
    })
  }

  const validVariants = variants.filter(v => v.title)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
      {/* Header toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-slate-800 text-sm flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-extrabold flex items-center justify-center">4</span>
            Variants
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Add sizes, colors, storage options etc.</p>
        </div>
        <button type="button" onClick={() => setEnabled(e => !e)}
          className={`w-10 h-6 rounded-full transition-all duration-200 relative cursor-pointer ${enabled ? 'bg-primary' : 'bg-slate-200'}`}>
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? 'left-5' : 'left-1'}`} />
        </button>
      </div>

      {enabled && (
        <>
          {/* Options */}
          <div className="space-y-3">
            {options.map((opt, i) => (
              <OptionRow key={i} opt={opt} index={i} total={options.length}
                onChange={o => updateOption(i, o)}
                onRemove={() => removeOption(i)}
                onMoveUp={() => moveOption(i, -1)}
                onMoveDown={() => moveOption(i, 1)}
              />
            ))}
            {options.length < 3 && (
              <button type="button" onClick={addOption}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 hover:border-primary/40 text-slate-500 hover:text-primary text-sm font-semibold rounded-2xl w-full transition-colors cursor-pointer">
                <Plus size={15} /> Add another option
              </button>
            )}
          </div>

          {/* Variants table */}
          {validVariants.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {validVariants.length} variant{validVariants.length !== 1 ? 's' : ''} generated
                </p>
                <p className="text-[10px] text-slate-400">Leave price blank to use base price</p>
              </div>
              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-3 py-3 w-12 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Img</th>
                      <th className="text-left px-4 py-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Variant</th>
                      <th className="text-left px-3 py-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider w-28">Price (NPR)</th>
                      <th className="text-left px-3 py-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider w-20">Stock</th>
                      <th className="text-left px-3 py-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider w-36">SKU</th>
                      <th className="px-3 py-3 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {validVariants.map((v, i) => (
                      <tr key={v.title} className="hover:bg-slate-50/50">
                        <td className="px-3 py-3">
                          <VariantImageCell
                            value={v.image}
                            onChange={url => updateVariant(i, { image: url })}
                            productImages={productImages}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(v.options).map(([k, val]) => (
                              <span key={k} className="px-2 py-0.5 bg-primary-bg text-primary text-[11px] font-bold rounded-full">
                                {val}
                              </span>
                            ))}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{v.title}</p>
                        </td>
                        <td className="px-3 py-3">
                          <input type="number" min="0" value={v.price}
                            onChange={e => updateVariant(i, { price: e.target.value })}
                            placeholder={basePrice || '—'}
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/10" />
                        </td>
                        <td className="px-3 py-3">
                          <input type="number" min="0" value={v.stock}
                            onChange={e => updateVariant(i, { stock: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/10" />
                        </td>
                        <td className="px-3 py-3">
                          <input type="text" value={v.sku}
                            onChange={e => updateVariant(i, { sku: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary/10" />
                        </td>
                        <td className="px-3 py-3">
                          <button type="button" onClick={() => {
                            const next = [...variantsRef.current]; next.splice(i, 1)
                            setVariants(next)
                            onChange(options.filter(o => o.name.trim() && o.values.length), next)
                          }} className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer">
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Total stock across all variants: {validVariants.reduce((s, v) => s + Number(v.stock || 0), 0)} units
              </p>
            </div>
          )}

          {validVariants.length === 0 && options.some(o => o.name && o.values.length === 0) && (
            <p className="text-xs text-amber-600 bg-amber-50 px-4 py-2.5 rounded-xl">
              Add at least one value to each option to generate variants
            </p>
          )}
        </>
      )}

      {!enabled && (
        <p className="text-xs text-slate-400">
          Enable variants if this product comes in different sizes, colors, or configurations. Each variant can have its own price, stock, and SKU.
        </p>
      )}
    </div>
  )
}
