import type { CodeSystem, Concept, Project } from '../model/types.js'

/**
 * Concept search index.
 *
 * The hot path: this backs the CQL editor's `"` picker on every keystroke, so it runs
 * against a prebuilt index rather than scanning the dictionary. Target is under 20 ms at
 * 50 000 concepts, which imported SNOMED subsets reach
 * (feature/20260825-terminology.md §3).
 */

export interface ConceptMatch {
  concept: Concept
  /** Higher is better. Exact code beats exact display beats prefix beats substring. */
  score: number
  matchedOn: 'code' | 'display' | 'designation' | 'definition'
}

export interface SearchOptions {
  codeSystem?: string
  dataType?: string
  conceptType?: string
  limit?: number
}

interface Entry {
  concept: Concept
  code: string
  display: string
  designations: string[]
  definition: string
}

const SCORE = {
  exactCode: 1000,
  exactDisplay: 900,
  prefixCode: 800,
  prefixDisplay: 700,
  substringDisplay: 500,
  designation: 300,
  definition: 100,
} as const

export class ConceptIndex {
  private entries: Entry[] = []
  private byKey = new Map<string, Concept>()

  constructor(codeSystems: Record<string, CodeSystem> = {}) {
    this.rebuild(codeSystems)
  }

  static fromProject(project: Project): ConceptIndex {
    return new ConceptIndex(project.codeSystems)
  }

  rebuild(codeSystems: Record<string, CodeSystem>): void {
    this.entries = []
    this.byKey.clear()
    for (const cs of Object.values(codeSystems)) {
      for (const code of cs.conceptOrder) {
        const c = cs.concepts[code]
        if (c) this.add(c)
      }
    }
  }

  /** Incremental update — cheaper than a rebuild when one concept changes. */
  upsert(concept: Concept): void {
    const key = `${concept.system}|${concept.code}`
    const existing = this.entries.findIndex((e) => `${e.concept.system}|${e.concept.code}` === key)
    const entry = toEntry(concept)
    if (existing >= 0) this.entries[existing] = entry
    else this.entries.push(entry)
    this.byKey.set(key, concept)
  }

  remove(system: string, code: string): void {
    const key = `${system}|${code}`
    this.entries = this.entries.filter((e) => `${e.concept.system}|${e.concept.code}` !== key)
    this.byKey.delete(key)
  }

  private add(concept: Concept): void {
    this.entries.push(toEntry(concept))
    this.byKey.set(`${concept.system}|${concept.code}`, concept)
  }

  get size(): number {
    return this.entries.length
  }

  lookup(system: string, code: string): Concept | undefined {
    return this.byKey.get(`${system}|${code}`)
  }

  search(query: string, opts: SearchOptions = {}): ConceptMatch[] {
    const q = query.trim().toLowerCase()
    const limit = opts.limit ?? 25
    if (q === '') {
      return this.entries
        .filter((e) => passes(e, opts))
        .slice(0, limit)
        .map((e) => ({ concept: e.concept, score: 0, matchedOn: 'display' as const }))
    }

    const out: ConceptMatch[] = []
    for (const e of this.entries) {
      if (!passes(e, opts)) continue
      const m = scoreEntry(e, q)
      if (m) out.push({ concept: e.concept, ...m })
    }
    // Stable, deterministic ordering: score, then code, so results never reshuffle
    // between identical queries.
    out.sort((a, b) => b.score - a.score || a.concept.code.localeCompare(b.concept.code))
    return out.slice(0, limit)
  }
}

function toEntry(concept: Concept): Entry {
  return {
    concept,
    code: concept.code.toLowerCase(),
    display: (concept.display ?? '').toLowerCase(),
    designations: Object.values(concept.designations).map((d) => d.toLowerCase()),
    definition: (concept.definition ?? '').toLowerCase(),
  }
}

function passes(e: Entry, opts: SearchOptions): boolean {
  if (opts.codeSystem && e.concept.system !== opts.codeSystem) return false
  if (opts.dataType && e.concept.dataType !== opts.dataType) return false
  if (opts.conceptType && e.concept.conceptType !== opts.conceptType) return false
  return true
}

function scoreEntry(
  e: Entry,
  q: string,
): { score: number; matchedOn: ConceptMatch['matchedOn'] } | undefined {
  if (e.code === q) return { score: SCORE.exactCode, matchedOn: 'code' }
  if (e.display === q) return { score: SCORE.exactDisplay, matchedOn: 'display' }
  if (e.code.startsWith(q)) return { score: SCORE.prefixCode, matchedOn: 'code' }
  if (e.display.startsWith(q)) return { score: SCORE.prefixDisplay, matchedOn: 'display' }
  if (e.display.includes(q)) return { score: SCORE.substringDisplay, matchedOn: 'display' }
  if (e.code.includes(q)) return { score: SCORE.substringDisplay - 1, matchedOn: 'code' }
  if (e.designations.some((d) => d.includes(q)))
    return { score: SCORE.designation, matchedOn: 'designation' }
  if (e.definition.includes(q)) return { score: SCORE.definition, matchedOn: 'definition' }
  return undefined
}
