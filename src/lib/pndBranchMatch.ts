// Client-safe matching helpers shared by the checkout combobox and the
// server-side resolver in src/lib/pickndrop.ts. Kept dependency-free so
// it can be imported in Client Components without dragging Prisma.

export interface PndBranchLite {
  branch_name: string
  branch_code?: string
  area: string[]
}

export function normPnd(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '')
}

// Returns the first branch whose name or any area[] entry matches the
// supplied city/area. Loose match: bidirectional substring after normalising.
export function matchBranchForArea<T extends PndBranchLite>(
  branches: T[],
  cityOrArea: string,
): T | null {
  if (!cityOrArea) return null
  const needle = normPnd(cityOrArea)
  if (!needle) return null

  for (const b of branches) {
    if (normPnd(b.branch_name) === needle) return b
  }
  for (const b of branches) {
    if (b.area.some(a => {
      const n = normPnd(a)
      return n === needle || n.includes(needle) || needle.includes(n)
    })) return b
  }
  return null
}

// Split a raw `area[]` string into normalised atoms. Branch area entries are
// human-typed (`"HASANDAHA ,SUNBARSI"`, `"SUNGA BAZAR ,BAKRAKHOLA BORDER..."`)
// so we tokenise on commas, ampersands, slashes, and whitespace runs of 2+
// to extract individual place names.
function areaTokens(area: string[]): string[] {
  const out: string[] = []
  for (const raw of area) {
    for (const piece of raw.split(/[,&/]|\s{2,}/g)) {
      const n = normPnd(piece.trim())
      if (n) out.push(n)
    }
  }
  return out
}

// Score a branch against a customer's full address (multiple atoms — province,
// district, municipality, ward, street, tole, landmark). The branch whose
// area[] tokens overlap the address atoms wins. Stronger matches (exact
// branch-name hit, exact area-token hit) score higher than substring matches.
export function matchBranchForAddress<T extends PndBranchLite>(
  branches: T[],
  atoms: string[],
): { branch: T; score: number } | null {
  const needles = atoms.map(normPnd).filter(Boolean)
  if (needles.length === 0) return null

  let best: { branch: T; score: number } | null = null

  for (const b of branches) {
    let score = 0
    const bn = normPnd(b.branch_name)

    // Direct branch-name hit is the strongest signal.
    for (const n of needles) {
      if (!n) continue
      if (bn === n)                                score += 10
      else if (bn.includes(n) && n.length >= 4)    score += 4
      else if (n.includes(bn) && bn.length >= 4)   score += 3
    }

    // Each individual area[] token can match an address atom.
    const tokens = areaTokens(b.area ?? [])
    for (const t of tokens) {
      for (const n of needles) {
        if (!n) continue
        if (t === n)                              score += 5
        else if (t.includes(n) && n.length >= 4)  score += 2
        else if (n.includes(t) && t.length >= 4)  score += 1
      }
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { branch: b, score }
    }
  }

  return best
}

// Score-based ranking for typeahead. Higher = better match.
// 100 = exact branch-name hit; 80 = exact area hit; 60 = area contains
// needle; 40 = needle contains area; 0 = no match.
export function rankBranches<T extends PndBranchLite>(
  branches: T[],
  query: string,
  limit = 8,
): T[] {
  if (!query.trim()) return branches.slice(0, limit)
  const needle = normPnd(query)
  const scored = branches.map(b => {
    let score = 0
    const bn = normPnd(b.branch_name)
    if (bn === needle) score = Math.max(score, 100)
    else if (bn.includes(needle)) score = Math.max(score, 70)
    else if (needle.includes(bn)) score = Math.max(score, 50)
    for (const a of b.area) {
      const n = normPnd(a)
      if (n === needle) score = Math.max(score, 80)
      else if (n.includes(needle)) score = Math.max(score, 60)
      else if (needle.includes(n)) score = Math.max(score, 40)
    }
    return { b, score }
  })
  return scored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.b)
}
