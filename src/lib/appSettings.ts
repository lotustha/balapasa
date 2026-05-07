import { prisma } from '@/lib/prisma'

/** Read a setting: DB first, then process.env fallback. Uses raw SQL so it works
 *  even if the Prisma generated client hasn't picked up the AppSetting model yet. */
export async function getSetting(key: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ value: string }[]>`
      SELECT value FROM app_settings WHERE key = ${key} LIMIT 1
    `
    const dbVal = rows[0]?.value?.trim() ?? ''
    if (dbVal && !dbVal.startsWith('your-') && !dbVal.startsWith('••')) return dbVal
  } catch (e) {
    console.warn('[getSetting] DB error for key', key, e instanceof Error ? e.message : e)
  }

  const envVal = (process.env[key] ?? '').trim()
  if (envVal && !envVal.startsWith('your-')) return envVal

  return null
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${key}, ${value}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
  `
}

export function clearSettingsCache() {}
