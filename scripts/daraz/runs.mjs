// Records a run of a Daraz job in sync_runs, for the admin Daraz page. Never throws: a job must
// not fail because its log line could not be written (for example before the table exists).
import { createId } from '@paralleldrive/cuid2'

export const TRIGGER = process.argv.includes('--manual') ? 'manual' : 'schedule'

export async function recordRun(db, { job, status, changes = 0, summary = '', startedAt = new Date() }) {
  try {
    await db.query(
      `INSERT INTO sync_runs (id, job, status, trigger, changes, summary, started_at, finished_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,now())`,
      [createId(), job, status, TRIGGER, changes, String(summary).slice(0, 6000), startedAt])
    // Keep the table small: the page only ever shows recent runs.
    await db.query(`DELETE FROM sync_runs WHERE started_at < now() - interval '90 days'`)
  } catch (err) {
    console.error(`could not record the run: ${err.message}`)
  }
}
