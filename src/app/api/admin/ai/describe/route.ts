import Anthropic                from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSetting }         from '@/lib/appSettings'

const enc = new TextEncoder()

const PROMPTS = {
  generate: (name: string, category: string, brand?: string) =>
    `You are a product copywriter for Balapasa, a Nepal-based ecommerce store selling electronics, gadgets, and beauty products.\n\nWrite a compelling, SEO-friendly product description for:\nProduct: ${name}\nCategory: ${category}${brand ? `\nBrand: ${brand}` : ''}\n\nRequirements:\n- 120-180 words\n- Professional and engaging tone suitable for Nepali customers\n- Highlight key features and benefits\n- End with a strong value proposition\n- Plain text only, no markdown or bullet points`,

  improve: (name: string, category: string, existing: string) =>
    `Improve this product description for "${name}" (${category}) to make it more compelling and SEO-friendly for a Nepal ecommerce store. Keep it under 180 words. Plain text only.\n\nOriginal:\n${existing}`,

  shorter: (_: string, __: string, existing: string) =>
    `Rewrite this product description in 60-80 words, keeping only the most compelling points. Plain text only.\n\n${existing}`,

  detailed: (name: string, _: string, existing: string) =>
    `Expand this product description for "${name}" to 200-250 words, adding more technical details, use cases, and benefits. Plain text only.\n\n${existing}`,
}

async function streamClaude(prompt: string, model: string): Promise<Response> {
  const key = await getSetting('ANTHROPIC_API_KEY')
  if (!key) throw new Error('Anthropic API key not configured. Add it in Admin → Settings → AI Configuration.')

  const client = new Anthropic({ apiKey: key })
  const stream = client.messages.stream({ model, max_tokens: 500, messages: [{ role: 'user', content: prompt }] })

  const readable = new ReadableStream({
    async start(ctrl) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          ctrl.enqueue(enc.encode(event.delta.text))
        }
      }
      ctrl.close()
    },
    cancel() { stream.abort() },
  })

  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Accel-Buffering': 'no' } })
}

async function streamGemini(prompt: string, model: string): Promise<Response> {
  const key = await getSetting('GEMINI_API_KEY')
  if (!key) throw new Error('Gemini API key not configured. Add it in Admin → Settings → AI Configuration.')

  const genAI  = new GoogleGenerativeAI(key)
  const gModel = genAI.getGenerativeModel({ model })

  let result
  try {
    result = await gModel.generateContentStream(prompt)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('quota')) {
      throw new Error(`Rate limit exceeded for ${model}. Try switching to "Flash 2.0" or wait a moment before retrying.`)
    }
    throw e
  }

  const readable = new ReadableStream({
    async start(ctrl) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) ctrl.enqueue(enc.encode(text))
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.includes('429') || msg.includes('quota')) {
          ctrl.enqueue(enc.encode(`\n\n[Rate limit hit — switch to "Flash 2.0" model or wait a moment]`))
        }
      }
      ctrl.close()
    },
  })

  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Accel-Buffering': 'no' } })
}

export async function POST(req: Request) {
  const { name, category, brand, existing, mode, provider, model } = await req.json() as {
    name: string; category: string; brand?: string; existing?: string
    mode?: 'generate' | 'improve' | 'shorter' | 'detailed'
    provider?: 'claude' | 'gemini'
    model?: string
  }

  const promptFn  = PROMPTS[mode ?? 'generate']
  const prompt    = promptFn(name, category, existing ?? brand ?? '')
  const prov      = provider ?? 'claude'

  try {
    if (prov === 'gemini') {
      return await streamGemini(prompt, model ?? 'gemini-2.5-flash')
    }
    return await streamClaude(prompt, model ?? 'claude-haiku-4-5-20251001')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI generation failed'
    return Response.json({ error: msg }, { status: 500 })
  }
}
