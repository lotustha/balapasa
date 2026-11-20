import { spawn } from 'node:child_process'
import path from 'node:path'
import { DARAZ_JOBS, type DarazJob } from '@/lib/daraz-admin'

// Jobs started from the admin page run as separate node processes, the same scripts cron runs.
// The set below only stops a second click from starting the same job twice in this server process.
const running = new Set<DarazJob>()

export const isJobRunning = (job: DarazJob) => running.has(job)

export function startJob(job: DarazJob, extraArgs: string[] = []): boolean {
  if (running.has(job)) return false
  const script = path.join(/* turbopackIgnore: true */ process.cwd(), 'scripts', 'daraz', DARAZ_JOBS[job].script)
  const child = spawn(process.execPath, [script, '--manual', ...extraArgs], {
    cwd: process.cwd(), stdio: 'ignore', windowsHide: true, env: process.env,
  })
  running.add(job)
  const done = () => running.delete(job)
  child.on('exit', done)
  child.on('error', done)
  return true
}
