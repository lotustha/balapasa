import 'server-only'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSetting } from '@/lib/appSettings'

const DEFAULT_MODEL = 'gemini-2.5-flash'

async function getGemini(): Promise<GoogleGenerativeAI> {
  const key = await getSetting('GEMINI_API_KEY')
  if (!key) throw new Error('Gemini API key not configured. Add it in Admin → Settings → AI Configuration.')
  return new GoogleGenerativeAI(key)
}

async function generateText(prompt: string, model: string = DEFAULT_MODEL): Promise<string> {
  const genAI  = await getGemini()
  const gModel = genAI.getGenerativeModel({ model })
  try {
    const res  = await gModel.generateContent(prompt)
    return res.response.text().trim()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('429') || msg.includes('quota')) {
      throw new Error('Gemini rate limit hit. Wait a minute and retry, or switch model.')
    }
    throw e
  }
}

// ── Product description rewrite ──────────────────────────────────────────────

export interface ProductRewriteInput {
  name:         string
  category:     string
  brand?:       string | null
  tags?:        string[]
  existing?:    string   // raw manufacturer description
  priceLabel?:  string   // e.g. "NPR 4,500"
}

export async function generateProductDescription(input: ProductRewriteInput): Promise<string> {
  const prompt = `You are a product copywriter for Balapasa, a Nepal-based ecommerce store.

Rewrite the product description below to be UNIQUE (not copy-pasted from manufacturer), SEO-friendly, and persuasive for Nepali customers. Avoid duplicate-content penalties from Google.

Product: ${input.name}
Category: ${input.category}${input.brand ? `\nBrand: ${input.brand}` : ''}${input.tags?.length ? `\nTags: ${input.tags.join(', ')}` : ''}${input.priceLabel ? `\nPrice: ${input.priceLabel}` : ''}

Original (rewrite this — do not echo verbatim):
${input.existing?.trim() || '(no original description — write one from scratch)'}

Requirements:
- 100-180 words
- Lead with the customer benefit, then specs
- Mention Nepal / Kathmandu delivery context once if natural
- Plain text only — no markdown, no bullet points, no headings, no emoji
- Do not start with the product name verbatim
- Do not include the word "Balapasa"
- Output ONLY the description paragraph(s), nothing else`

  return generateText(prompt)
}

// ── Product FAQ ──────────────────────────────────────────────────────────────

export interface ProductFaqItem {
  q: string
  a: string
}

export async function generateProductFaq(input: ProductRewriteInput): Promise<ProductFaqItem[]> {
  const prompt = `Generate 4 unique, useful FAQ entries for the product below. These will appear on a Nepal ecommerce product page and be marked up with FAQPage JSON-LD for Google rich snippets.

Product: ${input.name}
Category: ${input.category}${input.brand ? `\nBrand: ${input.brand}` : ''}${input.tags?.length ? `\nTags: ${input.tags.join(', ')}` : ''}

Cover a mix of these topics — pick what's relevant:
- Specs / compatibility / what's in the box
- How to use / care / setup
- Delivery / return / warranty in Nepal context
- Comparison / use cases

Requirements:
- Exactly 4 entries
- Each question: 5-15 words, end with a question mark
- Each answer: 25-60 words, plain text, useful and specific (not generic)
- No markdown, no bullets, no emoji
- Avoid duplicate phrasing across entries

Return ONLY valid JSON in this exact shape, nothing else:
{"faqs":[{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."}]}`

  const raw = await generateText(prompt)
  // Strip code fences if model wraps in ```json ... ```
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  try {
    const parsed = JSON.parse(cleaned) as { faqs?: ProductFaqItem[] }
    const faqs = Array.isArray(parsed.faqs) ? parsed.faqs : []
    return faqs
      .filter(f => typeof f.q === 'string' && typeof f.a === 'string' && f.q.trim() && f.a.trim())
      .slice(0, 5)
  } catch {
    throw new Error('Gemini returned malformed FAQ JSON. Retry.')
  }
}

// ── Category SEO intro ───────────────────────────────────────────────────────

export interface CategoryIntroInput {
  name:           string
  productCount?:  number
  brandSample?:   string[]   // a few brand names in this category, if known
}

export async function generateCategoryIntro(input: CategoryIntroInput): Promise<string> {
  const prompt = `Write a short SEO landing-page intro for the "${input.name}" category on Balapasa, a Nepal-based ecommerce store.

${input.productCount ? `We have ${input.productCount} products in this category.` : ''}${input.brandSample?.length ? `\nFeatured brands: ${input.brandSample.join(', ')}.` : ''}

Requirements:
- 60-110 words
- Open with a benefit-led hook, not "Welcome to..."
- Include 2-3 relevant long-tail search phrases naturally (e.g. "best ${input.name.toLowerCase()} in Nepal", "buy ${input.name.toLowerCase()} online Kathmandu")
- Mention same-day delivery in Kathmandu once
- Plain text — no markdown, headings, or bullet points
- Do not include the word "welcome"
- Output ONLY the paragraph, nothing else`

  return generateText(prompt)
}
