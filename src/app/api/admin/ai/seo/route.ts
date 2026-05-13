import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSetting } from '@/lib/appSettings'

interface SeoSuggestion {
  title:       string
  description: string
  keywords:    string
}

function buildPrompt(args: {
  storeName: string
  storeUrl?: string
  niche?:    string
  region?:   string
  existing?: { title?: string; description?: string; keywords?: string }
}): string {
  const { storeName, storeUrl, niche, region, existing } = args
  const ex = existing && (existing.title || existing.description || existing.keywords)
    ? `\n\nExisting (improve if useful, otherwise replace):\nTitle: ${existing.title ?? '(none)'}\nDescription: ${existing.description ?? '(none)'}\nKeywords: ${existing.keywords ?? '(none)'}`
    : ''

  return `You are an SEO expert generating search-engine metadata for an online store.

Store: ${storeName}${storeUrl ? `\nURL: ${storeUrl}` : ''}${niche ? `\nNiche / what they sell: ${niche}` : ''}${region ? `\nPrimary region / country: ${region}` : ''}${ex}

Generate three fields for Google search results:

1. **title** — 50 to 60 characters. The clickable blue link Google shows. Must include the brand name. Compelling, click-worthy, no clickbait.
2. **description** — 140 to 160 characters. The gray tagline Google shows under the title. Sell the experience (fast delivery, authenticity, breadth of catalog). Active voice.
3. **keywords** — 5 to 8 comma-separated phrases real customers would type. Include brand name, region, primary product types. No quotes.

Return ONLY a JSON object with these three keys, no markdown fences, no commentary:
{"title": "...", "description": "...", "keywords": "..."}`
}

async function generateClaude(prompt: string, model: string): Promise<string> {
  const key = await getSetting('ANTHROPIC_API_KEY')
  if (!key) throw new Error('Anthropic API key not configured. Add it in Admin → Settings → AI Configuration.')
  const client = new Anthropic({ apiKey: key })
  const res = await client.messages.create({
    model,
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = res.content
    .map(b => (b.type === 'text' ? b.text : ''))
    .join('\n')
    .trim()
  return text
}

async function generateGemini(prompt: string, model: string): Promise<string> {
  const key = await getSetting('GEMINI_API_KEY')
  if (!key) throw new Error('Gemini API key not configured. Add it in Admin → Settings → AI Configuration.')
  const genAI  = new GoogleGenerativeAI(key)
  const gModel = genAI.getGenerativeModel({ model })
  const result = await gModel.generateContent(prompt)
  return result.response.text()
}

function parseSuggestion(raw: string): SeoSuggestion {
  // Models sometimes wrap JSON in ```json fences despite the instruction. Strip them.
  const stripped = raw.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  const obj = JSON.parse(stripped) as Partial<SeoSuggestion>
  if (typeof obj.title !== 'string' || typeof obj.description !== 'string' || typeof obj.keywords !== 'string') {
    throw new Error('AI returned malformed response')
  }
  return { title: obj.title.trim(), description: obj.description.trim(), keywords: obj.keywords.trim() }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      storeName?: string
      storeUrl?:  string
      niche?:     string
      region?:    string
      existing?:  { title?: string; description?: string; keywords?: string }
      provider?:  'claude' | 'gemini'
      model?:     string
    }

    const storeName = body.storeName?.trim()
    if (!storeName) {
      return Response.json({ error: 'Store name is required' }, { status: 400 })
    }

    const prompt = buildPrompt({
      storeName,
      storeUrl: body.storeUrl?.trim(),
      niche:    body.niche?.trim(),
      region:   body.region?.trim(),
      existing: body.existing,
    })

    const provider = body.provider ?? 'claude'
    const raw = provider === 'gemini'
      ? await generateGemini(prompt, body.model ?? 'gemini-2.5-flash')
      : await generateClaude(prompt, body.model ?? 'claude-haiku-4-5-20251001')

    const suggestion = parseSuggestion(raw)
    return Response.json({ suggestion })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI suggestion failed'
    return Response.json({ error: msg }, { status: 500 })
  }
}
