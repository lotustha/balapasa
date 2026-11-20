import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth'
import { DARAZ_JOBS, type DarazJob } from '@/lib/daraz-admin'
import { startJob } from './jobs'

export const dynamic = 'force-dynamic'

// "Sync now" on the admin Daraz page. Starts the job and returns at once; the page watches the
// run list for the result.
export async function POST(req: NextRequest) {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error

  const body = await req.json().catch(() => ({})) as { job?: string; applyHeld?: boolean }
  if (!body.job || !(body.job in DARAZ_JOBS)) return Response.json({ error: 'Unknown job' }, { status: 400 })
  const job = body.job as DarazJob

  const args = job === 'website' && body.applyHeld === true ? ['--apply-held'] : []
  if (!startJob(job, args)) return Response.json({ error: `${DARAZ_JOBS[job].label} is already running` }, { status: 409 })
  return Response.json({ started: true, job }, { status: 202 })
}
