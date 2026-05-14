'use client'

import { useEffect, useState, useRef } from 'react'
import {
  TrendingUp, TrendingDown, Wallet, Receipt,
  Plus, Trash2, X, Loader2, Save, Download, BarChart3,
  BookOpen, ShoppingCart, CalendarDays, FileSpreadsheet,
  Printer, ChevronRight,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

/* ── Types ───────────────────────────────────────────────────────── */
interface Monthly   { month: string; label: string; revenue: number; expenses: number; profit: number }
interface CatRow    { category: string; amount: number }
interface Expense   { id: string; amount: number; category: string; description: string | null; paidTo: string | null; date: string }

interface CashEntry { date: string; type: 'IN' | 'OUT'; description: string; ref: string; paymentMethod?: string; amount: number; balance: number }
interface CashbookData { from: string; to: string; entries: CashEntry[]; totalIn: number; totalOut: number; closingBalance: number }

interface DayEntry   { date: string; cashIn: number; cashOut: number; count: number; net: number }
interface DaybookData { from: string; to: string; days: DayEntry[]; totalIn: number; totalOut: number }

interface SalesEntry { id: string; date: string; customer: string; phone: string; items: string; itemCount: number; paymentMethod: string; paymentStatus: string; status: string; subtotal: number; deliveryCharge: number; discount: number; total: number; source: string }
interface SalesData  { from: string; to: string; orders: SalesEntry[]; totalRevenue: number; totalOrders: number }

interface LedgerData { from: string; to: string; entries: Expense[] }

type ReportType = 'cashbook' | 'daybook' | 'sales' | 'expense-ledger'
interface ReportBase { from: string; to: string }
interface ReportModal { type: ReportType; title: string; data: ReportBase & (CashbookData | DaybookData | SalesData | LedgerData) }

interface ActivityEntry { date: string; time: string; type: 'IN' | 'OUT'; description: string; ref: string; paymentMethod: string; amount: number }
interface SummaryData {
  monthly: Monthly[]; totalRevenue: number; totalExpenses: number; totalProfit: number; byCategory: CatRow[]
  prevRevenue: number; prevExpenses: number; prevProfit: number
  pendingRevenue: number; orderCount: number; avgOrderValue: number
  recentActivity: ActivityEntry[]
}

/* ── Constants ──────────────────────────────────────────────────── */
const EXP_CATEGORIES = ['RENT', 'SALARY', 'SUPPLIER', 'UTILITIES', 'MARKETING', 'TRANSPORT', 'OTHER']

const CAT_META: Record<string, { color: string; bg: string; text: string }> = {
  RENT:       { color: 'bg-rose-500',    bg: 'bg-rose-50',    text: 'text-rose-700'    },
  SALARY:     { color: 'bg-violet-500',  bg: 'bg-violet-50',  text: 'text-violet-700'  },
  SUPPLIER:   { color: 'bg-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700'   },
  UTILITIES:  { color: 'bg-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700'    },
  MARKETING:  { color: 'bg-pink-500',    bg: 'bg-pink-50',    text: 'text-pink-700'    },
  TRANSPORT:  { color: 'bg-cyan-500',    bg: 'bg-cyan-50',    text: 'text-cyan-700'    },
  OTHER:      { color: 'bg-slate-400',   bg: 'bg-slate-50',   text: 'text-slate-600'   },
}

const REPORT_DOCS: Array<{ type: ReportType; title: string; desc: string; icon: React.ElementType; iconBg: string; iconColor: string }> = [
  { type: 'cashbook',       title: 'Bank Cash Book',   desc: 'Chronological cash in/out ledger with running balance',  icon: BookOpen,         iconBg: 'bg-blue-50',    iconColor: 'text-blue-600'    },
  { type: 'sales',          title: 'Sales Register',   desc: 'All orders with customer, items & payment details',       icon: ShoppingCart,     iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { type: 'expense-ledger', title: 'Expense Ledger',   desc: 'All expenses categorised with paid-to details',           icon: Receipt,          iconBg: 'bg-rose-50',    iconColor: 'text-rose-600'    },
  { type: 'daybook',        title: 'Day Book',         desc: 'Daily summary of all cash transactions',                  icon: CalendarDays,     iconBg: 'bg-amber-50',   iconColor: 'text-amber-600'   },
]

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300'

/* ── Print / CSV helpers (outside component) ─────────────────────── */
const fmtNPR = (n: number) => 'Rs. ' + Math.abs(Math.round(n)).toLocaleString('en-IN')

const PRINT_CSS = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#0f172a;padding:12mm 18mm}
  .hdr{border-bottom:2px solid #0f172a;padding-bottom:10px;margin-bottom:14px}
  .store{font-size:17px;font-weight:700;letter-spacing:-0.02em}
  .doc-title{font-size:13px;font-weight:600;color:#475569;margin-top:2px}
  .period{font-size:10px;color:#64748b;margin-top:3px}
  table{width:100%;border-collapse:collapse}
  th{background:#0f172a;color:#fff;padding:6px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
  td{padding:5px 10px;border-bottom:1px solid #f1f5f9;vertical-align:top;font-size:11px}
  tr:nth-child(even) td{background:#f8fafc}
  .in{color:#16a34a;font-weight:600}
  .out{color:#dc2626;font-weight:600}
  .neg{color:#dc2626}
  .mono{font-family:monospace;font-size:10px;color:#64748b}
  tfoot td{background:#0f172a!important;color:#fff;font-weight:700;padding:7px 10px}
  tfoot td.gold{color:#fbbf24}
  .tr{text-align:right}
  .bar{display:flex;gap:8px;margin-bottom:14px}
  .btn{padding:6px 14px;border:none;border-radius:5px;cursor:pointer;font-size:11px;font-weight:600}
  .bp{background:#0f172a;color:#fff}
  .bc{background:#e2e8f0;color:#0f172a}
  @media print{.bar{display:none}}
`

function printHeader(title: string, from: string, to: string) {
  return `<div class="hdr"><div class="store">Balapasa</div><div class="doc-title">${title}</div><div class="period">Period: ${from} to ${to} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString('en-NP')}</div></div>`
}

function openPrintWindow(title: string, from: string, to: string, bodyHtml: string) {
  const win = window.open('', '_blank', 'width=1050,height=750')
  if (!win) { alert('Please allow popups to print'); return }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>${PRINT_CSS}</style></head><body>
  <div class="bar">
    <button class="btn bp" onclick="window.print()">Print</button>
    <button class="btn bc" onclick="window.close()">Close</button>
  </div>
  ${printHeader(title, from, to)}
  ${bodyHtml}
  </body></html>`)
  win.document.close()
}

function buildPrintHtml(modal: ReportModal): string {
  const d = modal.data as never as Record<string, unknown>

  if (modal.type === 'cashbook') {
    const cb = modal.data as CashbookData
    const rows = cb.entries.map(e => `<tr>
      <td>${e.date}</td>
      <td>${e.description}</td>
      <td class="mono">${e.ref}</td>
      <td>${e.paymentMethod ?? ''}</td>
      <td class="tr in">${e.type === 'IN' ? fmtNPR(e.amount) : ''}</td>
      <td class="tr out">${e.type === 'OUT' ? fmtNPR(e.amount) : ''}</td>
      <td class="tr${e.balance < 0 ? ' neg' : ''}">${fmtNPR(e.balance)}</td>
    </tr>`).join('')
    return `<table><thead><tr><th>Date</th><th>Description</th><th>Ref #</th><th>Method</th><th class="tr">Cash In (Dr)</th><th class="tr">Cash Out (Cr)</th><th class="tr">Balance</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="4">CLOSING BALANCE</td><td class="tr in">${fmtNPR(cb.totalIn)}</td><td class="tr out">${fmtNPR(cb.totalOut)}</td><td class="tr gold">${fmtNPR(cb.closingBalance)}</td></tr></tfoot>
    </table>`
  }

  if (modal.type === 'daybook') {
    const db = modal.data as DaybookData
    const rows = db.days.map(d => `<tr>
      <td>${d.date}</td>
      <td class="tr in">${fmtNPR(d.cashIn)}</td>
      <td class="tr out">${fmtNPR(d.cashOut)}</td>
      <td class="tr${d.net < 0 ? ' neg' : ' in'}">${d.net >= 0 ? '+' : '-'}${fmtNPR(d.net)}</td>
      <td class="tr">${d.count}</td>
    </tr>`).join('')
    return `<table><thead><tr><th>Date</th><th class="tr">Cash In</th><th class="tr">Cash Out</th><th class="tr">Net</th><th class="tr">Txns</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td>TOTAL</td><td class="tr in">${fmtNPR(db.totalIn)}</td><td class="tr out">${fmtNPR(db.totalOut)}</td><td class="tr gold">${fmtNPR(db.totalIn - db.totalOut)}</td><td></td></tr></tfoot>
    </table>`
  }

  if (modal.type === 'sales') {
    const sd = modal.data as SalesData
    const rows = sd.orders.map((o, i) => `<tr>
      <td>${i + 1}</td>
      <td>${o.date}</td>
      <td class="mono">${o.id}</td>
      <td>${o.customer}</td>
      <td>${o.phone}</td>
      <td style="max-width:180px;word-break:break-word;font-size:10px">${o.items}</td>
      <td>${o.paymentMethod}</td>
      <td>${o.paymentStatus}</td>
      <td>${o.status}</td>
      <td class="tr">${fmtNPR(o.subtotal)}</td>
      <td class="tr">${o.deliveryCharge > 0 ? fmtNPR(o.deliveryCharge) : '—'}</td>
      <td class="tr${o.discount > 0 ? ' out' : ''}">${o.discount > 0 ? `-${fmtNPR(o.discount)}` : '—'}</td>
      <td class="tr" style="font-weight:600">${fmtNPR(o.total)}</td>
    </tr>`).join('')
    return `<table><thead><tr><th>#</th><th>Date</th><th>Order ID</th><th>Customer</th><th>Phone</th><th>Items</th><th>Method</th><th>Payment</th><th>Status</th><th class="tr">Subtotal</th><th class="tr">Delivery</th><th class="tr">Discount</th><th class="tr">Total</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="12" class="tr">Total Revenue (Paid)</td><td class="tr gold">${fmtNPR(sd.totalRevenue)}</td></tr></tfoot>
    </table>`
  }

  if (modal.type === 'expense-ledger') {
    const ld = modal.data as LedgerData
    const total = ld.entries.reduce((s, e) => s + e.amount, 0)
    const rows = ld.entries.map((e, i) => `<tr>
      <td>${i + 1}</td>
      <td>${e.date.slice(0, 10)}</td>
      <td><strong>${e.category}</strong></td>
      <td>${e.description ?? '—'}</td>
      <td>${e.paidTo ?? '—'}</td>
      <td class="tr out" style="font-weight:600">${fmtNPR(e.amount)}</td>
    </tr>`).join('')
    return `<table><thead><tr><th>#</th><th>Date</th><th>Category</th><th>Description</th><th>Paid To</th><th class="tr">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="5" class="tr">Total Expenses</td><td class="tr gold">${fmtNPR(total)}</td></tr></tfoot>
    </table>`
  }

  void d
  return ''
}

function buildCSV(modal: ReportModal): string {
  const encode = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`

  if (modal.type === 'cashbook') {
    const cb = modal.data as CashbookData
    return [
      ['Date', 'Description', 'Ref', 'Method', 'Cash In', 'Cash Out', 'Balance'].map(encode).join(','),
      ...cb.entries.map(e => [e.date, e.description, e.ref, e.paymentMethod ?? '', e.type === 'IN' ? e.amount : '', e.type === 'OUT' ? e.amount : '', e.balance].map(encode).join(',')),
      '',
      ['', '', '', 'TOTAL', cb.totalIn, cb.totalOut, cb.closingBalance].map(encode).join(','),
    ].join('\n')
  }

  if (modal.type === 'daybook') {
    const db = modal.data as DaybookData
    return [
      ['Date', 'Cash In', 'Cash Out', 'Net', 'Transactions'].map(encode).join(','),
      ...db.days.map(d => [d.date, d.cashIn, d.cashOut, d.net, d.count].map(encode).join(',')),
      '',
      ['TOTAL', db.totalIn, db.totalOut, db.totalIn - db.totalOut, ''].map(encode).join(','),
    ].join('\n')
  }

  if (modal.type === 'sales') {
    const sd = modal.data as SalesData
    return [
      ['Date', 'Order ID', 'Customer', 'Phone', 'Items', 'Method', 'Payment Status', 'Order Status', 'Subtotal', 'Delivery', 'Discount', 'Total', 'Source'].map(encode).join(','),
      ...sd.orders.map(o => [o.date, o.id, o.customer, o.phone, o.items, o.paymentMethod, o.paymentStatus, o.status, o.subtotal, o.deliveryCharge, o.discount, o.total, o.source].map(encode).join(',')),
      '',
      ['', '', '', '', '', '', '', 'Total Revenue', '', '', '', sd.totalRevenue, ''].map(encode).join(','),
    ].join('\n')
  }

  if (modal.type === 'expense-ledger') {
    const ld = modal.data as LedgerData
    const total = ld.entries.reduce((s, e) => s + e.amount, 0)
    return [
      ['Date', 'Category', 'Description', 'Paid To', 'Amount'].map(encode).join(','),
      ...ld.entries.map(e => [e.date.slice(0, 10), e.category, e.description ?? '', e.paidTo ?? '', e.amount].map(encode).join(',')),
      '',
      ['', '', '', 'TOTAL', total].map(encode).join(','),
    ].join('\n')
  }

  return ''
}

/* ── Reusable UI helpers ─────────────────────────────────────────── */
function DeltaBadge({ current, prev }: { current: number; prev: number }) {
  if (prev === 0) return null
  const pct = Math.round(((current - prev) / Math.abs(prev)) * 100)
  const up  = pct >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
      {up ? '↑' : '↓'}{Math.abs(pct)}%
    </span>
  )
}

function SmoothAreaChart({ data }: { data: Monthly[] }) {
  if (data.length === 0) return <div className="flex items-center justify-center h-40 text-slate-300 text-sm">No data for this period</div>
  const W = 600, H = 160, PAD = 6
  const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.expenses)), 1)
  const toX = (i: number) => data.length === 1 ? W / 2 : PAD + (i / (data.length - 1)) * (W - PAD * 2)
  const toY = (v: number) => H - PAD - (v / maxVal) * (H - PAD * 2)
  function bezier(values: number[]) {
    const pts = values.map((v, i) => ({ x: toX(i), y: toY(v) }))
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`
    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], c = pts[i], mx = (p.x + c.x) / 2
      d += ` C ${mx} ${p.y} ${mx} ${c.y} ${c.x} ${c.y}`
    }
    return d
  }
  const revLine = bezier(data.map(d => d.revenue))
  const expLine = bezier(data.map(d => d.expenses))
  const lastX   = toX(data.length - 1), firstX = toX(0)
  const revArea = revLine + ` L ${lastX} ${H} L ${firstX} ${H} Z`
  const expArea = expLine + ` L ${lastX} ${H} L ${firstX} ${H} Z`
  const revPts  = data.map((d, i) => ({ x: toX(i), y: toY(d.revenue) }))
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <defs>
          <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map(p => (
          <line key={p} x1={0} y1={toY(maxVal * p)} x2={W} y2={toY(maxVal * p)} stroke="#f1f5f9" strokeWidth="1" />
        ))}
        <path d={expArea} fill="url(#gExp)" />
        <path d={expLine} fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="5 3" strokeLinecap="round" />
        <path d={revArea} fill="url(#gRev)" />
        <path d={revLine} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {revPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#10b981" stroke="white" strokeWidth="2" />)}
      </svg>
      <div className="flex justify-between px-1 mt-2">
        {data.map(m => <span key={m.month} className="text-[10px] text-slate-400 font-semibold">{m.label.split(' ')[0]}</span>)}
      </div>
    </div>
  )
}

/* ── Page component ──────────────────────────────────────────────── */
export default function FinancePage() {
  const [summary,       setSummary]       = useState<SummaryData | null>(null)
  const [expenses,      setExpenses]      = useState<Expense[]>([])
  const [loading,       setLoading]       = useState(true)
  const [tab,           setTab]           = useState<'dashboard' | 'expenses' | 'pl' | 'reports'>('dashboard')
  const [showForm,      setShowForm]      = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [months,        setMonths]        = useState(6)
  const [tooltip,       setTooltip]       = useState<{ x: number; y: number; text: string } | null>(null)
  const [form, setForm] = useState({ amount: '', category: 'SUPPLIER', description: '', paidTo: '', date: new Date().toISOString().slice(0, 10) })
  const fileRef = useRef<HTMLAnchorElement>(null)

  // Reports state
  const [reportFrom,    setReportFrom]    = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10) })
  const [reportTo,      setReportTo]      = useState(new Date().toISOString().slice(0, 10))
  const [reportLoading, setReportLoading] = useState<string | null>(null)
  const [reportModal,   setReportModal]   = useState<ReportModal | null>(null)

  async function load() {
    setLoading(true)
    const [s, e] = await Promise.all([
      fetch(`/api/admin/finance/summary?months=${months}`).then(r => r.json()),
      fetch('/api/admin/finance/expenses?limit=500').then(r => r.json()),
    ])
    if (!s.error) setSummary(s)
    if (!e.error) setExpenses(e.expenses ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [months]) // eslint-disable-line react-hooks/exhaustive-deps

  async function addExpense(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/finance/expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ amount: '', category: 'SUPPLIER', description: '', paidTo: '', date: new Date().toISOString().slice(0, 10) })
      load()
    }
    setSaving(false)
  }

  async function deleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return
    await fetch(`/api/admin/finance/expenses/${id}`, { method: 'DELETE' })
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  function exportCSV() {
    if (!summary) return
    const rows = [
      ['Month', 'Revenue (NPR)', 'Expenses (NPR)', 'Profit (NPR)'],
      ...summary.monthly.map(m => [m.label, m.revenue, m.expenses, m.profit]),
      [],
      ['TOTAL', summary.totalRevenue, summary.totalExpenses, summary.totalProfit],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    if (fileRef.current) { fileRef.current.href = url; fileRef.current.download = 'profit-loss.csv'; fileRef.current.click() }
    URL.revokeObjectURL(url)
  }

  async function generateReport(type: ReportType) {
    setReportLoading(type)
    try {
      if (type === 'cashbook') {
        const data: CashbookData = await fetch(`/api/admin/finance/cashbook?from=${reportFrom}&to=${reportTo}`).then(r => r.json())
        setReportModal({ type, title: 'Bank Cash Book', data })
      } else if (type === 'daybook') {
        const cb: CashbookData = await fetch(`/api/admin/finance/cashbook?from=${reportFrom}&to=${reportTo}`).then(r => r.json())
        const dayMap: Record<string, { cashIn: number; cashOut: number; count: number }> = {}
        for (const e of cb.entries) {
          if (!dayMap[e.date]) dayMap[e.date] = { cashIn: 0, cashOut: 0, count: 0 }
          if (e.type === 'IN') { dayMap[e.date].cashIn += e.amount; dayMap[e.date].count++ }
          else                 { dayMap[e.date].cashOut += e.amount; dayMap[e.date].count++ }
        }
        const days: DayEntry[] = Object.entries(dayMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, v]) => ({ date, cashIn: v.cashIn, cashOut: v.cashOut, count: v.count, net: v.cashIn - v.cashOut }))
        setReportModal({ type, title: 'Day Book', data: { from: cb.from, to: cb.to, days, totalIn: cb.totalIn, totalOut: cb.totalOut } })
      } else if (type === 'sales') {
        const data: SalesData = await fetch(`/api/admin/finance/sales-register?from=${reportFrom}&to=${reportTo}`).then(r => r.json())
        setReportModal({ type, title: 'Sales Register', data })
      } else if (type === 'expense-ledger') {
        const filtered = expenses.filter(e => { const d = e.date.slice(0, 10); return d >= reportFrom && d <= reportTo })
        setReportModal({ type, title: 'Expense Ledger', data: { from: reportFrom, to: reportTo, entries: filtered } })
      }
    } catch (e) { console.error(e) }
    setReportLoading(null)
  }

  function handlePrint() {
    if (!reportModal) return
    openPrintWindow(reportModal.title, reportModal.data.from, reportModal.data.to, buildPrintHtml(reportModal))
  }

  function handleExportCSV() {
    if (!reportModal) return
    const csv = buildCSV(reportModal)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url; a.download = `${reportModal.type}-${reportModal.data.from}-${reportModal.data.to}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const profitMargin = summary && summary.totalRevenue > 0 ? Math.round((summary.totalProfit / summary.totalRevenue) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-50/50">
      <a ref={fileRef} className="hidden" />

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-4 md:px-8 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20">
              <BarChart3 size={18} className="text-amber-400" />
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-xl text-slate-900 leading-tight">Finance</h1>
              <p className="text-slate-400 text-xs mt-0.5">Revenue, expenses & accounting documents</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <select value={months} onChange={e => setMonths(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-slate-200 bg-white rounded-xl outline-none focus:border-primary cursor-pointer text-slate-700 font-medium transition-colors hover:border-slate-300">
              {[3, 6, 12].map(m => <option key={m} value={m}>Last {m} months</option>)}
            </select>
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-sm font-semibold text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 cursor-pointer transition-all">
              <Download size={14} /> Export P&L
            </button>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 cursor-pointer transition-colors shadow-lg shadow-slate-900/20">
              <Plus size={15} /> Add Expense
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mt-5 border-b border-slate-100 -mb-5">
          {([['dashboard', 'Overview'], ['expenses', 'Expenses'], ['pl', 'P&L Report'], ['reports', 'Documents']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`px-5 py-3 text-sm font-semibold cursor-pointer transition-all border-b-2 -mb-px ${tab === v ? 'text-slate-900 border-slate-900' : 'text-slate-400 border-transparent hover:text-slate-600 hover:border-slate-300'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="p-4 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 size={22} className="animate-spin text-slate-400" /></div>
        ) : !summary && tab !== 'reports' ? (
          <div className="text-center py-20 text-slate-400 text-sm">Failed to load finance data</div>
        ) : (
          <>
            {/* ── Overview tab (Shopify/Stripe style) ───────────── */}
            {tab === 'dashboard' && summary && (
              <div className="space-y-5">

                {/* KPI row — 5 cards with period-over-period deltas */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {/* Revenue */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <TrendingUp size={15} className="text-emerald-600" />
                      </div>
                      <DeltaBadge current={summary.totalRevenue} prev={summary.prevRevenue} />
                    </div>
                    <p className="font-heading font-extrabold text-xl text-emerald-600 leading-none tabular-nums">{formatPrice(summary.totalRevenue)}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1.5">Total Revenue</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{summary.orderCount} paid orders</p>
                  </div>
                  {/* Expenses */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                        <TrendingDown size={15} className="text-rose-500" />
                      </div>
                      <DeltaBadge current={summary.totalExpenses} prev={summary.prevExpenses} />
                    </div>
                    <p className="font-heading font-extrabold text-xl text-rose-500 leading-none tabular-nums">{formatPrice(summary.totalExpenses)}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1.5">Total Expenses</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{summary.byCategory.length} categories</p>
                  </div>
                  {/* Net Profit */}
                  <div className={`bg-white rounded-2xl border p-5 hover:shadow-sm transition-shadow ${summary.totalProfit >= 0 ? 'border-primary/10' : 'border-rose-100'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${summary.totalProfit >= 0 ? 'bg-primary-bg' : 'bg-rose-50'}`}>
                        <Wallet size={15} className={summary.totalProfit >= 0 ? 'text-primary' : 'text-rose-500'} />
                      </div>
                      <DeltaBadge current={summary.totalProfit} prev={summary.prevProfit} />
                    </div>
                    <p className={`font-heading font-extrabold text-xl leading-none tabular-nums ${summary.totalProfit >= 0 ? 'text-primary' : 'text-rose-600'}`}>
                      {summary.totalProfit >= 0 ? '+' : ''}{formatPrice(summary.totalProfit)}
                    </p>
                    <p className="text-xs font-bold text-slate-500 mt-1.5">Net Profit</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{profitMargin >= 0 ? '+' : ''}{profitMargin}% margin</p>
                  </div>
                  {/* AOV */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                        <BarChart3 size={15} className="text-blue-600" />
                      </div>
                    </div>
                    <p className="font-heading font-extrabold text-xl text-blue-600 leading-none tabular-nums">{formatPrice(summary.avgOrderValue)}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1.5">Avg Order Value</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Last {months} months</p>
                  </div>
                  {/* Pending Revenue */}
                  <div className={`rounded-2xl border p-5 hover:shadow-sm transition-shadow ${summary.pendingRevenue > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${summary.pendingRevenue > 0 ? 'bg-amber-100' : 'bg-slate-50'}`}>
                        <Receipt size={15} className={summary.pendingRevenue > 0 ? 'text-amber-600' : 'text-slate-400'} />
                      </div>
                      {summary.pendingRevenue > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">Unpaid</span>
                      )}
                    </div>
                    <p className={`font-heading font-extrabold text-xl leading-none tabular-nums ${summary.pendingRevenue > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{formatPrice(summary.pendingRevenue)}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1.5">Pending Revenue</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Outstanding orders</p>
                  </div>
                </div>

                {/* Area chart — full width */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="font-heading font-bold text-slate-900 text-sm">Revenue Trend</h2>
                      <p className="text-[11px] text-slate-400 mt-0.5">Last {months} months</p>
                    </div>
                    <div className="flex items-center gap-5 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-0.5 bg-emerald-500 rounded-full inline-block" /> Revenue
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-0 border-t-2 border-dashed border-rose-400 inline-block" /> Expenses
                      </span>
                    </div>
                  </div>
                  <SmoothAreaChart data={summary.monthly} />
                </div>

                {/* Bottom row: category breakdown + recent activity */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5">

                  {/* Expenses by category — 2/5 */}
                  <div className="col-span-2 bg-white rounded-2xl border border-slate-100 p-6">
                    <h2 className="font-heading font-bold text-slate-900 text-sm mb-5">Expenses by Category</h2>
                    {summary.byCategory.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-slate-300 text-sm">No expenses recorded</div>
                    ) : (
                      <div className="space-y-3.5">
                        {summary.byCategory.map(c => {
                          const max  = summary.byCategory[0]?.amount ?? 1
                          const meta = CAT_META[c.category] ?? CAT_META.OTHER
                          const pct  = Math.round((c.amount / summary.totalExpenses) * 100)
                          return (
                            <div key={c.category}>
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                  <span className={`w-1.5 h-1.5 rounded-full ${meta.color}`} />{c.category}
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400">{pct}%</span>
                                  <span className="text-xs font-bold text-slate-900">{formatPrice(c.amount)}</span>
                                </span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${meta.color} transition-all duration-500`} style={{ width: `${(c.amount / max) * 100}%` }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Recent Activity — 3/5 (Stripe-style) */}
                  <div className="col-span-3 bg-white rounded-2xl border border-slate-100 p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="font-heading font-bold text-slate-900 text-sm">Recent Activity</h2>
                      <button onClick={() => setTab('expenses')} className="text-xs text-primary font-bold hover:underline cursor-pointer">View all</button>
                    </div>
                    {summary.recentActivity.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-slate-300 text-sm">No transactions yet</div>
                    ) : (
                      <div className="space-y-0 divide-y divide-slate-50">
                        {summary.recentActivity.map((a, i) => (
                          <div key={i} className="flex items-center justify-between py-3 hover:bg-slate-50/60 -mx-2 px-2 rounded-xl transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${a.type === 'IN' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                {a.type === 'IN'
                                  ? <TrendingUp size={13} className="text-emerald-600" />
                                  : <TrendingDown size={13} className="text-rose-500" />
                                }
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800 leading-tight">{a.description}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                  <span>{a.date}</span>
                                  {a.paymentMethod && <><span>·</span><span className="font-mono">{a.paymentMethod}</span></>}
                                  <span>·</span><span className="font-mono text-slate-300">{a.ref}</span>
                                </p>
                              </div>
                            </div>
                            <span className={`text-sm font-bold tabular-nums ${a.type === 'IN' ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {a.type === 'IN' ? '+' : '-'}{formatPrice(a.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Expenses tab ──────────────────────────────────── */}
            {tab === 'expenses' && (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-700">{expenses.length} expense{expenses.length !== 1 ? 's' : ''} recorded</p>
                  <button onClick={() => setShowForm(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
                    <Plus size={12} /> Add Expense
                  </button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      {['Date', 'Category', 'Description', 'Paid To', 'Amount', ''].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {expenses.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-16">
                        <Receipt size={28} className="text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">No expenses recorded yet</p>
                      </td></tr>
                    ) : expenses.map(e => {
                      const meta = CAT_META[e.category] ?? CAT_META.OTHER
                      return (
                        <tr key={e.id} className="hover:bg-slate-50/60 transition-colors group">
                          <td className="px-5 py-3.5 text-sm text-slate-500 font-medium whitespace-nowrap">
                            {new Date(e.date).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: '2-digit' })}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg ${meta.bg} ${meta.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${meta.color}`} />{e.category}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-slate-700 max-w-[200px] truncate">{e.description ?? <span className="text-slate-300">—</span>}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-500">{e.paidTo ?? <span className="text-slate-300">—</span>}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-900 text-sm tabular-nums">{formatPrice(e.amount)}</td>
                          <td className="px-5 py-3.5">
                            <button onClick={() => deleteExpense(e.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all cursor-pointer">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── P&L tab ───────────────────────────────────────── */}
            {tab === 'pl' && summary && (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <div>
                    <h2 className="font-heading font-bold text-slate-900">Profit & Loss Statement</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Last {months} months</p>
                  </div>
                  <button onClick={exportCSV}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors">
                    <Download size={13} /> Export CSV
                  </button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      {['Period', 'Revenue', 'Expenses', 'Net Profit', 'Margin'].map(h => (
                        <th key={h} className="text-left px-6 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {summary.monthly.map(m => {
                      const margin = m.revenue > 0 ? Math.round((m.profit / m.revenue) * 100) : 0
                      return (
                        <tr key={m.month} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-800 text-sm">{m.label}</td>
                          <td className="px-6 py-4 text-emerald-600 font-bold text-sm tabular-nums">{formatPrice(m.revenue)}</td>
                          <td className="px-6 py-4 text-rose-500 font-bold text-sm tabular-nums">{formatPrice(m.expenses)}</td>
                          <td className={`px-6 py-4 font-extrabold text-sm tabular-nums ${m.profit >= 0 ? 'text-primary' : 'text-rose-600'}`}>
                            {m.profit >= 0 ? '+' : ''}{formatPrice(m.profit)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold tabular-nums ${margin >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                              {margin >= 0 ? '+' : ''}{margin}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="bg-slate-900 text-white">
                      <td className="px-6 py-4 font-bold text-sm text-slate-300">Total ({months}m)</td>
                      <td className="px-6 py-4 font-bold text-sm text-emerald-400 tabular-nums">{formatPrice(summary.totalRevenue)}</td>
                      <td className="px-6 py-4 font-bold text-sm text-rose-400 tabular-nums">{formatPrice(summary.totalExpenses)}</td>
                      <td className={`px-6 py-4 font-extrabold text-sm tabular-nums ${summary.totalProfit >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {summary.totalProfit >= 0 ? '+' : ''}{formatPrice(summary.totalProfit)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold tabular-nums ${summary.totalProfit >= 0 ? 'bg-amber-400/20 text-amber-300' : 'bg-rose-400/20 text-rose-300'}`}>
                          {profitMargin >= 0 ? '+' : ''}{profitMargin}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Reports tab ───────────────────────────────────── */}
            {tab === 'reports' && (
              <div className="space-y-6">
                {/* Date range selector */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Report Period</p>
                  <div className="flex items-center gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">From</label>
                      <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary cursor-pointer transition-all" />
                    </div>
                    <div className="pt-4 text-slate-300">→</div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">To</label>
                      <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary cursor-pointer transition-all" />
                    </div>
                    <div className="pt-4">
                      <button onClick={() => {
                        const d = new Date()
                        setReportFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10))
                        setReportTo(d.toISOString().slice(0, 10))
                      }} className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors">
                        This month
                      </button>
                    </div>
                    <div className="pt-4">
                      <button onClick={() => {
                        const d = new Date()
                        const y = d.getFullYear()
                        setReportFrom(`${y}-01-01`)
                        setReportTo(`${y}-12-31`)
                      }} className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors">
                        This year
                      </button>
                    </div>
                  </div>
                </div>

                {/* Document cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {REPORT_DOCS.map(doc => (
                    <button
                      key={doc.type}
                      onClick={() => generateReport(doc.type)}
                      disabled={reportLoading === doc.type}
                      className="bg-white rounded-2xl border border-slate-100 p-6 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group text-left disabled:opacity-60 disabled:cursor-wait"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-11 h-11 rounded-2xl ${doc.iconBg} flex items-center justify-center flex-shrink-0`}>
                            <doc.icon size={20} className={doc.iconColor} />
                          </div>
                          <div>
                            <h3 className="font-heading font-bold text-slate-900 text-sm">{doc.title}</h3>
                            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{doc.desc}</p>
                          </div>
                        </div>
                        {reportLoading === doc.type
                          ? <Loader2 size={16} className="animate-spin text-slate-400 mt-1 flex-shrink-0" />
                          : <ChevronRight size={16} className="text-slate-200 group-hover:text-slate-500 transition-colors mt-1 flex-shrink-0" />
                        }
                      </div>
                      <div className="flex items-center gap-1.5 mt-4 pl-14">
                        {['Print', 'CSV', 'Preview'].map(fmt => (
                          <span key={fmt} className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-400 rounded-md">{fmt}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Quick tip */}
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                  <FileSpreadsheet size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Documents are generated from live data. Set the date range above, then click any document to preview it — you can print or export to CSV from the preview.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hover tooltip */}
      {tooltip && (
        <div className="fixed z-50 pointer-events-none px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}>
          {tooltip.text}
        </div>
      )}

      {/* ── Add Expense modal ───────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
                  <Receipt size={15} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-slate-900 text-sm">Add Expense</h2>
                  <p className="text-[11px] text-slate-400">Record a business expense</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-all">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={addExpense} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount (NPR)</label>
                  <input type="number" min="0" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                    {EXP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Monthly office rent" className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Paid To</label>
                  <input value={form.paidTo} onChange={e => setForm(f => ({ ...f, paidTo: e.target.value }))} placeholder="Vendor / person" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl cursor-pointer transition-colors shadow-lg shadow-slate-900/20 disabled:opacity-60">
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Expense</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Report preview overlay ──────────────────────────────── */}
      {reportModal && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Sticky header */}
          <div className="flex items-center justify-between px-8 py-4 border-b border-slate-100 bg-white shadow-sm flex-shrink-0">
            <div>
              <h2 className="font-heading font-bold text-slate-900">{reportModal.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {reportModal.data.from} — {reportModal.data.to}
                &nbsp;·&nbsp; Balapasa
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                <Download size={14} /> CSV
              </button>
              <button onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer transition-colors shadow-lg shadow-slate-900/20">
                <Printer size={14} /> Print
              </button>
              <button onClick={() => setReportModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-all ml-1">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Scrollable document */}
          <div className="flex-1 overflow-auto">
            <div className="max-w-6xl mx-auto px-8 py-8">
              {/* Document header */}
              <div className="mb-6 pb-5 border-b-2 border-slate-900">
                <p className="font-heading font-extrabold text-2xl text-slate-900">Balapasa</p>
                <p className="text-slate-600 font-semibold mt-0.5">{reportModal.title}</p>
                <p className="text-sm text-slate-400 mt-1">Period: {reportModal.data.from} to {reportModal.data.to}</p>
              </div>

              {/* Cash Book */}
              {reportModal.type === 'cashbook' && (() => {
                const cb = reportModal.data as CashbookData
                return (
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      {[
                        { label: 'Total Cash In',  value: cb.totalIn,        color: 'text-emerald-600' },
                        { label: 'Total Cash Out', value: cb.totalOut,       color: 'text-rose-500'    },
                        { label: 'Closing Balance', value: cb.closingBalance, color: cb.closingBalance >= 0 ? 'text-primary' : 'text-rose-600' },
                      ].map(s => (
                        <div key={s.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                          <p className={`font-heading font-extrabold text-xl mt-1 ${s.color}`}>{formatPrice(s.value)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-900 text-white">
                            {['Date', 'Description', 'Ref #', 'Method', 'Cash In (Dr)', 'Cash Out (Cr)', 'Balance'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {cb.entries.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-10 text-slate-300 text-sm">No transactions in this period</td></tr>
                          ) : cb.entries.map((e, i) => (
                            <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{e.date}</td>
                              <td className="px-4 py-3 text-sm text-slate-800 max-w-[280px]">{e.description}</td>
                              <td className="px-4 py-3 text-[11px] font-mono text-slate-400">{e.ref}</td>
                              <td className="px-4 py-3 text-xs text-slate-500">{e.paymentMethod ?? '—'}</td>
                              <td className="px-4 py-3 text-sm font-bold text-emerald-600 tabular-nums">{e.type === 'IN' ? formatPrice(e.amount) : ''}</td>
                              <td className="px-4 py-3 text-sm font-bold text-rose-500 tabular-nums">{e.type === 'OUT' ? formatPrice(e.amount) : ''}</td>
                              <td className={`px-4 py-3 text-sm font-extrabold tabular-nums ${e.balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{formatPrice(e.balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-900">
                            <td colSpan={4} className="px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Closing Balance</td>
                            <td className="px-4 py-3 text-sm font-extrabold text-emerald-400 tabular-nums">{formatPrice(cb.totalIn)}</td>
                            <td className="px-4 py-3 text-sm font-extrabold text-rose-400 tabular-nums">{formatPrice(cb.totalOut)}</td>
                            <td className={`px-4 py-3 text-sm font-extrabold tabular-nums ${cb.closingBalance >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>{formatPrice(cb.closingBalance)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )
              })()}

              {/* Day Book */}
              {reportModal.type === 'daybook' && (() => {
                const db = reportModal.data as DaybookData
                return (
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      {[
                        { label: 'Total Cash In',  value: db.totalIn,              color: 'text-emerald-600' },
                        { label: 'Total Cash Out', value: db.totalOut,             color: 'text-rose-500'    },
                        { label: 'Net Cash Flow',  value: db.totalIn - db.totalOut, color: (db.totalIn - db.totalOut) >= 0 ? 'text-primary' : 'text-rose-600' },
                      ].map(s => (
                        <div key={s.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                          <p className={`font-heading font-extrabold text-xl mt-1 ${s.color}`}>{formatPrice(s.value)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-900 text-white">
                            {['Date', 'Cash In', 'Cash Out', 'Net', 'Transactions'].map(h => (
                              <th key={h} className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {db.days.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-10 text-slate-300 text-sm">No transactions in this period</td></tr>
                          ) : db.days.map((d, i) => (
                            <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-5 py-3.5 text-sm font-semibold text-slate-800">{d.date}</td>
                              <td className="px-5 py-3.5 text-sm font-bold text-emerald-600 tabular-nums">{d.cashIn > 0 ? formatPrice(d.cashIn) : '—'}</td>
                              <td className="px-5 py-3.5 text-sm font-bold text-rose-500 tabular-nums">{d.cashOut > 0 ? formatPrice(d.cashOut) : '—'}</td>
                              <td className={`px-5 py-3.5 text-sm font-extrabold tabular-nums ${d.net >= 0 ? 'text-primary' : 'text-rose-600'}`}>
                                {d.net >= 0 ? '+' : ''}{formatPrice(d.net)}
                              </td>
                              <td className="px-5 py-3.5 text-sm text-slate-500">{d.count}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-900">
                            <td className="px-5 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Total</td>
                            <td className="px-5 py-3 text-sm font-extrabold text-emerald-400 tabular-nums">{formatPrice(db.totalIn)}</td>
                            <td className="px-5 py-3 text-sm font-extrabold text-rose-400 tabular-nums">{formatPrice(db.totalOut)}</td>
                            <td className={`px-5 py-3 text-sm font-extrabold tabular-nums ${(db.totalIn - db.totalOut) >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>{formatPrice(db.totalIn - db.totalOut)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )
              })()}

              {/* Sales Register */}
              {reportModal.type === 'sales' && (() => {
                const sd = reportModal.data as SalesData
                return (
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      {[
                        { label: 'Total Orders',   value: null, display: String(sd.totalOrders), color: 'text-slate-900' },
                        { label: 'Paid Revenue',   value: sd.totalRevenue,  color: 'text-emerald-600' },
                        { label: 'Average Order',  value: sd.totalOrders > 0 ? sd.totalRevenue / sd.totalOrders : 0, color: 'text-primary' },
                      ].map(s => (
                        <div key={s.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                          <p className={`font-heading font-extrabold text-xl mt-1 ${s.color}`}>{s.display ?? formatPrice(s.value!)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-900 text-white">
                            {['#', 'Date', 'Order ID', 'Customer', 'Phone', 'Items', 'Method', 'Subtotal', 'Delivery', 'Discount', 'Total', 'Status'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {sd.orders.length === 0 ? (
                            <tr><td colSpan={12} className="text-center py-10 text-slate-300 text-sm">No orders in this period</td></tr>
                          ) : sd.orders.map((o, i) => (
                            <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-4 py-3 text-xs text-slate-400">{i + 1}</td>
                              <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{o.date}</td>
                              <td className="px-4 py-3 text-[11px] font-mono text-slate-500">{o.id}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-800 whitespace-nowrap">{o.customer}</td>
                              <td className="px-4 py-3 text-sm text-slate-500">{o.phone}</td>
                              <td className="px-4 py-3 text-xs text-slate-600 max-w-[160px] truncate" title={o.items}>{o.items}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-md">{o.paymentMethod}</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700 tabular-nums">{formatPrice(o.subtotal)}</td>
                              <td className="px-4 py-3 text-sm text-slate-500 tabular-nums">{o.deliveryCharge > 0 ? formatPrice(o.deliveryCharge) : '—'}</td>
                              <td className="px-4 py-3 text-sm text-rose-500 tabular-nums">{o.discount > 0 ? `-${formatPrice(o.discount)}` : '—'}</td>
                              <td className="px-4 py-3 text-sm font-bold text-slate-900 tabular-nums">{formatPrice(o.total)}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${o.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                  {o.paymentStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-900">
                            <td colSpan={10} className="px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-right">Total Revenue (Paid)</td>
                            <td className="px-4 py-3 text-sm font-extrabold text-amber-400 tabular-nums">{formatPrice(sd.totalRevenue)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )
              })()}

              {/* Expense Ledger */}
              {reportModal.type === 'expense-ledger' && (() => {
                const ld = reportModal.data as LedgerData
                const total = ld.entries.reduce((s, e) => s + e.amount, 0)
                const byCat: Record<string, number> = {}
                for (const e of ld.entries) byCat[e.category] = (byCat[e.category] ?? 0) + e.amount
                return (
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                      {Object.entries(byCat).sort(([, a], [, b]) => b - a).slice(0, 3).map(([cat, amt]) => {
                        const meta = CAT_META[cat] ?? CAT_META.OTHER
                        return (
                          <div key={cat} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-md ${meta.bg} ${meta.text} mb-2`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${meta.color}`} />{cat}
                            </span>
                            <p className="font-heading font-extrabold text-lg text-slate-900">{formatPrice(amt)}</p>
                          </div>
                        )
                      })}
                      <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Expenses</p>
                        <p className="font-heading font-extrabold text-lg text-amber-400">{formatPrice(total)}</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-900 text-white">
                            {['#', 'Date', 'Category', 'Description', 'Paid To', 'Amount'].map(h => (
                              <th key={h} className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {ld.entries.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-10 text-slate-300 text-sm">No expenses in this period</td></tr>
                          ) : ld.entries.map((e, i) => {
                            const meta = CAT_META[e.category] ?? CAT_META.OTHER
                            return (
                              <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-5 py-3.5 text-xs text-slate-400">{i + 1}</td>
                                <td className="px-5 py-3.5 text-sm text-slate-600 whitespace-nowrap">{e.date.slice(0, 10)}</td>
                                <td className="px-5 py-3.5">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg ${meta.bg} ${meta.text}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${meta.color}`} />{e.category}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-sm text-slate-700">{e.description ?? <span className="text-slate-300">—</span>}</td>
                                <td className="px-5 py-3.5 text-sm text-slate-500">{e.paidTo ?? <span className="text-slate-300">—</span>}</td>
                                <td className="px-5 py-3.5 text-sm font-bold text-rose-600 tabular-nums">{formatPrice(e.amount)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-900">
                            <td colSpan={5} className="px-5 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-right">Total Expenses</td>
                            <td className="px-5 py-3 text-sm font-extrabold text-amber-400 tabular-nums">{formatPrice(total)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
