import Anthropic             from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSetting }         from '@/lib/appSettings'

function buildPrompt(name: string, category: string, description?: string) {
  return `Suggest 6-8 relevant product tags/keywords for a Nepal ecommerce store.
Product: "${name}"
Category: ${category}${description ? `\nDescription: ${description.slice(0, 200)}` : ''}

Return ONLY a JSON array of short tag strings (1-3 words each). Example: ["wireless", "noise cancelling", "premium audio"]`
}

function parseTags(text: string): string[] {
  const match = text.match(/\[[\s\S]*?\]/)
  try { return match ? JSON.parse(match[0]) : [] } catch { return [] }
}

export async function POST(req: Request) {
  const { name, category, description, provider, model } = await req.json() as {
    name: string; category: string; description?: string
    provider?: 'claude' | 'gemini'; model?: string
  }

  const prompt = buildPrompt(name, category, description)
  const prov   = provider ?? 'claude'

  try {
    if (prov === 'gemini') {
      const key = await getSetting('GEMINI_API_KEY')
      if (!key) return Response.json({ error: 'Gemini API key not configured. Go to Admin → Settings → AI Configuration.' }, { status: 503 })

      const genAI  = new GoogleGenerativeAI(key)
      const gModel = genAI.getGenerativeModel({ model: model ?? 'gemini-2.5-flash' })
      let result
      try {
        result = await gModel.generateContent(prompt)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.includes('429') || msg.includes('quota')) {
          return Response.json({ error: `Rate limit exceeded. Switch to "Flash 2.0" or wait a moment.`, tags: [] }, { status: 429 })
        }
        throw e
      }
      const text = result.response.text()
      return Response.json({ tags: parseTags(text) })
    }

    // Claude
    const key = await getSetting('ANTHROPIC_API_KEY')
    if (!key) return Response.json({ error: 'Anthropic API key not configured. Go to Admin → Settings → AI Configuration.' }, { status: 503 })

    const client = new Anthropic({ apiKey: key })
    const msg    = await client.messages.create({
      model:    model ?? 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
    return Response.json({ tags: parseTags(text) })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI tag generation failed'
    return Response.json({ error: msg, tags: [] }, { status: 500 })
  }
}
