'use client'

import { useState, useEffect } from 'react'
import {
  ShieldCheck, Plus, Search, Mail, Phone, UserCog, Loader2, Crown, ShieldUser, Building2,
} from 'lucide-react'
import TeamMemberDialog, { type TeamMember } from '@/components/admin/TeamMemberDialog'

const ROLE_BADGE: Record<string, { label: string; cls: string; icon: typeof Crown }> = {
  ADMIN:   { label: 'Admin',   cls: 'bg-violet-100 text-violet-700',  icon: Crown      },
  MANAGER: { label: 'Manager', cls: 'bg-blue-100 text-blue-700',     icon: ShieldUser },
  STAFF:   { label: 'Staff',   cls: 'bg-slate-100 text-slate-700',   icon: UserCog    },
}

export default function TeamPage() {
  const [team,    setTeam]    = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  // Dialog state
  const [createOpen, setCreateOpen]   = useState(false)
  const [editTarget, setEditTarget]   = useState<TeamMember | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/admin/team')
      .then(r => r.json())
      .then(d => setTeam(d.team ?? []))
      .catch(() => setTeam([]))
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  const filtered = team.filter(m =>
    !search || [m.name, m.email, m.phone].some(v => v?.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900">Team</h1>
          <p className="text-slate-500 text-sm mt-0.5">{team.length} member{team.length !== 1 ? 's' : ''} with admin access</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/20 self-start"
        >
          <Plus size={15} /> Invite team member
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search team…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">{search ? 'No matches' : 'No team members yet'}</p>
            {!search && (
              <button onClick={() => setCreateOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-primary hover:bg-primary-bg rounded-xl transition-colors cursor-pointer">
                <Plus size={12} /> Invite the first member
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {filtered.map(m => {
              const badge = ROLE_BADGE[m.role] ?? ROLE_BADGE.STAFF
              const BadgeIcon = badge.icon
              return (
                <li key={m.id}>
                  <button
                    onClick={() => setEditTarget(m)}
                    className="w-full flex items-center gap-4 px-4 sm:px-6 py-4 hover:bg-slate-50/70 transition-colors cursor-pointer text-left"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-extrabold text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
                      {((m.name ?? m.email)[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800 text-sm truncate">{m.name ?? '—'}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>
                          <BadgeIcon size={10} /> {badge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-[11px] text-slate-500"><Mail size={10} /> {m.email}</span>
                        {m.phone && <span className="flex items-center gap-1 text-[11px] text-slate-500"><Phone size={10} /> {m.phone}</span>}
                      </div>
                    </div>
                    <ShieldCheck size={14} className="text-slate-300 group-hover:text-primary shrink-0" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Dialogs */}
      <TeamMemberDialog open={createOpen} onClose={() => { setCreateOpen(false); load() }} />
      <TeamMemberDialog
        open={!!editTarget}
        onClose={() => { setEditTarget(null); load() }}
        member={editTarget}
      />
    </div>
  )
}
