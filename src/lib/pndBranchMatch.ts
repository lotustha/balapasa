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
// district, municipality, ward, street, tole, landmark). Two tiers:
//
//   • Tier 1 (coverage-first): a branch that lists the customer's locality in
//     its area[] is the real delivering branch and must beat a hub that merely
//     shares the name. e.g. "Chapagaun" is in SATDOBATO's area[] (Rs 100), so
//     it wins over the same-named CHAPAGAUN hub (Rs 150) whose area[] covers the
//     deeper villages (Lele, Tikabhairab…). We require an EXACT area-token hit
//     so a weak substring on a district atom can't promote the wrong branch;
//     among covering branches the strongest area overlap wins.
//   • Tier 2 (name fallback): only when NO branch exactly covers any atom do we
//     fall back to the original name+area scoring — keeping legit hub-by-name
//     routing (deep-south address → CHAPAGAUN hub) intact.
//
// Atom-agnostic by design: district names ("lalitpur") don't appear in area[]
// lists (those hold localities), so feeding all atoms is harmless and lets the
// quote path and the dispatch path (flattened Order.address, where street/tole
// aren't separable) resolve to the same branch.
export function matchBranchForAddress<T extends PndBranchLite>(
  branches: T[],
  atoms: string[],
): { branch: T; score: number } | null {
  const needles = atoms.map(normPnd).filter(Boolean)
  if (needles.length === 0) return null

  let bestCoverage: { branch: T; score: number; area: number } | null = null
  let bestOverall:  { branch: T; score: number } | null = null

  for (const b of branches) {
    const bn = normPnd(b.branch_name)

    // Direct branch-name hit is the strongest name signal.
    let nameScore = 0
    for (const n of needles) {
      if (bn === n)                                nameScore += 10
      else if (bn.includes(n) && n.length >= 4)    nameScore += 4
      else if (n.includes(bn) && bn.length >= 4)   nameScore += 3
    }

    // Each individual area[] token can match an address atom.
    let areaScore = 0
    let areaExact = false
    const tokens = areaTokens(b.area ?? [])
    for (const t of tokens) {
      for (const n of needles) {
        if (t === n)                              { areaScore += 5; areaExact = true }
        else if (t.includes(n) && n.length >= 4)  areaScore += 2
        else if (n.includes(t) && t.length >= 4)  areaScore += 1
      }
    }

    const total = nameScore + areaScore

    // Tier 1 candidate: exact locality coverage. Rank covering branches by their
    // area overlap (not total) so a hub that also name-matches can't jump ahead.
    if (areaExact && (!bestCoverage || areaScore > bestCoverage.area)) {
      bestCoverage = { branch: b, score: total, area: areaScore }
    }
    if (total > 0 && (!bestOverall || total > bestOverall.score)) {
      bestOverall = { branch: b, score: total }
    }
  }

  return bestCoverage
    ? { branch: bestCoverage.branch, score: bestCoverage.score }
    : bestOverall
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
