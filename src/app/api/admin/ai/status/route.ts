import { getSetting } from '@/lib/appSettings'
import { prisma }     from '@/lib/prisma'

function preview(key: string | null) {
  if (!key) return null
  if (key.length <= 8) return key.slice(0, 4) + '••••'
  return key.slice(0, 6) + '••••' + key.slice(-4)
}

export async function GET() {
  const [claudeKey, geminiKey] = await Promise.all([
    getSetting('ANTHROPIC_API_KEY'),
    getSetting('GEMINI_API_KEY'),
  ])

  // Check where each key is coming from
  let claudeSource = 'not_configured', geminiSource = 'not_configured'
  try {
    const rows = await prisma.appSetting.findMany({ where: { key: { in: ['ANTHROPIC_API_KEY', 'GEMINI_API_KEY'] } } })
    const dbKeys = new Set(rows.filter(r => r.value?.trim() && !r.value.startsWith('your-')).map(r => r.key))
    if (claudeKey) claudeSource = dbKeys.has('ANTHROPIC_API_KEY') ? 'database' : 'env_file'
    if (geminiKey) geminiSource = dbKeys.has('GEMINI_API_KEY')    ? 'database' : 'env_file'
  } catch { /* ignore */ }

  return Response.json({
    claude: { configured: !!claudeKey, source: claudeSource, preview: preview(claudeKey) },
    gemini: { configured: !!geminiKey, source: geminiSource, preview: preview(geminiKey) },
  })
}
