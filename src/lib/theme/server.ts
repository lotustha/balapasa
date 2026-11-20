import 'server-only'
import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { parseThemeSetting, THEME_SETTING_KEY, type ThemeSetting } from './presets'

/** The saved theme: what shoppers see (`published`) and what the admin is editing (`draft`). */
export const getThemeSetting = cache(async (): Promise<ThemeSetting> => {
  try {
    const rows = await prisma.appSetting.findMany({ where: { key: { in: [THEME_SETTING_KEY, 'STORE_THEME'] } } })
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
    return parseThemeSetting(map[THEME_SETTING_KEY], map.STORE_THEME)
  } catch {
    return parseThemeSetting(null)
  }
})
